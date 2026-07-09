import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Timer, Puzzle, HelpCircle, Users, Trophy, Calendar, Lock } from "lucide-react";
import { api } from "@/lib/api";
import { format, isToday, parseISO } from "date-fns";

export default function FunActivities() {
    const navigate = useNavigate();
    const [schedule, setSchedule] = useState<Record<string, any[]>>({});
    const [loading, setLoading] = useState(true);
    const [dailyStats, setDailyStats] = useState({ completed: 0, total: 3, bonus_unlocked: false });

    useEffect(() => {
        const fetchData = async () => {
            // Stale-while-revalidate strategy for schedule
            const cachedSchedule = localStorage.getItem("activity_schedule");
            if (cachedSchedule) {
                try {
                    setSchedule(JSON.parse(cachedSchedule));
                    // Don't set loading false yet, wait for at least one data source or timeouts
                } catch (e) {
                    console.error("Schedule cache parse error", e);
                }
            }

            // Stale-while-revalidate for Daily Progress
            const cachedProgress = localStorage.getItem("daily_progress_cache");
            if (cachedProgress) {
                try {
                    const parsed = JSON.parse(cachedProgress);
                    // Only use cache if it matches today to avoid showing yesterday's data
                    const todayStr = format(new Date(), 'yyyy-MM-dd');
                    if (parsed.date === todayStr) {
                        setDailyStats({
                            completed: parsed.completed,
                            total: parsed.total,
                            bonus_unlocked: parsed.is_bonus_unlocked
                        });
                    }
                } catch (e) {
                    console.error("Progress cache parse error", e);
                }
            }

            // Initial loading state can be turned off if we have cached data
            if (cachedSchedule) setLoading(false);

            try {
                // Fetch Schedule
                const data = await api.getActivitySchedule();
                setSchedule(data);
                localStorage.setItem("activity_schedule", JSON.stringify(data));

                // Fetch Daily Progress (New API)
                // Use local date to ensure backend checks correct day for the user
                const todayStr = format(new Date(), 'yyyy-MM-dd');
                const progress = await api.getDailyProgress(todayStr);
                if (progress) {
                    setDailyStats({
                        completed: progress.completed,
                        total: progress.total,
                        bonus_unlocked: progress.is_bonus_unlocked
                    });
                    localStorage.setItem("daily_progress_cache", JSON.stringify({ ...progress, date: todayStr }));
                }
                console.log(progress);
            } catch (error) {
                console.error("Failed to fetch activities:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const getActivityIcon = (type: string) => {
        switch (type) {

            case 'lightning': return Timer;
            case 'scramble': return Puzzle;
            case 'two_truths': return HelpCircle;
            default: return Trophy;
        }
    };

    const getActivityColor = (type: string) => {
        switch (type) {

            case 'lightning': return "bg-blue-500/20 text-blue-600";
            case 'scramble': return "bg-green-500/20 text-green-600";
            case 'two_truths': return "bg-purple-500/20 text-purple-600";
            default: return "bg-gray-500/20 text-gray-600";
        }
    };

    const getActivityPath = (type: string, id: number) => {
        // Map backend type to frontend route
        // 'two_truths' -> 'two-truths'
        const routeType = type.replace('_', '-');
        return `/fun-activities/${routeType}?id=${id}`;
    };

    // Scroll to section based on hash
    useEffect(() => {
        if (loading) return;
        const hash = window.location.hash.replace('#', '');
        if (hash) {
            setTimeout(() => {
                const element = document.getElementById(hash);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    // Optional: highlight effect
                    element.classList.add('ring-4', 'ring-primary', 'ring-opacity-50');
                    setTimeout(() => element.classList.remove('ring-4', 'ring-primary', 'ring-opacity-50'), 2000);
                }
            }, 500); // Small delay to ensure render
        }
    }, [loading]);

    if (loading) {
        return <div className="pt-32 text-center">Loading activities...</div>;
    }

    const { upcomingDates, pastDates } = (() => {
        const allDates = Object.keys(schedule);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayStrs = allDates.filter(d => isToday(parseISO(d)));

        const futureStrs = allDates.filter(d => {
            const date = parseISO(d);
            return !isToday(date) && date > today;
        }).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

        const pastStrs = allDates.filter(d => {
            const date = parseISO(d);
            return !isToday(date) && date < today;
        }).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

        return {
            upcomingDates: [
                ...todayStrs,
                ...futureStrs.slice(0, 3), // Show only next 3 upcoming days
            ],
            pastDates: pastStrs
        };
    })();

    // Use state-based stats instead of deriving from schedule
    const { completed: completedCount, total: totalDaily } = dailyStats;
    const progressPercentage = totalDaily > 0 ? (completedCount / totalDaily) * 100 : 0;

    const renderActivitySection = (dateStr: string) => {
        const dateObj = parseISO(dateStr);
        const isCurrentDay = isToday(dateObj);
        const isPast = dateObj < new Date(new Date().setHours(0, 0, 0, 0));

        return (
            <div key={dateStr} className="space-y-4">
                <div className="flex items-center gap-2 border-b pb-2">
                    <Calendar className={`w-5 h-5 ${isCurrentDay ? 'text-primary' : 'text-muted-foreground'}`} />
                    <h2 className={`text-2xl font-bold ${isCurrentDay ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {isCurrentDay ? "Today's Challenges" : format(dateObj, "EEEE, MMMM do")}
                    </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {schedule[dateStr].filter((a: any) => a.type !== 'buzzer').map((activity: any) => {
                        const Icon = getActivityIcon(activity.type);
                        const colorClass = getActivityColor(activity.type);

                        const isAccessible = isCurrentDay || isPast;

                        return (
                            <div
                                key={activity.id}
                                className="relative scroll-mt-32"
                                id={isCurrentDay ? activity.type : undefined}
                            >
                                <Card
                                    onClick={() => {
                                        if (isAccessible) {
                                            const path = getActivityPath(activity.type, activity.id);
                                            const separator = path.includes('?') ? '&' : '?';
                                            navigate(isPast ? `${path}${separator}view_only=true` : path);
                                        }
                                    }}
                                    className={`group transition-all duration-300 border-2 relative overflow-hidden backdrop-blur-sm bg-card/80
                                    ${isAccessible
                                            ? 'cursor-pointer hover:shadow-xl hover:border-primary/50'
                                            : 'opacity-70 grayscale-[0.5] cursor-not-allowed'}
                                    ${activity.completed ? 'border-green-500/50 bg-green-500/5' : ''}`}
                                >
                                    <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:scale-150 transition-transform duration-500 ${colorClass}`}>
                                        <Icon className="w-24 h-24" />
                                    </div>

                                    <CardHeader className="relative z-10">
                                        <div className="flex justify-between items-start">
                                            <div className={`w-12 h-12 rounded-lg ${colorClass} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                                                <Icon className="w-6 h-6" />
                                            </div>
                                            {!isAccessible && <Lock className="w-5 h-5 text-muted-foreground" />}
                                            {isCurrentDay && activity.completed && <Trophy className="w-5 h-5 text-green-500" />}
                                            {isPast && <Users className="w-5 h-5 text-primary" />}
                                        </div>

                                        <CardTitle className="text-xl font-bold group-hover:text-primary transition-colors">
                                            {activity.title}
                                        </CardTitle>
                                        <CardDescription className="text-sm font-medium pt-1 capitalize">
                                            {activity.difficulty} • {activity.type.replace('_', ' ')}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <p className={`text-sm ${activity.completed ? "font-bold text-green-600" : "text-muted-foreground"}`}>
                                            {isCurrentDay
                                                ? (activity.completed ? "Completed - View Leaderboard" : "Play now to earn +10 XP!")
                                                : (isPast ? "View Leaderboard" : "Coming soon")}
                                        </p>
                                    </CardContent>
                                </Card>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className="container mx-auto px-4 py-8 pt-24 space-y-8 animate-in fade-in duration-500">
            {/* ... (keep header and banner) ... */}
            <div className="text-center space-y-4 mb-8">
                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-transparent bg-clip-text">
                    Fun & Activities Zone
                </h1>
                <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                    Daily challenges await! Compete in new activities every day to climb the leaderboards.
                </p>
            </div>

            {/* Daily XP Progress Banner - Keep existing code */}
            {totalDaily > 0 && (
                <div className="max-w-3xl mx-auto mb-12">
                    <Card className="border-2 border-yellow-500/20 bg-gradient-to-r from-yellow-500/5 to-orange-500/5">
                        <CardContent className="pt-6">
                            <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-yellow-500/10 rounded-full text-yellow-600">
                                        <Trophy className="w-8 h-8" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold">Daily 3 Challenge</h3>
                                        <p className="text-sm text-muted-foreground">
                                            {completedCount >= totalDaily
                                                ? "🎉 All daily activities completed! +50 XP Earned"
                                                : `Complete all ${totalDaily} to unlock +20 XP Bonus!`}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl font-black text-primary">{completedCount}/{totalDaily}</div>
                                    <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Completed</div>
                                </div>
                            </div>
                            <div className="h-4 bg-muted rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 transition-all duration-1000 ease-out"
                                    style={{ width: `${progressPercentage}%` }}
                                />
                            </div>
                            <div className="flex justify-between mt-2 text-xs font-medium text-muted-foreground">
                                <span>Start</span>
                                <span>50 XP Potential</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Always available Multiplayer Games */}
            <div className="mb-12">
                <div className="flex items-center gap-2 mb-4">
                    <Users className="w-6 h-6 text-primary" />
                    <h2 className="text-2xl font-bold">Multiplayer Zone</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card
                        id="live_host"
                        onClick={() => navigate("/fun-activities/live-host")}
                        className="group cursor-pointer hover:shadow-xl transition-all duration-300 border-2 hover:border-primary/50 relative overflow-hidden backdrop-blur-sm bg-card/80"
                    >
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-150 transition-transform duration-500 bg-red-500/20 text-red-600">
                            <Users className="w-24 h-24" />
                        </div>
                        <CardHeader>
                            <CardTitle className="text-xl font-bold group-hover:text-primary">Live Hosted Quiz</CardTitle>
                            <CardDescription>Host a game for friends or join one!</CardDescription>
                        </CardHeader>
                    </Card>
                </div>
            </div>

            {/* Upcoming & Today */}
            {upcomingDates.map(dateStr => renderActivitySection(dateStr))}

            {/* Divider for Past Activities */}
            {pastDates.length > 0 && (
                <div className="relative py-8">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-muted" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-4 text-muted-foreground font-bold tracking-widest">
                            Past Challenges
                        </span>
                    </div>
                </div>
            )}

            {/* Past Dates */}
            {pastDates.map(dateStr => renderActivitySection(dateStr))}

            {
                Object.keys(schedule).length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                        No activities scheduled at the moment. Check back later!
                    </div>
                )
            }
        </div >
    );
}
