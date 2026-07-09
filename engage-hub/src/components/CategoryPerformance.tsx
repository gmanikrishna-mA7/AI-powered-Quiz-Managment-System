import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { api } from "@/lib/api";

const CACHE_KEY = 'categoryPerformance_cache';
const CACHE_TIMESTAMP_KEY = 'categoryPerformance_timestamp';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const CategoryPerformance = () => {
    const [categoryPerformance, setCategoryPerformance] = useState<any[]>([]);
    const [loadingCategories, setLoadingCategories] = useState(true);

    // Fetch category performance with caching
    useEffect(() => {
        let isMounted = true;

        const loadCachedData = () => {
            try {
                const cached = localStorage.getItem(CACHE_KEY);
                const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);

                if (cached && timestamp) {
                    const cachedData = JSON.parse(cached);
                    const cacheAge = Date.now() - parseInt(timestamp);

                    // Load cached data immediately
                    if (isMounted) {
                        setCategoryPerformance(Array.isArray(cachedData) ? cachedData : []);
                        setLoadingCategories(false);
                    }

                    // Return cache age to determine if we need to revalidate
                    return cacheAge;
                }
            } catch (error) {
                console.error('Failed to load cached category performance:', error);
            }
            return null;
        };

        const fetchAndCacheData = async () => {
            try {
                const response = await api.getCategoryPerformance();
                const data: any = response;

                console.log('CategoryPerformance API Response:', data); // Debug log

                // API returns { success: true, data: { categories: [...] } }
                if (data.success && data.data?.categories) {
                    const categories = Array.isArray(data.data.categories) ? data.data.categories : [];

                    // Update cache
                    localStorage.setItem(CACHE_KEY, JSON.stringify(categories));
                    localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());

                    // Update state
                    if (isMounted) {
                        setCategoryPerformance(categories);
                    }
                } else if (isMounted) {
                    setCategoryPerformance([]);
                }
            } catch (error) {
                console.error('Failed to fetch category performance:', error);
                if (isMounted) {
                    setCategoryPerformance([]);
                }
            } finally {
                if (isMounted) {
                    setLoadingCategories(false);
                }
            }
        };

        // Load cached data first (stale-while-revalidate)
        const cacheAge = loadCachedData();

        // Always fetch fresh data in the background
        // If cache exists and is fresh, this updates silently
        // If cache is stale or missing, this provides the data
        fetchAndCacheData();

        return () => {
            isMounted = false;
        };
    }, []);

    return (
        <Card className="bg-background/60 border-border/50 card-shadow">
            <CardHeader>
                <CardTitle>Your Performance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {loadingCategories ? (
                    <div className="text-center py-4 text-muted-foreground">Loading...</div>
                ) : categoryPerformance.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">No quizzes attempted yet</div>
                ) : (
                    categoryPerformance.map((cat, index) => (
                        <div key={index}>
                            <div className="flex justify-between mb-2">
                                <span className="text-sm text-muted-foreground">{cat.category}</span>
                                <span className="text-sm font-semibold">{cat.average_score}%</span>
                            </div>
                            <Progress value={cat.average_score} className="h-2" />
                        </div>
                    ))
                )}
            </CardContent>
        </Card>
    );
};
