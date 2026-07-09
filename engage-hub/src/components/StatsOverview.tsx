import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Target, Trophy, Clock, TrendingUp } from "lucide-react";
import { api } from "@/lib/api";

interface StatsOverviewProps {
    className?: string;
}

export const StatsOverview = ({ className = "" }: StatsOverviewProps) => {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Fetch comprehensive stats with cache - single API call
    useEffect(() => {
        const fetchComprehensiveStats = async () => {
            try {
                const { default: cacheService } = await import('@/lib/cacheService');
                const cachedData: any = cacheService.get('comprehensive_stats');

                // Show cached data immediately
                if (cachedData && cachedData.data) {
                    setStats(cachedData.data);
                    setLoading(false);
                }

                // Fetch fresh data
                const response = await api.getComprehensiveStats();
                const data: any = response;

                if (data.success && data.data) {
                    setStats(data.data);
                    // Update cache
                    cacheService.set('comprehensive_stats', response);
                }
            } catch (error) {
                console.error('Failed to fetch comprehensive stats:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchComprehensiveStats();
    }, []);

    return (
        <div className={` grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 ${className}`}>
            {/* Total Quizzes */}
            <Card className="border-border/60 hover:border-primary/30 transition-all duration-300">
                <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground mb-1">Total Quizzes</p>
                            <p className="text-3xl font-bold text-foreground">
                                {loading ? '...' : (stats?.total_quizzes_attended || 0)}
                            </p>
                        </div>
                        <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
                            <Target className="w-6 h-6 text-white" />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Average Score */}
            <Card className="border-border/60 hover:border-primary/30 transition-all duration-300">
                <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground mb-1">Average Score</p>
                            <p className="text-3xl font-bold text-foreground">
                                {loading ? '...' : `${stats?.average_score || 0}%`}
                            </p>
                        </div>
                        <div className="w-12 h-12 rounded-xl gradient-secondary flex items-center justify-center">
                            <Trophy className="w-6 h-6 text-white" />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Time Spent */}
            <Card className="border-border/60 hover:border-primary/30 transition-all duration-300">
                <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground mb-1">Time Spent</p>
                            <p className="text-3xl font-bold text-foreground">
                                {loading ? '...' : (stats?.total_time_spent_formatted || '0h')}
                            </p>
                        </div>
                        <div className="w-12 h-12 rounded-xl gradient-accent flex items-center justify-center">
                            <Clock className="w-6 h-6 text-white" />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Current Streak */}
            <Card className="border-border/60 hover:border-primary/30 transition-all duration-300">
                <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground mb-1">Current Streak</p>
                            <p className="text-3xl font-bold text-foreground">
                                {loading ? '...' : `${stats?.current_streak || 0} 🔥`}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                                Best: {loading ? '...' : `${stats?.longest_streak || 0} days`}
                            </p>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                            <TrendingUp className="w-6 h-6 text-success" />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
