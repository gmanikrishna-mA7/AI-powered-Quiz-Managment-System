import { useState, useEffect } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Shuffle, Timer, Check, X, Trophy, Users, ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useQuizNavigation } from "@/contexts/QuizNavigationContext";

export default function ScrambledWordsLive() {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const { user, loading: authLoading } = useAuth();
    const { setQuizActive, setQuizSubmitHandler } = useQuizNavigation();
    const activityId = searchParams.get("id");
    const isViewOnly = searchParams.get("view_only") === "true";

    const [gameState, setGameState] = useState<"loading" | "countdown" | "playing" | "result" | "finished">("loading");
    const [words, setWords] = useState<any[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [scrambled, setScrambled] = useState("");
    const [input, setInput] = useState("");
    const [timeLeft, setTimeLeft] = useState(30);
    const [countdown, setCountdown] = useState(5);
    const [score, setScore] = useState(0);
    const [leaderboard, setLeaderboard] = useState<any[]>([]);
    const [userRank, setUserRank] = useState<number | null>(null);
    const [totalParticipants, setTotalParticipants] = useState(0);
    const [totalQuestions, setTotalQuestions] = useState(0);

    // Auth Check
    useEffect(() => {
        if (!authLoading && !user) {
            toast.error("Please login to play Daily Scramble");
            navigate("/login", { state: { from: location } });
        }
    }, [user, authLoading, navigate, location]);

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

                    // ... cache logic
                    const cacheKey = `scramble_lb_${activityId}`;
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

                // ... normal game setup
                setWords(data.questions.map((q: any) => ({
                    // Fix: Check q.word first as that's what the scramble generator returns
                    word: q.word || q.correct_answer || q.question_text,
                    hint: q.hint || (q.options && q.options.length > 0 ? q.options[0] : "Unscramble this word!")
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

    useEffect(() => {
        if (words.length > 0 && currentIndex < words.length) {
            scrambleWord(words[currentIndex].word);
        }
    }, [currentIndex, words]);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (gameState === "playing" && timeLeft > 0) {
            interval = setInterval(() => setTimeLeft(t => t - 1), 1000);
        } else if (timeLeft === 0 && gameState === "playing") {
            handleTimeOut();
        }
        return () => clearInterval(interval);
    }, [timeLeft, gameState]);

    const scrambleWord = (word: string) => {
        if (!word) return;
        const arr = word.split("");
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        const result = arr.join("");
        if (result === word && word.length > 1) scrambleWord(word);
        else setScrambled(result);
    };

    const handleTimeOut = () => {
        setGameState("result");
        toast.error(`Time up! The word was ${words[currentIndex].word}`);
    };

    const checkAnswer = () => {
        if (input.toUpperCase().trim() === words[currentIndex].word.toUpperCase()) {
            const points = Math.ceil(timeLeft / 2) + 10;
            setScore(s => s + points);
            toast.success(`Correct! +${points} pts`, { icon: <Check className="text-green-500" /> });
            setGameState("result");
        } else {
            toast.error("Incorrect, try again!", { icon: <X className="text-red-500" /> });
            setInput("");
        }
    };

    const nextWord = () => {
        if (currentIndex < words.length - 1) {
            setCurrentIndex(c => c + 1);
            setInput("");
            setTimeLeft(30);
            setGameState("playing");
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
            localStorage.setItem(`scramble_lb_${activityId}`, JSON.stringify(data));
        } catch (error) {
            console.error("Submission failed", error);
        }
    };

    if (authLoading || gameState === "loading") {
        return <div className="flex items-center justify-center h-screen"><Loader2 className="w-8 h-8 animate-spin" /></div>;
    }

    if (gameState === "finished") {
        return (
            <div className="mt-14 container max-w-md mx-auto px-6 py-6 h-full flex flex-col items-center justify-center animate-in slide-in-from-bottom duration-500">
                <Card className="w-full max-w-2xl bg-card/80 backdrop-blur-sm border-2 border-primary/20">
                    <CardHeader className="text-center">
                        <h2 className="text-4xl font-bold bg-gradient-to-r from-green-400 to-blue-500 text-transparent bg-clip-text">Spectacular!</h2>
                        <div className="text-6xl font-black my-4">{score} Points</div>
                        <p className="text-muted-foreground">You unscrambled the words!</p>
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

    const currentWordObj = words[currentIndex];

    // Safety check just in case
    if (!currentWordObj) return <div className="text-center pt-32">No questions data.</div>;

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

    return (
        <div className="container max-w-xl mx-auto mt-14 py-8 px-6">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2 text-xl font-mono font-bold">
                    <Timer className={timeLeft < 10 ? "text-red-500 animate-pulse" : "text-primary"} />
                    <span className={timeLeft < 10 ? "text-red-500" : ""}>{timeLeft}s</span>
                </div>
                <div className="text-xl font-bold text-green-600">Score: {score}</div>
            </div>

            <Progress value={(currentIndex / words.length) * 100} className="mb-8" />

            <Card className="border-2 shadow-xl overflow-hidden">
                <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-2" />
                <CardHeader className="text-center pb-2">
                    <span className="text-sm text-muted-foreground uppercase tracking-widest">{currentWordObj.hint}</span>
                </CardHeader>
                <CardContent className="flex flex-col items-center">
                    <div className="text-5xl md:text-6xl font-black tracking-[0.2em] text-center my-8 break-all font-mono text-purple-600 dark:text-purple-400 animate-in zoom-in duration-300">
                        {gameState === "result" ? currentWordObj.word : scrambled}
                    </div>

                    {gameState === "playing" ? (
                        <div className="flex gap-2 w-full max-w-sm">
                            <Input
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Type answer..."
                                className="text-center text-lg uppercase font-bold"
                                onKeyDown={(e) => e.key === "Enter" && checkAnswer()}
                                autoFocus
                            />
                            <Button onClick={checkAnswer}>
                                <Check />
                            </Button>
                        </div>
                    ) : (
                        <div className="animate-in slide-in-from-bottom duration-300 w-full">
                            <p className="text-center text-green-600 font-bold mb-4 text-lg">
                                {input.toUpperCase() === currentWordObj.word ? "Correct!" : "Time's Up!"}
                            </p>
                            <Button onClick={nextWord} size="lg" className="w-full">
                                {currentIndex < words.length - 1 ? "Next Word" : "Finish"}
                            </Button>
                        </div>
                    )}
                </CardContent>
                <CardFooter className="justify-center py-4 bg-muted/30">
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <Shuffle className="w-3 h-3" /> Word {currentIndex + 1} of {words.length}
                    </div>
                </CardFooter>
            </Card>
        </div>
    );
}
