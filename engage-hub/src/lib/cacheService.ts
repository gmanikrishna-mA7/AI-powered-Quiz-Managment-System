/**
 * Cache Service with Stale-While-Revalidate Pattern
 * Provides instant page loads by serving cached data while fetching fresh data in background
 */

interface CacheEntry<T> {
    data: T;
    timestamp: number;
    expiresAt: number;
}

const CACHE_PREFIX = 'quiz_cache_';
const DEFAULT_TTL = 2 * 60 * 1000; // 2 minutes

class CacheService {
    /**
     * Get cached data if available and not expired
     */
    get<T>(key: string): T | null {
        try {
            const cached = localStorage.getItem(CACHE_PREFIX + key);
            if (!cached) return null;

            const entry: CacheEntry<T> = JSON.parse(cached);

            // Return data even if expired (stale-while-revalidate)
            return entry.data;
        } catch (error) {
            console.error('Cache read error:', error);
            return null;
        }
    }

    /**
     * Check if cached data is still fresh (not expired)
     */
    isFresh(key: string): boolean {
        try {
            const cached = localStorage.getItem(CACHE_PREFIX + key);
            if (!cached) return false;

            const entry: CacheEntry<any> = JSON.parse(cached);
            return Date.now() < entry.expiresAt;
        } catch {
            return false;
        }
    }

    /**
     * Set cache entry with TTL
     */
    set<T>(key: string, data: T, ttl: number = DEFAULT_TTL): void {
        try {
            const entry: CacheEntry<T> = {
                data,
                timestamp: Date.now(),
                expiresAt: Date.now() + ttl
            };
            localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
        } catch (error) {
            console.error('Cache write error:', error);
        }
    }

    /**
     * Remove specific cache entry
     */
    remove(key: string): void {
        try {
            localStorage.removeItem(CACHE_PREFIX + key);
        } catch (error) {
            console.error('Cache remove error:', error);
        }
    }

    /**
     * Clear all quiz cache entries
     */
    clearAll(): void {
        try {
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.startsWith(CACHE_PREFIX)) {
                    localStorage.removeItem(key);
                }
            });
        } catch (error) {
            console.error('Cache clear error:', error);
        }
    }

    /**
     * Fetch with cache (stale-while-revalidate pattern)
     * Returns cached data immediately if available, then fetches fresh data in background
     */
    async fetchWithCache<T>(
        key: string,
        fetchFn: () => Promise<T>,
        onUpdate?: (data: T) => void
    ): Promise<T> {
        // Return cached data immediately if available
        const cached = this.get<T>(key);
        const isFresh = this.isFresh(key);

        // If we have fresh cache, return it without fetching
        if (cached && isFresh) {
            return cached;
        }

        // If we have stale cache, return it but fetch in background
        if (cached && !isFresh) {
            // Return cached data immediately
            setTimeout(async () => {
                try {
                    const fresh = await fetchFn();
                    this.set(key, fresh);
                    if (onUpdate) onUpdate(fresh);
                } catch (error) {
                    console.error('Background fetch failed:', error);
                }
            }, 0);
            return cached;
        }

        // No cache available, fetch now
        const fresh = await fetchFn();
        this.set(key, fresh);
        return fresh;
    }
}

export const cacheService = new CacheService();
export default cacheService;
