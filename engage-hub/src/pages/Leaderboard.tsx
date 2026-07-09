import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Trophy,
    Medal,
    Crown,
    TrendingUp,
    Users,
    Flame,
    Star,
    ChevronUp,
    ChevronDown,
    Minus
} from "lucide-react";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

interface LeaderboardEntry {
    rank: number;
    user_id: number;
    username: string;
    full_name: string;
    xp_score: number;
    level: number;
    avatar?: string;
}

interface WeeklyLeaderboardEntry {
    rank: number;
    user_id: number;
    username: string;
    full_name: string;
    weekly_xp: number;
    total_xp: number;
    quizzes_this_week: number;
    avatar?: string;
}

const Leaderboard = () => {
    const [topPlayers, setTopPlayers] = useState<LeaderboardEntry[]>([]);
    const [weeklyPlayers, setWeeklyPlayers] = useState<WeeklyLeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [currentUserRank, setCurrentUserRank] = useState<number | null>(null);
    const [totalUsers, setTotalUsers] = useState(0);
    const [showAllPlayers, setShowAllPlayers] = useState(false);
    const [userTotalXP, setUserTotalXP] = useState<number>(0);
    const [userLevel, setUserLevel] = useState<number>(0);
    const { user } = useAuth();

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                const { default: cacheService } = await import('@/lib/cacheService');
                const cachedData: any = cacheService.get('global_leaderboard_data');

                // Show cached data immediately for faster perceived loading
                if (cachedData && cachedData.data) {
                    setTopPlayers(cachedData.data.overall_top_100 || []);
                    setWeeklyPlayers(cachedData.data.weekly_top_10 || []);
                    setCurrentUserRank(cachedData.data.current_user_overall_rank);
                    setTotalUsers(cachedData.data.total_users || 0);
                    setLoading(false);
                }

                // Fetch fresh data in background
                const response = await api.getGlobalLeaderboard();
                const data: any = response;

                console.log('📊 Leaderboard data fetched:', data);

                if (data.success && data.data) {
                    setTopPlayers(data.data.overall_top_100 || []);
                    setWeeklyPlayers(data.data.weekly_top_10 || []);
                    setCurrentUserRank(data.data.current_user_overall_rank);
                    setTotalUsers(data.data.total_users || 0);

                    console.log('✅ Set overall players:', data.data.overall_top_100?.length);
                    console.log('✅ Set weekly players:', data.data.weekly_top_10?.length);

                    // Update cache with fresh data
                    cacheService.set('global_leaderboard_data', response);
                }
            } catch (error) {
                console.error('❌ Failed to fetch leaderboard:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchLeaderboard();
    }, []);

    // Fetch user comprehensive stats when logged in
    useEffect(() => {
        const fetchUserStats = async () => {
            if (user) {
                try {
                    const { default: cacheService } = await import('@/lib/cacheService');
                    const cacheKey = 'user_leaderboard_stats';
                    const cachedData: any = cacheService.get(cacheKey);

                    // Show cached data immediately
                    if (cachedData && cachedData.data) {
                        setUserTotalXP(cachedData.data.xp_score || 0);
                        setUserLevel(cachedData.data.level || 1);
                    }

                    // Fetch fresh data in background
                    const response = await api.getComprehensiveStats();
                    if (response.success && response.data) {
                        setUserTotalXP(response.data.xp_score || 0);
                        setUserLevel(response.data.level || 1);

                        // Update cache
                        cacheService.set(cacheKey, response);
                    }
                } catch (error) {
                    console.error('❌ Failed to fetch user stats:', error);
                }
            }
        };

        fetchUserStats();
    }, [user]);

    const getRankIcon = (rank: number) => {
        if (rank === 1) return <Crown className="w-6 h-6 text-yellow-500" />;
        if (rank === 2) return <Medal className="w-6 h-6 text-gray-400" />;
        if (rank === 3) return <Medal className="w-6 h-6 text-orange-600" />;
        return <span className="text-lg font-bold text-muted-foreground">#{rank}</span>;
    };

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    const getRankGradient = (rank: number) => {
        if (rank === 1) return "gradient-primary";
        if (rank === 2) return "bg-gradient-to-r from-slate-400 to-slate-500";
        if (rank === 3) return "gradient-accent";
        return "bg-muted";
    };



    const top3 = topPlayers.slice(0, 3);
    const currentUser = user && topPlayers.find(p => p.user_id === user.id);

    return (
        <div className="min-h-screen bg-transparent">
            <main className="pt-24 pb-16">
                <div className="container mx-auto px-4">
                    {/* Header */}
                    <div className="text-center mb-12">
                        <h1 className="text-5xl font-bold mb-4">
                            Global <span className="text-foreground">Leaderboard</span>
                        </h1>
                        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                            See how you stack up against the best quiz masters in the world
                        </p>
                    </div>

                    {/* Stats Overview */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 max-w-4xl mx-auto">
                        <Card className="border-border/50 card-shadow text-center bg-background/60">
                            <CardContent className="p-6">
                                <Users className="w-10 h-10 text-primary mx-auto mb-3" />
                                <p className="text-3xl font-bold">{totalUsers.toLocaleString()}</p>
                                <p className="text-muted-foreground">Active Players</p>
                            </CardContent>
                        </Card>
                        <Card className="border-border/50 card-shadow text-center bg-background/60">
                            <CardContent className="p-6">
                                <Trophy className="w-10 h-10 text-warning mx-auto mb-3" />
                                {user ? (
                                    <>
                                        <p className="text-3xl font-bold">{userTotalXP.toLocaleString()}</p>
                                        <p className="text-muted-foreground">Your Total XP</p>
                                    </>
                                ) : (
                                    <>
                                        <p className="text-lg text-muted-foreground">Login first to check</p>
                                        <p className="text-sm text-muted-foreground">Total XP Earned</p>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                        <Card className="border-border/50 card-shadow text-center bg-background/60">
                            <CardContent className="p-6">
                                <Flame className="w-10 h-10 text-destructive mx-auto mb-3" />
                                {user ? (
                                    <>
                                        <p className="text-3xl font-bold">{userLevel}</p>
                                        <p className="text-muted-foreground">Your Level</p>
                                    </>
                                ) : (
                                    <>
                                        <p className="text-lg text-muted-foreground">Login first to check</p>
                                        <p className="text-sm text-muted-foreground">Highest Level</p>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Top 3 Podium */}
                    {top3.length >= 3 && (
                        <div className="flex justify-center items-end gap-4 mb-12 max-w-3xl mx-auto">
                            {/* 2nd Place */}
                            <div className="text-center animate-slide-up" style={{ animationDelay: "0.1s" }}>
                                <div className="w-20 h-20 rounded-full bg-gradient-to-r from-slate-400 to-slate-500 mx-auto mb-3 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                                    {getInitials(top3[1].full_name)}
                                </div>
                                <p className="font-semibold text-foreground">{top3[1].full_name}</p>
                                <p className="text-sm text-muted-foreground">{top3[1].xp_score.toLocaleString()} XP</p>
                                <div className="h-24 bg-gradient-to-r from-slate-400 to-slate-500 rounded-t-lg mt-3 flex items-center justify-center">
                                    <Medal className="w-10 h-10 text-white" />
                                </div>
                            </div>

                            {/* 1st Place */}
                            <div className="text-center animate-slide-up">
                                <div className="relative">
                                    <Crown className="w-8 h-8 text-yellow-500 absolute -top-8 left-1/2 -translate-x-1/2 animate-float" />
                                    <div className="w-24 h-24 rounded-full gradient-primary mx-auto mb-3 flex items-center justify-center text-white text-3xl font-bold shadow-xl animate-glow">
                                        {getInitials(top3[0].full_name)}
                                    </div>
                                </div>
                                <p className="font-bold text-lg text-foreground">{top3[0].full_name}</p>
                                <p className="text-sm text-muted-foreground">{top3[0].xp_score.toLocaleString()} XP</p>
                                <div className="h-32 gradient-primary rounded-t-lg mt-3 flex items-center justify-center">
                                    <Trophy className="w-12 h-12 text-white" />
                                </div>
                            </div>

                            {/* 3rd Place */}
                            <div className="text-center animate-slide-up" style={{ animationDelay: "0.2s" }}>
                                <div className="w-20 h-20 rounded-full gradient-accent mx-auto mb-3 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                                    {getInitials(top3[2].full_name)}
                                </div>
                                <p className="font-semibold text-foreground">{top3[2].full_name}</p>
                                <p className="text-sm text-muted-foreground">{top3[2].xp_score.toLocaleString()} XP</p>
                                <div className="h-20 gradient-accent rounded-t-lg mt-3 flex items-center justify-center">
                                    <Medal className="w-8 h-8 text-white" />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Main Leaderboard */}
                    <Tabs defaultValue="global" className="max-w-4xl mx-auto">
                        <TabsList className="grid w-full grid-cols-2 gap-8 bg-transparent p-0 mb-8">
                            <TabsTrigger
                                value="global"
                                className="h-14 data-[state=active]:bg-card/80 border-2 border-transparent hover:border-primary/60 hover:shadow-[0_0_30px_-5px_hsl(var(--primary)/0.3)] transition-all duration-300 hover:scale-105 data-[state=active]:scale-105 data-[state=active]:border-primary/60 data-[state=active]:shadow-[0_0_30px_-5px_hsl(var(--primary)/0.3)] rounded-xl"
                            >
                                Global Rankings
                            </TabsTrigger>
                            <TabsTrigger
                                value="weekly"
                                className="h-14 data-[state=active]:bg-card/80 border-2 border-transparent hover:border-primary/60 hover:shadow-[0_0_30px_-5px_hsl(var(--primary)/0.3)] transition-all duration-300 hover:scale-105 data-[state=active]:scale-105 data-[state=active]:border-primary/60 data-[state=active]:shadow-[0_0_30px_-5px_hsl(var(--primary)/0.3)] rounded-xl"
                            >
                                Weekly Top 10
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="global">
                            <Card className="border-border/50 card-shadow">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <TrendingUp className="w-5 h-5 text-primary" />
                                        Top 100 Players
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {topPlayers.slice(0, showAllPlayers ? 100 : 10).map((player) => (
                                            <div
                                                key={player.user_id}
                                                className={`flex items-center gap-4 p-4 rounded-lg transition-all hover:bg-muted/50 ${player.rank <= 3 ? "bg-muted/30" : ""
                                                    } ${user && player.user_id === user.id ? "bg-primary/10 border border-primary/30" : ""}`}
                                            >
                                                <div className="w-10 flex justify-center">
                                                    {getRankIcon(player.rank)}
                                                </div>
                                                <div className={`w-12 h-12 rounded-full ${getRankGradient(player.rank)} flex items-center justify-center text-white font-bold`}>
                                                    {getInitials(player.full_name)}
                                                </div>
                                                <div className="flex-1">
                                                    <p className="font-semibold text-foreground">{player.full_name}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        Level {player.level} • @{player.username}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-bold text-foreground">{player.xp_score.toLocaleString()}</p>
                                                    <p className="text-sm text-muted-foreground">XP</p>
                                                </div>
                                            </div>
                                        ))}

                                        {!showAllPlayers && topPlayers.length > 10 && (
                                            <div className="text-center pt-4">
                                                <Button
                                                    variant="outline"
                                                    onClick={() => setShowAllPlayers(true)}
                                                    className="w-full max-w-xs"
                                                >
                                                    See More ({topPlayers.length - 10} more players)
                                                </Button>
                                            </div>
                                        )}

                                        {showAllPlayers && (
                                            <div className="text-center pt-4">
                                                <Button
                                                    variant="outline"
                                                    onClick={() => setShowAllPlayers(false)}
                                                    className="w-full max-w-xs"
                                                >
                                                    Show Less
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="weekly">
                            <Card className="border-border/50 card-shadow">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <TrendingUp className="w-5 h-5 text-primary" />
                                        Weekly Top 10
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {weeklyPlayers.length === 0 ? (
                                        <div className="text-center py-8 text-muted-foreground">
                                            No weekly activity yet
                                        </div>
                                    ) : (
                                        <div className="space-y-2 max-h-[600px] overflow-y-auto">
                                            {weeklyPlayers.map((player) => (
                                                <div
                                                    key={player.user_id}
                                                    className={`flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-all ${user && player.username === user.email ? "bg-primary/10 border border-primary/30" : ""
                                                        }`}
                                                >
                                                    <div className="w-8 text-center">
                                                        <span className="text-sm font-bold text-muted-foreground">#{player.rank}</span>
                                                    </div>
                                                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-bold">
                                                        {getInitials(player.full_name)}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-medium text-sm truncate">{player.full_name}</p>
                                                        <p className="text-xs text-muted-foreground truncate">
                                                            @{player.username}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {player.quizzes_this_week} {player.quizzes_this_week === 1 ? 'quiz' : 'quizzes'} this week
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-bold text-sm text-primary">+{player.weekly_xp.toLocaleString()}</p>
                                                        <p className="text-xs text-muted-foreground">Weekly XP</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>

                    {/* Your Position */}
                    {user && (
                        <Card className="border-border/50 card-shadow max-w-4xl mx-auto mt-8 bg-gradient-to-r from-primary/10 to-secondary/10">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between flex-wrap gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-full gradient-primary flex items-center justify-center text-white text-xl font-bold">
                                            {currentUser ? getInitials(currentUser.full_name) : user.full_name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-bold text-lg text-foreground">Your Position</p>
                                            <p className="text-muted-foreground">Keep playing to climb the ranks!</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-8">
                                        <div className="text-center">
                                            <p className="text-3xl font-bold text-foreground">#{currentUserRank || 'N/A'}</p>
                                            <p className="text-sm text-muted-foreground">Global Rank</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-3xl font-bold text-foreground">
                                                {(() => {
                                                    const userWeeklyData = weeklyPlayers.find(p => p.username === user.email);
                                                    return userWeeklyData ? `#${userWeeklyData.rank}` : 'N/A';
                                                })()}
                                            </p>
                                            <p className="text-sm text-muted-foreground">Weekly Rank</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-3xl font-bold text-foreground">{currentUser?.xp_score.toLocaleString() || '0'}</p>
                                            <p className="text-sm text-muted-foreground">Total XP</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-3xl font-bold text-foreground">{currentUser?.level || '1'}</p>
                                            <p className="text-sm text-muted-foreground">Level</p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </main>        </div>
    );
};

export default Leaderboard;
