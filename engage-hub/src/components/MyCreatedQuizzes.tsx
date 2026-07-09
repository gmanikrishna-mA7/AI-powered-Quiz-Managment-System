import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Plus } from "lucide-react";
import { api } from "@/lib/api";
import { Link } from "react-router-dom";
import { QuizCard } from "@/components/QuizCard"; // Adjust path if necessary

// Updated Interface to match QuizCard needs
interface Quiz {
    quiz_id: string;
    title: string;
    category?: string;    // API might return this
    topic?: string;       // API might return this
    quiz_type?: string;   // API might return this
    level: string;
    num_questions: number;
    duration_seconds: number;
    created_at: string;
    language?: string;
}

interface MyCreatedQuizzesProps {
    onCreateClick: () => void;
    refreshTrigger?: number;
    className?: string;
    limit?: number;
    layout?: "list" | "grid";
}

export const MyCreatedQuizzes = ({
    onCreateClick,
    refreshTrigger,
    className = "",
    limit,
    layout = "list"
}: MyCreatedQuizzesProps) => {
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMyQuizzes = async () => {
            try {
                // Check cache first
                const { default: cacheService } = await import('@/lib/cacheService');
                const cacheKey = 'my_created_quizzes';
                const cachedData: any = cacheService.get(cacheKey);

                if (cachedData && cachedData.data?.quizzes) {
                    const sortedCached = cachedData.data.quizzes.sort((a: Quiz, b: Quiz) => {
                        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                    });
                    setQuizzes(sortedCached);
                    setLoading(false);
                }

                // Fetch fresh data
                const response = await api.getMyCreatedQuizzes();
                const data: any = response;

                const sortedQuizzes = (data.data?.quizzes || []).sort((a: Quiz, b: Quiz) => {
                    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                });

                setQuizzes(sortedQuizzes);
                cacheService.set(cacheKey, response);
            } catch (error) {
                console.error('Failed to fetch created quizzes:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchMyQuizzes();
    }, [refreshTrigger]);

    return (
        <Card className={`border-border/60 hover:border-primary/30 transition-all duration-300 ${className}`}>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-primary" />
                        My Created Quizzes ({quizzes.length})
                    </CardTitle>
                    <Button
                        onClick={onCreateClick}
                        size="sm"
                        className="gradient-primary text-white"
                    >
                        <Plus className="w-4 h-4 mr-1" />
                        Create More Quiz
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="text-center py-8 text-muted-foreground col-span-full">Loading your quizzes...</div>
                ) : quizzes.length === 0 ? (
                    <div className="text-center py-12 col-span-full">
                        <BookOpen className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
                        <p className="text-muted-foreground mb-4">You haven't created any quizzes yet</p>
                        <Button
                            onClick={onCreateClick}
                            className="gradient-primary text-white"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Create Your First Quiz
                        </Button>
                    </div>
                ) : (
                    <div className={layout === "grid" ? "grid grid-cols-1 md:grid-cols-2 gap-4" : "space-y-4"}>
                        {quizzes.slice(0, limit || quizzes.length).map((quiz) => (
                            <QuizCard
                                key={quiz.quiz_id}
                                quiz_id={quiz.quiz_id}
                                title={quiz.title}
                                // Fallback: Use topic if available, else category, else 'General'
                                topic={quiz.topic || quiz.category || 'General'}
                                level={quiz.level}
                                num_questions={quiz.num_questions}
                                duration_seconds={quiz.duration_seconds}
                                created_at={quiz.created_at}
                                language={quiz.language}
                            />
                        ))}

                        {layout === "list" && (
                            <div className="text-center pt-2">
                                <Link to="/profile#MyQuizzes" className="text-primary hover:underline text-sm font-medium">
                                    See all ({quizzes.length}) quizzes→
                                </Link>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};