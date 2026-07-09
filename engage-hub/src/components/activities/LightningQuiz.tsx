import { useState, useEffect } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Timer, Zap, ArrowRight, RotateCcw, Trophy, Users, ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useQuizNavigation } from "@/contexts/QuizNavigationContext";

export default function LightningQuiz() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, loading: authLoading } = useAuth();
    const { setQuizActive, setQuizSubmitHandler } = useQuizNavigation();
    const [searchParams] = useSearchParams();
    const activityId = searchParams.get("id");
    const isViewOnly = searchParams.get("view_only") === "true";

    const [gameState, setGameState] = useState<"loading" | "lobby" | "playing" | "finished">("loading");
    const [questions, setQuestions] = useState<any[]>([]);
    const [currentQ, setCurrentQ] = useState(0);
    const [timeLeft, setTimeLeft] = useState(100);
    const [score, setScore] = useState(0);
    const [leaderboard, setLeaderboard] = useState<any[]>([]);
    const [totalParticipants, setTotalParticipants] = useState(0);
    const [totalQuestions, setTotalQuestions] = useState(0);
    const [userRank, setUserRank] = useState<number | null>(null);

    // Auth Check
    useEffect(() => {
        if (!authLoading && !user) {
            toast.error("Please login to play Daily Lightning");
            navigate("/login", { state: { from: location } });
        }
    }, [user, authLoading, navigate, location]);

    // Fetch Questions
    useEffect(() => {
        if (authLoading || !user) return; // Wait for auth

        if (!activityId) {
            toast.error("No activity ID provided");
            navigate("/fun-activities");
            return;
        }

        const fetchGame = async () => {
            try {
                // View Only Mode (for past activities)
                if (isViewOnly) {
                    const lbData = await api.getActivityLeaderboard(Number(activityId));
                    setLeaderboard(lbData.leaderboard);
                    setTotalParticipants(lbData.total_participants);
                    setGameState("finished");
                    return;
                }

                const data = await api.playActivity(Number(activityId));

                if (data.completed) {
                    setScore(data.score);
                    setUserRank(data.rank);
                    setTotalQuestions(data.total_questions || 0);

                    // Stale-while-revalidate: Load from cache first
                    const cacheKey = `lightning_lb_${activityId}`;
                    const cached = localStorage.getItem(cacheKey);
                    if (cached) {
                        try {
                            const parsed = JSON.parse(cached);
                            setLeaderboard(parsed.leaderboard);
                            setTotalParticipants(parsed.total_participants);
                        } catch (e) { console.error("Cache parse error", e); }
                    }

                    // Background fetch to update
                    api.getActivityLeaderboard(Number(activityId)).then(lbData => {
                        setLeaderboard(lbData.leaderboard);
                        setTotalParticipants(lbData.total_participants);
                        localStorage.setItem(cacheKey, JSON.stringify(lbData));
                    }).catch(err => console.error("LB fetch failed", err));

                    setGameState("finished");
                    setQuestions([]);
                    return;
                }

                setQuestions(data.questions.map((q: any) => {
                    const options = q.options || q.o || [];
                    let answer = q.correct_answer || q.answer;

                    // If answer is missing but we have an index 'a', resolve it from options
                    if (answer === undefined && q.a !== undefined && typeof q.a === 'number') {
                        answer = options[q.a];
                    }

                    return {
                        q: q.question_text || q.text || q.q,
                        o: options,
                        a: answer
                    };
                }));
                setGameState("lobby");
            } catch (error) {
                console.error("Failed to load game:", error);
                toast.error("Failed to load activity.");
                navigate("/fun-activities");
            }
        };
        fetchGame();
    }, [activityId, navigate, user, authLoading, isViewOnly]);

    // Game Timer Loop
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (gameState === "playing") {
            interval = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 0) {
                        handleAnswer(null); // Auto fail (null answer)
                        return 100;
                    }
                    return prev - 2; // Deplete fast (approx 2.5s per question)
                });
            }, 50);
        }
        return () => clearInterval(interval);
    }, [gameState, currentQ]);

    // Cleanup navigation lock on unmount
    useEffect(() => {
        return () => {
            setQuizActive(false);
            setQuizSubmitHandler(null);
        };
    }, []);

    const startGame = () => {
        setGameState("playing");
        setQuizActive(true);
        setQuizSubmitHandler(async () => {
            await finishGame();
        });
        setCurrentQ(0);
        setScore(0);
        setTimeLeft(100);
    };

    const handleAnswer = (selectedOption: string | null) => {
        const currentQuestionObj = questions[currentQ];

        // Check answer
        if (selectedOption !== null && selectedOption === currentQuestionObj.a) {
            setScore(s => s + 1);
            toast.success("Nice!", { duration: 500 });
        } else {
            toast.error("Missed!", { duration: 500 });
        }

        // Next Question
        if (currentQ < questions.length - 1) {
            setCurrentQ(c => c + 1);
            setTimeLeft(100);
        } else {
            finishGame();
        }
    };

    const finishGame = async () => {
        setQuizActive(false);
        setQuizSubmitHandler(null); // Clear handler so next nav doesn't trigger it
        setGameState("finished");
    };

    // Use effect to handle submission when game finishes to ensure score state is fresh
    useEffect(() => {
        if (gameState === "finished") {
            const submit = async () => {
                try {
                    const res = await api.submitActivityScore(Number(activityId), score);
                    setUserRank(res.rank);
                    const data = await api.getActivityLeaderboard(Number(activityId));
                    setLeaderboard(data.leaderboard);
                    setTotalParticipants(data.total_participants);
                    localStorage.setItem(`lightning_lb_${activityId}`, JSON.stringify(data));
                } catch (error) {
                    console.error("Submission failed", error);
                }
            }
            submit();
        }
    }, [gameState]); // Score needs to be stable here

    if (authLoading || gameState === "loading") {
        return <div className="flex items-center justify-center h-screen"><Loader2 className="w-8 h-8 animate-spin" /></div>;
    }

    if (gameState === "lobby") {
        return (
            <div className="flex flex-col items-center justify-center min-h-[80vh] pt-24 space-y-8 animate-in zoom-in duration-500">
                <div className="relative">
                    <div className="absolute inset-0 bg-blue-500 blur-3xl opacity-20 rounded-full"></div>
                    <Zap className="w-32 h-32 text-blue-500 relative z-10" />
                </div>
                <h1 className="text-5xl font-black tracking-tighter uppercase italic">Lightning Round</h1>
                <p className="text-xl text-muted-foreground text-center max-w-md">
                    {questions.length > 0 ? (
                        <>
                            {questions.length} Questions. <br />
                            Speed is everything. <br />
                            <span className="text-blue-500 font-bold">2.5 Seconds per question.</span>
                        </>
                    ) : (
                        <span className="text-red-500 font-bold">No questions available for this activity.</span>
                    )}
                </p>
                <Button
                    size="lg"
                    className="text-xl px-12 py-8 bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-blue-500/50 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={startGame}
                    disabled={questions.length === 0}
                >
                    Start The Clock <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
            </div>
        );
    }

    if (gameState === "finished") {
        // ... (previous finished state code) ...
        return (
            <div className="mt-10 container max-w-md mx-auto px-6 py-6 h-full flex flex-col items-center justify-center animate-in slide-in-from-bottom duration-500">
                <Card className="w-full max-w-2xl bg-card/80 backdrop-blur-sm border-2 border-primary/20">
                    <CardHeader className="text-center">
                        <h2 className="text-4xl font-bold">Time's Up!</h2>
                        <div className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-tr from-blue-600 to-indigo-600 my-4">
                            {score}/{totalQuestions || questions.length}
                        </div>
                        <p className="text-muted-foreground text-lg">
                            {score > questions.length * 0.8 ? "Godlike Speed! ⚡" : score > questions.length * 0.5 ? "Not bad!" : "Too slow! 🐢"}
                        </p>
                    </CardHeader>
                    <div className="px-8 pb-8 space-y-6">
                        {userRank && <div className="text-center text-lg text-muted-foreground">Daily Rank: #{userRank}</div>}

                        <div className="bg-muted/30 rounded-lg p-4">
                            <h3 className="font-semibold mb-3 flex items-center justify-between">
                                <span className="flex items-center gap-2"><Users className="w-4 h-4" /> Daily Leaderboard</span>
                                <span className="text-xs text-muted-foreground">{totalParticipants} Participants Today</span>
                            </h3>
                            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                                {leaderboard.map((entry, idx) => {
                                    const isCurrentUser = entry.email === user?.email || entry.username === user?.username || entry.username === user?.email;
                                    const maskedEmail = entry.email ? `${entry.email.substring(0, 3)}...@${entry.email.split('@')[1] || ''}` : '';

                                    return (
                                        <div key={idx} className={`flex justify-between items-center p-3 rounded-lg border ${isCurrentUser ? "bg-primary/10 border-primary/30" : "bg-card border-border/50"}`}>
                                            <div className="flex items-center gap-3 min-w-0 flex-1 mr-4">
                                                <span className={`font-mono font-bold w-8 text-center flex-shrink-0 ${idx < 3 ? "text-primary" : "text-muted-foreground"}`}>#{idx + 1}</span>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold truncate text-foreground">{entry.full_name || entry.username}</span>
                                                        {isCurrentUser && <span className="text-xs font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full flex-shrink-0">(You)</span>}
                                                    </div>
                                                    {entry.email && (
                                                        <div className="text-xs text-muted-foreground truncate">{maskedEmail}</div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="font-bold text-lg flex-shrink-0 bg-muted/50 px-3 py-1 rounded-md">{entry.score}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <Button className="w-full" onClick={() => navigate("/fun-activities")}>
                                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Activities
                            </Button>
                        </div>
                    </div>
                </Card>
            </div>
        );
    }

    const currentQData = questions[currentQ];

    if (!currentQData) {
        return <div className="flex items-center justify-center h-screen">Error: Question data missing. <Button onClick={() => navigate('/fun-activities')} variant="link">Go Back</Button></div>;
    }

    return (
        <div className="max-w-xl mx-auto pt-28 pb-8 px-6 h-full flex flex-col justify-center">
            <div className="flex justify-between items-end mb-4">
                <span className="text-3xl font-bold italic">Q{currentQ + 1}</span>
                <span className="text-xl font-mono text-blue-500">{score} pts</span>
            </div>

            {/* Timer Bar */}
            <Progress value={timeLeft} className={`h-4 mb-8 transition-all ${timeLeft < 30 ? "bg-red-100 [&>*]:bg-red-500" : "bg-blue-100 [&>*]:bg-blue-500"}`} />

            <Card className="p-6 mb-6 text-center border-2 border-primary/10 shadow-xl">
                <h3 className="text-3xl font-bold leading-tight">{currentQData.q}</h3>
            </Card>

            <div className="grid grid-cols-2 gap-4">
                {currentQData.o.map((opt: string, idx: number) => (
                    <Button
                        key={idx}
                        onClick={() => handleAnswer(opt)}
                        variant="outline"
                        className="h-24 text-2xl font-semibold hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 active:scale-95 transition-all text-wrap"
                    >
                        {opt}
                    </Button>
                ))}
            </div>
        </div>
    );
}
