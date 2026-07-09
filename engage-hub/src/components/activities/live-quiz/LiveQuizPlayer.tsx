import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, CheckCircle, XCircle, Trophy, Play, Clock, AlertCircle, Users, Copy } from "lucide-react";
import { api, getWebSocketUrl } from "@/lib/api";
import { toast } from "sonner";
import LiveQuizLeaderboard from "./LiveQuizLeaderboard";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuizNavigation } from "@/contexts/QuizNavigationContext";

export default function LiveQuizPlayer() {
    const { code } = useParams<{ code: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { setQuizActive, setQuizSubmitHandler } = useQuizNavigation();

    // Cleanup navigation lock on unmount
    useEffect(() => {
        return () => {
            setQuizActive(false);
            setQuizSubmitHandler(null);
        };
    }, []);

    const [status, setStatus] = useState<"lobby" | "active" | "finished">("lobby");
    const [timer, setTimer] = useState(0);
    const [selected, setSelected] = useState<number | null>(null);
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
    const [currentQuestion, setCurrentQuestion] = useState<any>(null);
    const [currentQIndex, setCurrentQIndex] = useState(0);
    const [totalQuestions, setTotalQuestions] = useState(5);
    const [players, setPlayers] = useState<any[]>([]);
    const [myScore, setMyScore] = useState(0);
    const [intermissionMessage, setIntermissionMessage] = useState<string | null>(null);
    const [isCalculating, setIsCalculating] = useState(false);

    const ws = useRef<WebSocket | null>(null);

    // Derive Host Status
    const isHost = players.find(p => p.username === user?.username)?.is_host || false;

    // Connect to WebSocket
    useEffect(() => {
        if (!code) {
            navigate('/fun-activities/live-host');
            return;
        }

        const url = getWebSocketUrl(`ws/quiz/${code}/`);
        ws.current = new WebSocket(url);

        ws.current.onopen = () => {
            console.log("Connected to WS");
        };

        ws.current.onmessage = (event) => {
            const data = JSON.parse(event.data);

            if (data.type === 'player_update') {
                setPlayers(data.players);
            } else if (data.type === 'game_start') {
                setStatus("active");
                setQuizActive(true);
                // For live quiz, submitting usually just means leaving, so checking out
                setQuizSubmitHandler(async () => {
                    // For Live quiz we don't 'save' on exit, we just disconnect.
                    // The Alert Dialog will ask "submit & leave" - we can interpret this as "leave".
                    navigate('/fun-activities/live-host');
                });
                setIntermissionMessage("Game Starting...");
            } else if (data.type === 'new_question') {
                setStatus("active");
                setIsCalculating(false);
                setCurrentQuestion(data.question);
                setCurrentQIndex(data.current_index);
                setTotalQuestions(data.total_questions || 5);
                setTimer(data.timer);
                setSelected(null);
                setIsCorrect(null);
                setIntermissionMessage(null); // Clear intermission
            } else if (data.type === 'intermission') {
                setIntermissionMessage(data.message || "Next question coming up...");
                setTimer(data.timer);
            } else if (data.type === 'game_over') {
                setQuizActive(false);
                setQuizSubmitHandler(null);
                setStatus("finished");
                setIsCalculating(false);
                setPlayers(data.leaderboard);
                if (data.reason) toast.info(data.reason);
            }
        };

        ws.current.onclose = () => {
            console.log("WS Closed");
        };

        return () => {
            if (ws.current) ws.current.close();
        };
    }, [code, navigate]);

    // Prevent accidental refresh/leave
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (status === "active") {
                e.preventDefault();
                e.returnValue = ""; // Standard for Chrome
                return ""; // Standard for other browsers
            }
        };

        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [status]);

    // Timer (Local countdown for UI smoothness)
    useEffect(() => {
        let t: NodeJS.Timeout;
        if (timer > 0) {
            t = setInterval(() => setTimer(s => s - 1), 1000);
        }
        return () => clearInterval(t);
    }, [timer]);

    const startGame = () => {
        if (ws.current && isHost) {
            ws.current.send(JSON.stringify({ action: 'start_game' }));
        }
    };

    const handleAnswer = (option: string, idx: number) => {
        if (selected !== null) return; // Already answered
        if (intermissionMessage) return; // Can't answer during intermission

        setSelected(idx);

        if (!currentQuestion) return;

        const correct = option === currentQuestion.answer;
        setIsCorrect(correct);

        if (correct) {
            const points = Math.ceil(timer * 10) + 50; // Points based on speed
            setMyScore(s => s + points);
            toast.success(`Correct! +${points} pts`);

            // Sync to backend via WS
            if (ws.current) {
                ws.current.send(JSON.stringify({
                    action: 'submit_answer',
                    score_delta: points
                }));
            }
        } else {
            toast.error("Wrong answer!");
        }

        // Check if last question answered
        if (currentQIndex === totalQuestions) {
            setIsCalculating(true);
        }
    };

    const onExit = () => {
        navigate('/fun-activities/live-host');
    };

    if (status === "lobby") {
        return (
            <div className="pt-24 flex flex-col items-center justify-center min-h-[60vh] text-center px-4 animate-in fade-in zoom-in duration-500">
                <Loader2 className="w-16 h-16 text-primary animate-spin mb-6" />
                <h2 className="text-3xl font-bold">Lobby</h2>
                <div
                    className="mt-4 bg-muted px-8 py-4 rounded-xl border-2 border-dashed border-primary/30 mb-8 cursor-pointer hover:bg-primary/5 transition-colors group relative"
                    onClick={() => {
                        navigator.clipboard.writeText(code || "");
                        toast.success("Code copied to clipboard!");
                    }}
                    title="Click to copy"
                >
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">Game Code</span>
                    <div className="flex items-center justify-center gap-3">
                        <span className="text-6xl font-mono font-black tracking-widest text-primary">{code}</span>
                        <Copy className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors opacity-50 group-hover:opacity-100" />
                    </div>
                </div>

                <div className="w-full max-w-md bg-card border rounded-xl p-4 mb-8">
                    <h3 className="font-bold mb-4 flex items-center justify-center gap-2"><Users className="w-4 h-4" /> Players ({players.length})</h3>
                    <div className="flex flex-wrap gap-2 justify-center">
                        {players.map((p, i) => (
                            <div key={i} className="bg-primary/10 text-primary border border-primary/20 px-3 py-1 rounded-full text-sm font-bold animate-in fade-in slide-in-from-bottom-2" style={{ animationDelay: `${i * 100}ms` }}>
                                {p.name} {p.is_host && "👑"}
                            </div>
                        ))}
                    </div>
                </div>

                {isHost ? (
                    <Button size="lg" className="w-64 text-xl h-14 shadow-xl hover:scale-105 transition-transform" onClick={startGame}>
                        Start Quiz <Play className="ml-2 w-6 h-6" />
                    </Button>
                ) : (
                    <p className="text-xl text-muted-foreground mt-2 animate-pulse">Waiting for host to start...</p>
                )}

                <Button variant="ghost" className="mt-8 hover:bg-destructive/10 hover:text-destructive" onClick={onExit}>Leave Game</Button>
            </div>
        );
    }

    if (status === "active") {
        if (isCalculating) {
            return (
                <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 animate-in fade-in pt-24">
                    <Loader2 className="w-16 h-16 text-primary animate-spin mb-6" />
                    <h2 className="text-3xl font-bold">Calculating Results...</h2>
                    <p className="text-muted-foreground mt-2">Waiting for other players to finish.</p>
                </div>
            )
        }

        // Intermission Screen
        if (intermissionMessage) {
            return (
                <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 animate-in zoom-in pt-24">
                    <Clock className="w-24 h-24 text-primary mb-6 animate-pulse" />
                    <h2 className="text-4xl font-black mb-4">{intermissionMessage}</h2>
                    <div className="text-6xl font-black text-primary tabular-nums">{timer}</div>
                </div>
            )
        }

        // If waiting for start or next question (fallback)
        if (!currentQuestion) {
            return <div className="text-center p-20 flex flex-col items-center pt-24"><Loader2 className="animate-spin mb-4" /> Loading Question...</div>;
        }

        return (
            <div className="container max-w-2xl mx-auto py-8 px-4 h-full flex flex-col pt-24">
                <div className="flex justify-between items-center mb-8 bg-card p-4 rounded-xl shadow-sm border">
                    <div className="font-bold text-lg">Q{currentQIndex} / {totalQuestions}</div>
                    <div className={`font-mono text-3xl font-black ${timer < 5 ? "text-red-500 animate-pulse" : "text-primary"}`}>{timer}s</div>
                    <div className="font-mono text-lg font-bold">Score: {myScore}</div>
                </div>

                <Card className="mb-8 p-8 shadow-lg border-primary/20 bg-gradient-to-br from-background to-muted/50">
                    <h3 className="text-2xl font-bold text-center leading-relaxed">{currentQuestion.text}</h3>
                </Card>

                {/* Show Result Feedback if answered */}
                {selected !== null && (
                    <div className={`mb-6 p-4 rounded-xl text-center font-bold text-white animate-in slide-in-from-top ${isCorrect ? "bg-green-500" : "bg-red-500"}`}>
                        {isCorrect ? "Correct! Well done!" : `Wrong! The answer was ${currentQuestion.answer}`}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {currentQuestion.options.map((opt: string, i: number) => (
                        <Button
                            key={i}
                            className={`h-20 text-lg justify-start px-6 relative overflow-hidden transition-all
                                ${selected === i
                                    ? (isCorrect ? "ring-4 ring-green-500 bg-green-50 hover:bg-green-50 text-green-700" : "ring-4 ring-red-500 bg-red-50 hover:bg-red-50 text-red-700")
                                    : "hover:scale-105 active:scale-95 hover:bg-secondary/50"}
                                ${selected !== null && selected !== i ? "opacity-50 grayscale" : ""}
                            `}
                            variant="outline"
                            onClick={() => handleAnswer(opt, i)}
                            disabled={selected !== null}
                        >
                            <span className="font-bold mr-4 opacity-50">{String.fromCharCode(65 + i)}.</span> {opt}
                        </Button>
                    ))}
                </div>
            </div>
        );
    }

    if (status === "finished") {
        return (
            <div className="container max-w-2xl mx-auto px-4 pt-24 pb-8 min-h-screen flex flex-col items-center justify-start animate-in fade-in">
                <Trophy className="w-32 h-32 text-yellow-500 mb-6 animate-bounce" />
                <h1 className="text-5xl font-black mb-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-transparent bg-clip-text">Game Over!</h1>
                <p className="text-2xl text-muted-foreground mb-8">You finished with <span className="font-bold text-primary">{myScore} points</span>.</p>

                <Card className="w-full bg-card border shadow-xl overflow-hidden mb-8">
                    <div className="bg-muted px-6 py-3 font-bold border-b">Leaderboard</div>
                    <LiveQuizLeaderboard players={players} currentUsername={user?.username} />
                </Card>

                <Button variant="outline" size="lg" className="w-full" onClick={onExit}>Back to Hub</Button>
            </div>
        );
    }

    return <div>Loading...</div>;
}
