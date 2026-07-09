import { useState, useEffect } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, HelpCircle, ArrowRight, Users, Trophy, ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useQuizNavigation } from "@/contexts/QuizNavigationContext";

export default function TwoTruthsOneLie() {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const { user, loading: authLoading } = useAuth();
    const { setQuizActive, setQuizSubmitHandler } = useQuizNavigation();
    const activityId = searchParams.get("id");
    const isViewOnly = searchParams.get("view_only") === "true";

    const [gameState, setGameState] = useState<"loading" | "countdown" | "playing" | "finished">("loading");
    const [rounds, setRounds] = useState<any[]>([]);
    const [currentRound, setCurrentRound] = useState(0);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [isRevealed, setIsRevealed] = useState(false);
    const [score, setScore] = useState(0);
    const [leaderboard, setLeaderboard] = useState<any[]>([]);
    const [userRank, setUserRank] = useState<number | null>(null);
    const [totalParticipants, setTotalParticipants] = useState(0);
    const [totalQuestions, setTotalQuestions] = useState(0);
    const [countdown, setCountdown] = useState(3);

    // Auth Check
    useEffect(() => {
        if (!authLoading && !user) {
            toast.error("Please login to play Two Truths");
            navigate("/login", { state: { from: location } });
        }
    }, [user, authLoading, navigate, location]);

    // Cleanup navigation lock on unmount
    useEffect(() => {
        return () => {
            setQuizActive(false);
            setQuizSubmitHandler(null);
        };
    }, []);

    // Countdown Timer
    useEffect(() => {
        if (gameState === "countdown") {
            setQuizActive(true);
            setQuizSubmitHandler(async () => {
                await finishGame();
            });
            if (countdown > 0) {
                const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
                return () => clearTimeout(timer);
            } else {
                setGameState("playing");
            }
        }
    }, [gameState, countdown]);

    // Fetch Game Data
    useEffect(() => {
        if (authLoading || !user) return;

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
                    const cacheKey = `twotruths_lb_${activityId}`;
                    const cached = localStorage.getItem(cacheKey);
                    if (cached) {
                        try {
                            const parsed = JSON.parse(cached);
                            setLeaderboard(parsed.leaderboard);
                            setTotalParticipants(parsed.total_participants || 0);
                        } catch (e) { console.error("Cache parse error", e); }
                    }

                    // Background fetch to update
                    api.getActivityLeaderboard(Number(activityId)).then(lbData => {
                        setLeaderboard(lbData.leaderboard);
                        setTotalParticipants(lbData.total_participants);
                        localStorage.setItem(cacheKey, JSON.stringify(lbData));
                    }).catch(err => console.error("LB fetch failed", err));

                    setGameState("finished");
                    return;
                }

                setRounds(data.questions.map((q: any, idx: number) => ({
                    id: idx,
                    topic: q.question_text,
                    options: q.options.map((opt: any, optIdx: number) => {
                        const text = typeof opt === 'string' ? opt : (opt.text || opt.content || String(opt));
                        return {
                            id: optIdx,
                            text: text,
                            isLie: q.correct_answer === text,
                            explanation: "This statement is the lie."
                        };
                    })
                })));
                setGameState("countdown");
            } catch (error) {
                console.error("Failed to load game:", error);
                toast.error("Failed to load activity.");
                navigate("/fun-activities");
            }
        };
        fetchGame();
    }, [activityId, navigate, user, authLoading, isViewOnly]);

    const handleSelect = (id: number) => {
        if (isRevealed) return;
        setSelectedId(id);
        setIsRevealed(true);

        const currentRoundData = rounds[currentRound];
        const selected = currentRoundData.options.find((o: any) => o.id === id);

        if (selected?.isLie) {
            setScore(s => s + 1);
            toast.success("You found the lie!", { icon: <CheckCircle className="text-green-500" /> });
        } else {
            toast.error("That was actually true!", { icon: <XCircle className="text-red-500" /> });
        }
    };

    const nextRound = () => {
        if (currentRound < rounds.length - 1) {
            setCurrentRound(c => c + 1);
            setSelectedId(null);
            setIsRevealed(false);
        } else {
            finishGame();
        }
    };

    const finishGame = async () => {
        setQuizActive(false);
        setQuizSubmitHandler(null);
        setGameState("finished");
        try {
            const res = await api.submitActivityScore(Number(activityId), score);
            setUserRank(res.rank);
            const data = await api.getActivityLeaderboard(Number(activityId));
            setLeaderboard(data.leaderboard);
            setTotalParticipants(data.total_participants);

            // Update cache
            localStorage.setItem(`twotruths_lb_${activityId}`, JSON.stringify(data));
        } catch (error) {
            console.error("Submission failed", error);
        }
    };

    const getOptionStyle = (opt: any) => {
        if (!isRevealed) return "hover:border-primary cursor-pointer hover:bg-muted/50";
        if (opt.isLie) return "border-green-500 bg-green-500/10 text-green-700 dark:text-green-400";
        if (selectedId === opt.id && !opt.isLie) return "border-red-500 bg-red-500/10 text-red-700 dark:text-red-400 opacity-50";
        return "opacity-50";
    };

    if (authLoading || gameState === "loading") {
        return <div className="flex items-center justify-center h-screen"><Loader2 className="w-8 h-8 animate-spin" /></div>;
    }

    if (gameState === "finished") {
        return (
            <div className="mt-12 container max-w-md mx-auto px-6 py-6 h-full flex flex-col items-center justify-center animate-in slide-in-from-bottom duration-500">
                <Card className="w-full max-w-2xl bg-card/80 backdrop-blur-sm border-2 border-primary/20">
                    <CardHeader className="text-center">
                        <Trophy className="w-20 h-20 mx-auto text-yellow-500 mb-4 animate-bounce" />
                        <h2 className="text-3xl font-bold">Truth Detection Complete!</h2>
                        <div className="text-5xl font-black my-4 text-primary">{score}/{totalQuestions || rounds.length} Correct</div>
                        <p className="text-muted-foreground">{score === (totalQuestions || rounds.length) ? "Perfect Score! Nothing gets past you." : "Good game!"}</p>
                    </CardHeader>

                    <div className="px-8 pb-8 space-y-6">
                        {userRank && <div className="text-center text-lg text-muted-foreground">Daily Rank: #{userRank}</div>}

                        <div className="bg-muted/30 rounded-lg p-4">
                            <h3 className="font-semibold mb-3 flex items-center justify-between">
                                <span className="flex items-center gap-2"><Users className="w-4 h-4" /> Daily Leaderboard</span>
                                <span className="text-xs text-muted-foreground">{totalParticipants} Participants</span>
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

    if (gameState === "countdown") {
        return (
            <div className="flex flex-col items-center justify-center h-[80vh] animate-in zoom-in duration-500">
                <div className="relative">
                    <div className="absolute inset-0 bg-purple-500 blur-3xl opacity-20 rounded-full animate-pulse"></div>
                    <div className="text-9xl font-black text-transparent bg-clip-text bg-gradient-to-br from-purple-600 to-pink-500 relative z-10 font-mono">
                        {countdown}
                    </div>
                </div>
                <div className="text-xl font-bold text-muted-foreground mt-8 uppercase tracking-[0.2em] animate-bounce">
                    Get Ready...
                </div>
            </div>
        );
    }

    const currentRoundData = rounds[currentRound];

    // Safety check
    if (!currentRoundData) return <div className="text-center pt-32">No questions data.</div>;

    return (
        <div className="container max-w-3xl mx-auto py-12 px-6 flex flex-col items-center min-h-[calc(100vh-80px)] justify-center">

            <div className="text-center mb-8 space-y-2">
                <Badge variant="outline" className="text-lg px-4 py-1 border-primary text-primary mb-4">Round {currentRound + 1} • {currentRoundData.topic}</Badge>
                <h1 className="text-3xl font-extrabold tracking-tight">Two Truths & One Lie</h1>
                <p className="text-muted-foreground text-lg">Spot the lie to win.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full mb-8">
                {currentRoundData.options.map((opt: any) => (
                    <Card
                        key={opt.id}
                        className={`
                    items-center justify-center p-4 min-h-[160px] flex flex-col
                    transition-all duration-300 border-2 select-none cursor-pointer
                    ${getOptionStyle(opt)}
                    ${selectedId === opt.id ? "ring-2 ring-offset-2 ring-primary" : ""}
                `}
                        onClick={() => handleSelect(opt.id)}
                    >
                        <HelpCircle className={`w-8 h-8 mb-4 ${isRevealed ? "opacity-20" : "text-primary opacity-80"}`} />
                        <p className="text-lg font-medium leading-relaxed text-center">{opt.text}</p>

                        {isRevealed && opt.isLie && (
                            <div className="mt-2 bg-green-500 text-white px-2 py-0.5 rounded-full text-[10px] font-bold animate-in zoom-in">
                                THE LIE
                            </div>
                        )}
                    </Card>
                ))}
            </div>

            {isRevealed && (
                <div className="max-w-2xl w-full bg-card border rounded-xl p-6 shadow-xl animate-in fade-in slide-in-from-bottom-5">
                    <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                        Result <div className="h-px bg-border flex-1 ml-4" />
                    </h3>
                    <p className="text-lg text-muted-foreground mb-6">
                        {selectedId !== null && rounds[currentRound].options.find((o: any) => o.id === selectedId)?.isLie
                            ? "Correct! You caught the bluff."
                            : "Oops! That was actually true."}
                    </p>
                    <div className="flex justify-end">
                        <Button onClick={nextRound} size="lg" className="gap-2">
                            {currentRound < rounds.length - 1 ? "Next Round" : "Finish Game"}
                            <ArrowRight className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
