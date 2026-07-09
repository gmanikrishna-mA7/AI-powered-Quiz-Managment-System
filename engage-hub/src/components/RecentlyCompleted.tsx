import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, History } from "lucide-react";
import { api } from "@/lib/api";
import { ReviewCard } from "@/components/ReviewCard";

interface QuizAttempt {
    attempt_id: number;
    quiz_id: string;
    title: string;
    score: number;
    total_questions: number;
    percentage: number;
    completed_at: string;
    quiz_type?: string; // Added here to capture API data
}

interface RecentlyCompletedProps {
    limit?: number;
    className?: string;
    layout?: "list" | "grid";
}

export const RecentlyCompleted = ({ limit = 2, className = "", layout = "list" }: RecentlyCompletedProps) => {
    const [allAttempts, setAllAttempts] = useState<QuizAttempt[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAttempts = async () => {
            try {
                // Try to use cache first
                const { default: cacheService } = await import('@/lib/cacheService');
                const cachedData: any = cacheService.get('quiz_history');

                if (cachedData) {
                    setAllAttempts(cachedData.data?.attempts || []);
                    setLoading(false);
                }

                // Fetch fresh data
                const response = await api.getQuizHistory();
                const data: any = response;
                const attempts = data.data?.attempts || [];
                setAllAttempts(attempts);

                // Update cache
                cacheService.set('quiz_history', response);
            } catch (error) {
                console.error('Failed to fetch quiz history:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchAttempts();
    }, []);

    // Apply limit for display only
    const displayedAttempts = allAttempts.slice(0, limit);
    const hasMore = allAttempts.length > limit;

    return (
        <Card className={`bg-background/40 backdrop-blur-sm border-border/50 card-shadow ${className}`}>
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-lg">
                    <div className="flex items-center gap-2">
                        <History className="w-5 h-5 text-primary" />
                        <span>{layout === "grid" ? "Activity History" : "Recently Completed"}</span>
                    </div>
                    {hasMore && layout === "list" && (
                        <Link to="/profile#activity" className="text-xs text-muted-foreground hover:text-primary transition-colors">
                            View All
                        </Link>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className={layout === "grid" ? "grid grid-cols-1 md:grid-cols-2 gap-4" : "space-y-3"}>
                    {loading ? (
                        <div className="text-center py-8 text-muted-foreground text-sm col-span-full">Loading history...</div>
                    ) : allAttempts.length === 0 ? (
                        <div className="text-center py-10 px-4 border border-dashed border-muted rounded-lg bg-muted/10 col-span-full">
                            <CheckCircle2 className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground mb-3">No quizzes completed yet.</p>
                            <Link to="/categories" className="text-xs font-medium text-primary hover:underline">
                                Start your first quiz →
                            </Link>
                        </div>
                    ) : (
                        <>
                            {displayedAttempts.map((attempt) => (
                                <ReviewCard
                                    key={attempt.attempt_id}
                                    attempt_id={attempt.attempt_id}
                                    quiz_id={attempt.quiz_id}
                                    title={attempt.title}
                                    score={attempt.score}
                                    total_questions={attempt.total_questions}
                                    percentage={attempt.percentage}
                                    completed_at={attempt.completed_at}
                                    quiz_type={attempt.quiz_type} // Passing it here
                                />
                            ))}

                            {hasMore && layout === "list" && (
                                <div className="text-center pt-2">
                                    <Link
                                        to="/profile#activity"
                                        className="inline-flex items-center text-xs font-medium text-muted-foreground hover:text-primary transition-colors"
                                    >
                                        Show {allAttempts.length - limit} more attempts
                                    </Link>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};