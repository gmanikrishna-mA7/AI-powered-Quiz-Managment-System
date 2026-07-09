import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlayCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { QuizCard } from "@/components/QuizCard";

// Updated Interface to allow for variations in API response
interface Quiz {
    quiz_id: string;
    title: string;
    category?: string;    // Older API field
    topic?: string;       // Newer API field
    quiz_type?: string;
    level: string;
    num_questions: number;
    duration_seconds: number;
    created_at?: string;
    language?: string;
}

import { useAuth } from "@/contexts/AuthContext";

export const ExploreQuizzes = () => {
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [loadingQuizzes, setLoadingQuizzes] = useState(true);
    const { user } = useAuth(); // Get user for preferences

    useEffect(() => {
        let isMounted = true;

        const sortQuizzes = (allQuizzes: Quiz[], preferences?: string[]) => {
            if (!allQuizzes || allQuizzes.length === 0) return [];

            // Helper to shuffle array (Fisher-Yates)
            const shuffle = (array: any[]) => {
                for (let i = array.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [array[i], array[j]] = [array[j], array[i]];
                }
                return array;
            };

            // If no preferences, just return random shuffle
            if (!preferences || preferences.length === 0) {
                return shuffle([...allQuizzes]);
            }

            // Group quizzes by preference to ensure diversity
            const preferredMap: Record<string, Quiz[]> = {};
            const others: Quiz[] = [];

            // Initialize buckets for each preference
            preferences.forEach(p => preferredMap[p.toLowerCase()] = []);

            allQuizzes.forEach(quiz => {
                const topic = (quiz.topic || quiz.category || '').toLowerCase();
                const matchedPref = preferences.find(p => topic.includes(p.toLowerCase()));

                if (matchedPref) {
                    preferredMap[matchedPref.toLowerCase()].push(quiz);
                } else {
                    others.push(quiz);
                }
            });

            // Diverse Selection Construction
            const selectedQuizzes: Quiz[] = [];
            const prefKeys = Object.keys(preferredMap);

            // Shuffle quizzes within each bucket
            prefKeys.forEach(key => shuffle(preferredMap[key]));
            // Shuffle the order of preferences themselves to avoid bias
            shuffle(prefKeys);

            // Round-robin selection: Pick 1 from each preference until we have 3 or run out
            let addedCount = 0;
            let i = 0;
            const maxSelection = 3;

            // Flatten preferred quizzes using round-robin
            while (selectedQuizzes.length < maxSelection && prefKeys.length > 0) {
                let foundInPass = false;
                for (const key of prefKeys) {
                    if (selectedQuizzes.length >= maxSelection) break;

                    const bucket = preferredMap[key];
                    if (bucket.length > 0) {
                        selectedQuizzes.push(bucket.pop()!);
                        foundInPass = true;
                    }
                }
                // If we went through all prefs and found nothing, break
                if (!foundInPass) break;
            }

            // Shuffle the others bucket
            shuffle(others);

            // Fill remainder with others
            while (selectedQuizzes.length < maxSelection && others.length > 0) {
                selectedQuizzes.push(others.shift()!);
            }

            // Append remaining others for full list (if needed by UI later, though we only show 3)
            // We combine our top picks + any remaining quizzes to ensure 'View All' still has content
            const remainingPreferred = Object.values(preferredMap).flat();
            shuffle(remainingPreferred);

            return [...selectedQuizzes, ...remainingPreferred, ...others];
        };

        const fetchQuizzes = async () => {
            try {
                // Check cache first for instant loading
                const { default: cacheService } = await import('@/lib/cacheService');
                const cacheKey = 'explore_quizzes';
                const cachedData: any = cacheService.get(cacheKey);

                if (isMounted && cachedData && cachedData.quizzes) {
                    const sorted = sortQuizzes(cachedData.quizzes, user?.preferences?.interests);
                    setQuizzes(sorted);
                    setLoadingQuizzes(false);
                }

                // Fetch fresh data in background
                const response = await api.getQuizList();
                const data: any = response;

                if (isMounted && data.quizzes && Array.isArray(data.quizzes)) {
                    const sorted = sortQuizzes(data.quizzes, user?.preferences?.interests);
                    setQuizzes(sorted);
                    cacheService.set(cacheKey, data);
                }
            } catch (error) {
                console.error('Failed to fetch quizzes:', error);
            } finally {
                if (isMounted) {
                    setLoadingQuizzes(false);
                }
            }
        };

        fetchQuizzes();

        return () => {
            isMounted = false;
        };
    }, [user?.preferences?.interests]); // Re-run if preferences change

    return (
        <Card className="border-border/50 card-shadow bg-background/60">
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <PlayCircle className="w-5 h-5 text-primary" />
                        <Link to={"/categories"} className="hover:underline hover:text-primary transition-colors">
                            Explore Quizzes
                        </Link>
                    </div>
                    <Link to="/categories#explore" className="text-xs text-muted-foreground hover:text-primary transition-colors font-normal">
                        View All
                    </Link>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {loadingQuizzes ? (
                    <div className="text-center py-8 text-muted-foreground">Loading quizzes...</div>
                ) : quizzes.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">No quizzes available yet. Create your first quiz!</div>
                ) : (
                    quizzes.slice(0, 3).map((quiz, index) => (
                        <QuizCard
                            key={quiz.quiz_id || index}
                            quiz_id={quiz.quiz_id}
                            title={quiz.title}
                            // Fallback Logic: Topic > Category > Default
                            topic={quiz.topic || quiz.category || 'General Knowledge'}
                            // Fallback Logic: Type > Default
                            level={quiz.level}
                            num_questions={quiz.num_questions}
                            duration_seconds={quiz.duration_seconds}
                            created_at={quiz.created_at}
                            language={quiz.language}
                        />
                    ))
                )}
            </CardContent>
        </Card>
    );
};