
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { QuizCard } from "@/components/QuizCard";
import { Input } from "@/components/ui/input";
import { Search, Loader2, Compass } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface Quiz {
    quiz_id: string;
    title: string;
    category?: string;
    topic?: string;
    quiz_type?: string;
    level: string;
    num_questions: number;
    duration_seconds: number;
    created_at?: string;
    language?: string;
}

const Explore = () => {
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [filteredQuizzes, setFilteredQuizzes] = useState<Quiz[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    const { user } = useAuth();

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

            // Round-robin selection: Pick 1 from each preference until exhausted
            // For the EXPLORE page, we want to show MANY quizzes, not just top 3.
            // So we will just cycle through entirely until all preferred are added.

            const maxSelection = allQuizzes.length; // No limit effectively

            while (selectedQuizzes.length < maxSelection && prefKeys.length > 0) {
                let foundInPass = false;
                for (const key of prefKeys) {
                    const bucket = preferredMap[key];
                    if (bucket.length > 0) {
                        selectedQuizzes.push(bucket.pop()!);
                        foundInPass = true;
                    }
                }
                if (!foundInPass) break;
            }

            // Shuffle the others bucket
            shuffle(others);

            // Combine: Preferred (sorted round-robin) + Others (randomized)
            return [...selectedQuizzes, ...others];
        };

        const fetchQuizzes = async () => {
            try {
                setLoading(true);
                // Check cache first
                const { default: cacheService } = await import('@/lib/cacheService');
                const cacheKey = 'explore_quizzes';
                const cachedData: any = cacheService.get(cacheKey);

                if (isMounted && cachedData && cachedData.quizzes) {
                    const sorted = sortQuizzes(cachedData.quizzes, user?.preferences?.interests);
                    setQuizzes(sorted);
                    setFilteredQuizzes(sorted);
                    setLoading(false);
                }

                // Fetch fresh data
                const response = await api.getQuizList();
                const data: any = response;

                if (isMounted && data.quizzes && Array.isArray(data.quizzes)) {
                    const sorted = sortQuizzes(data.quizzes, user?.preferences?.interests);
                    setQuizzes(sorted);
                    setFilteredQuizzes(sorted); // Initial filter matches all
                    cacheService.set(cacheKey, data);
                }
            } catch (error) {
                console.error('Failed to fetch quizzes:', error);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchQuizzes();

        return () => { isMounted = false; };
    }, [user?.preferences?.interests]);

    useEffect(() => {
        if (!searchTerm) {
            setFilteredQuizzes(quizzes);
            return;
        }

        const lowerTerm = searchTerm.toLowerCase();
        const filtered = quizzes.filter(quiz =>
            quiz.title.toLowerCase().includes(lowerTerm) ||
            (quiz.topic || quiz.category || '').toLowerCase().includes(lowerTerm)
        );
        setFilteredQuizzes(filtered);
    }, [searchTerm, quizzes]);

    return (
        <div className="container max-w-6xl pt-24 py-8 px-4 md:px-6 space-y-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent flex items-center gap-2">
                        <Compass className="w-8 h-8 text-primary" />
                        Explore Quizzes
                    </h1>
                    <p className="text-muted-foreground">
                        Discover new challenges and test your knowledge.
                    </p>
                </div>

                <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search quizzes..."
                        className="pl-9"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {loading ? (
                <div className="flex h-64 items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : filteredQuizzes.length === 0 ? (
                <div className="text-center py-12 border border-dashed rounded-lg bg-muted/10">
                    <Compass className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
                    <p className="text-lg font-medium text-muted-foreground">No quizzes found.</p>
                    {searchTerm && (
                        <p className="text-sm text-muted-foreground mt-1">
                            Try adjusting your search terms.
                        </p>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                    {filteredQuizzes.map((quiz, index) => (
                        <QuizCard
                            key={quiz.quiz_id || index}
                            quiz_id={quiz.quiz_id}
                            title={quiz.title}
                            topic={quiz.topic || quiz.category || 'General Knowledge'}
                            level={quiz.level}
                            num_questions={quiz.num_questions}
                            duration_seconds={quiz.duration_seconds}
                            created_at={quiz.created_at}
                            language={quiz.language}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default Explore;
