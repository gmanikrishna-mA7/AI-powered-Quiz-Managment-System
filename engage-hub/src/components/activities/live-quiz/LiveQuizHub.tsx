import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Users, Tv, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import LiveQuizLeaderboard from "./LiveQuizLeaderboard";

export default function LiveQuizHub() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // Game State
    const [joinCode, setJoinCode] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    // History State
    const [history, setHistory] = useState<any[]>([]);
    const [selectedHistory, setSelectedHistory] = useState<any | null>(null);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [leaderboardData, setLeaderboardData] = useState<any[]>([]);
    const [showLeaderboard, setShowLeaderboard] = useState(false);
    const [loadingHistoryId, setLoadingHistoryId] = useState<number | null>(null);

    useEffect(() => {
        if (user) {
            // 1. Try Cache First
            const cached = localStorage.getItem('cached_live_history');
            if (cached) {
                try {
                    setHistory(JSON.parse(cached));
                } catch (e) { console.error("Cache parse error", e); }
            } else {
                setHistoryLoading(true); // Only show spinner if no cache
            }

            // 2. Fetch Fresh Data (Network-First strategy for updates)
            api.getLiveHistory()
                .then(data => {
                    setHistory(data);
                    localStorage.setItem('cached_live_history', JSON.stringify(data));
                })
                .catch(console.error)
                .finally(() => setHistoryLoading(false));
        }
    }, [user]);

    const checkAuth = () => {
        if (!user) {
            toast.error("Please login to participate");
            navigate("/login", { state: { from: location } });
            return false;
        }
        return true;
    };

    const handleCreateSession = async () => {
        if (!checkAuth()) return; // Re-check strictly

        setIsLoading(true);
        try {
            const res = await api.createLiveSession();
            toast.success("Session created! Share the code.");
            navigate("/fun-activities/live/" + res.join_code);
        } catch (error) {
            console.error(error);
            toast.error("Failed to create session. Try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleJoinSession = async () => {
        if (!checkAuth()) return;

        if (!joinCode || joinCode.length < 4) {
            toast.error("Please enter a valid game code.");
            return;
        }

        setIsLoading(true);
        try {
            await api.joinLiveSession(joinCode);
            toast.success("Joined session successfully!");
            navigate("/fun-activities/live/" + joinCode);
        } catch (error) {
            console.error(error);
            toast.error("Invalid code or game already started.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleViewLeaderboard = async (historyItem: any) => {
        if (loadingHistoryId) return;
        setLoadingHistoryId(historyItem.session_id);
        setSelectedHistory(historyItem);
        // Fetch full leaderboard
        try {
            const data = await api.getLiveSessionResult(historyItem.session_id);
            setLeaderboardData(data);
            setShowLeaderboard(true);
        } catch (error) {
            toast.error("Failed to load details");
        } finally {
            setLoadingHistoryId(null);
        }
    };

    return (
        <div className="mt-8 container max-w-4xl mx-auto py-12 px-4 animate-in fade-in pb-40">
            {/* ... (Host/Join Cards unchanged) ... */}
            <div className="text-center mb-12">
                <h1 className="text-4xl font-extrabold mb-4">Live Quiz Session</h1>
                <p className="text-muted-foreground text-lg">Host a live game for your audience or join one!</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
                {/* ... Cards ... */}
                {/* Host Card */}
                <Card className="hover:shadow-xl transition-all border-primary/20 cursor-pointer" onClick={isLoading ? undefined : handleCreateSession}>
                    <CardContent className="p-8 flex flex-col items-center text-center space-y-6 h-full justify-center">
                        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                            {isLoading ? <Loader2 className="w-10 h-10 animate-spin" /> : <Tv className="w-10 h-10" />}
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold mb-2">Host a Quiz</h2>
                            <p className="text-muted-foreground">Control the game, launch questions, and see live results.</p>
                        </div>
                        <Button size="lg" className="w-full text-lg" disabled={isLoading}>
                            {isLoading ? "Creating..." : "Start Hosting"}
                        </Button>
                    </CardContent>
                </Card>

                {/* Player Card */}
                <Card className="hover:shadow-xl transition-all border-green-500/20">
                    <CardContent className="p-8 flex flex-col items-center text-center space-y-6">
                        <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center text-green-600">
                            <Users className="w-10 h-10" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold mb-2">Join a Game</h2>
                            <p className="text-muted-foreground">Enter the game code to join a live session.</p>
                        </div>
                        <div className="w-full space-y-4">
                            <Input
                                placeholder="ENTER CODE"
                                className="text-center text-2xl tracking-widest uppercase font-bold h-14"
                                value={joinCode}
                                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                                maxLength={6}
                                disabled={isLoading}
                                onKeyDown={(e) => e.key === "Enter" && handleJoinSession()}
                            />
                            <Button
                                size="lg"
                                variant="outline"
                                className="w-full text-lg border-2 hover:bg-green-50 hover:text-green-600 hover:border-green-200"
                                onClick={handleJoinSession}
                                disabled={isLoading}
                            >
                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                {isLoading ? "Joining..." : "Join Game"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* History Section */}
            {user && (
                <div className="animate-in slide-in-from-bottom-10 fade-in duration-700">
                    <div className="flex items-center gap-4 mb-6">
                        <h2 className="text-2xl font-bold">Hosted & Plays History</h2>
                        <div className="h-px bg-border flex-1" />
                    </div>

                    {historyLoading ? (
                        <div className="flex justify-center p-8"><Loader2 className="animate-spin text-muted-foreground" /></div>
                    ) : history.length === 0 ? (
                        <p className="text-center text-muted-foreground italic">No live game history yet.</p>
                    ) : (
                        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
                            {history.map((item) => (
                                <Card
                                    key={item.session_id}
                                    className={`min-w-[300px] snap-center cursor-pointer hover:border-primary transition-all hover:shadow-md relative ${loadingHistoryId === item.session_id ? "opacity-70" : ""}`}
                                    onClick={() => handleViewLeaderboard(item)}
                                >
                                    {loadingHistoryId === item.session_id && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10 rounded-xl">
                                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                        </div>
                                    )}
                                    <CardContent className="p-5 space-y-3">
                                        <div className="flex justify-between items-start">
                                            <div className={`text-xs font-bold px-2 py-1 rounded uppercase ${item.host === user.username ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                                                {item.host === user.username ? "HOSTED" : "PLAYED"}
                                            </div>
                                            <span className="text-xs text-muted-foreground font-mono">{new Date(item.played_at || Date.now()).toLocaleDateString()}</span>
                                        </div>
                                        <div>
                                            <div className="font-bold truncate" title={item.quiz_title}>{item.quiz_title}</div>
                                            <div className="text-xs text-muted-foreground font-mono">Code: {item.join_code}</div>
                                        </div>
                                        <div className="flex items-center justify-between pt-2 border-t">
                                            <div className="flex flex-col">
                                                <span className="text-xs text-muted-foreground">Rank</span>
                                                <span className="font-bold text-lg">#{item.rank} {item.rank === 1 && "🏆"}</span>
                                            </div>
                                            <div className="flex flex-col text-right">
                                                <span className="text-xs text-muted-foreground">Score</span>
                                                <span className="font-mono font-bold text-lg">{item.score}</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Leaderboard Dialog */}
            {showLeaderboard && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in fade-in" onClick={() => setShowLeaderboard(false)}>
                    <div className="bg-background border rounded-xl shadow-2xl w-full max-w-lg m-4 overflow-hidden animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b flex justify-between items-center bg-muted/50">
                            <div>
                                <h3 className="font-bold text-lg">{selectedHistory?.quiz_title}</h3>
                                <p className="text-xs text-muted-foreground">Game Code: {selectedHistory?.join_code}</p>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => setShowLeaderboard(false)}>Close</Button>
                        </div>
                        <div className="p-0">
                            {/* Reusing component but passing raw data */}
                            <LiveQuizLeaderboard players={leaderboardData} currentUsername={user?.username} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

