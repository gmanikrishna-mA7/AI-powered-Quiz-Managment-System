
import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { QuizCard } from "@/components/QuizCard";
import { Loader2 } from "lucide-react";

const Quiz = () => {
    const { quizId } = useParams<{ quizId: string }>();
    const [quiz, setQuiz] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchQuiz = async () => {
            if (!quizId) return;
            try {
                setLoading(true);
                const response = await api.getQuizDetail(quizId);
                if (response.success) {
                    setQuiz(response.data);
                } else {
                    setError("Quiz not found");
                }
            } catch (err: any) {
                console.error("Failed to fetch quiz details:", err);
                setError(err.message || "Failed to load quiz");
            } finally {
                setLoading(false);
            }
        };

        fetchQuiz();
    }, [quizId]);

    if (loading) {
        return (
            <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error || !quiz) {
        return (
            <div className="flex h-[calc(100vh-4rem)] flex-col items-center justify-center gap-4 text-center p-4">
                <h2 className="text-2xl font-bold text-destructive">Oops!</h2>
                <p className="text-muted-foreground">{error || "Quiz not found"}</p>
            </div>
        );
    }

    return (
        <div className="container max-w-4xl py-24 px-4 md:px-6">
            <div className="flex flex-col gap-8">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">
                        Ready to Challenge Yourself?
                    </h1>
                    <p className="text-muted-foreground text-lg">
                        Test your knowledge with this {quiz.category} quiz.
                    </p>
                </div>

                <div className="flex justify-center">
                    <div className="w-full max-w-2xl">
                        <QuizCard
                            quiz_id={quiz.quiz_id}
                            title={quiz.title}
                            topic={quiz.subtopic || quiz.category}
                            level={quiz.level}
                            num_questions={quiz.total_questions || quiz.num_questions}
                            duration_seconds={quiz.duration_seconds}
                            created_at={quiz.created_at}
                            language={quiz.language}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Quiz;
