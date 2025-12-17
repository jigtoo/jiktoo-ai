// services/cache/megatrendCache.ts
interface CacheEntry<T> {
    data: T;
    timestamp: number;
    expiresAt: number;
}

class MegatrendCache {
    private cache: Map<string, CacheEntry<any>> = new Map();

    // Cache durations (in milliseconds)
    private readonly CACHE_DURATIONS = {
        megatrends: 30 * 24 * 60 * 60 * 1000,  // 30 days
        themes: 90 * 24 * 60 * 60 * 1000,       // 90 days
        stocks: 7 * 24 * 60 * 60 * 1000         // 7 days
    };

    /**
     * Get cached data if valid
     */
    get<T>(key: string): T | null {
        const entry = this.cache.get(key);

        if (!entry) {
            console.log(`[MegatrendCache] Cache miss: ${key}`);
            return null;
        }

        const now = Date.now();
        if (now > entry.expiresAt) {
            console.log(`[MegatrendCache] Cache expired: ${key}`);
            this.cache.delete(key);
            return null;
        }

        console.log(`[MegatrendCache] Cache hit: ${key}`);
        return entry.data as T;
    }

    /**
     * Set cache data with automatic expiration
     */
    set<T>(key: string, data: T, type: 'megatrends' | 'themes' | 'stocks'): void {
        const now = Date.now();
        const duration = this.CACHE_DURATIONS[type];

        const entry: CacheEntry<T> = {
            data,
            timestamp: now,
            expiresAt: now + duration
        };

        this.cache.set(key, entry);
        console.log(`[MegatrendCache] Cached: ${key} (expires in ${duration / 1000 / 60 / 60}h)`);
    }

    /**
     * Invalidate specific cache entry
     */
    invalidate(key: string): void {
        this.cache.delete(key);
        console.log(`[MegatrendCache] Invalidated: ${key}`);
    }

    /**
     * Invalidate all cache entries matching a pattern
     */
    invalidatePattern(pattern: string): void {
        const regex = new RegExp(pattern);
        let count = 0;

        for (const key of this.cache.keys()) {
            if (regex.test(key)) {
                this.cache.delete(key);
                count++;
            }
        }

        console.log(`[MegatrendCache] Invalidated ${count} entries matching: ${pattern}`);
    }

    /**
     * Clear all cache
     */
    clear(): void {
        const size = this.cache.size;
        this.cache.clear();
        console.log(`[MegatrendCache] Cleared ${size} entries`);
    }

    /**
     * Get cache statistics
     */
    getStats(): { totalEntries: number; byType: Record<string, number> } {
        const stats = {
            totalEntries: this.cache.size,
            byType: {
                megatrends: 0,
                themes: 0,
                stocks: 0
            }
        };

        for (const key of this.cache.keys()) {
            if (key.startsWith('megatrend_')) stats.byType.megatrends++;
            else if (key.startsWith('theme_')) stats.byType.themes++;
            else if (key.startsWith('stock_')) stats.byType.stocks++;
        }

        return stats;
    }

    /**
     * Clean up expired entries
     */
    cleanup(): void {
        const now = Date.now();
        let cleaned = 0;

        for (const [key, entry] of this.cache.entries()) {
            if (now > entry.expiresAt) {
                this.cache.delete(key);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            console.log(`[MegatrendCache] Cleaned up ${cleaned} expired entries`);
        }
    }
}

export const megatrendCache = new MegatrendCache();

// Auto-cleanup every hour
setInterval(() => {
    megatrendCache.cleanup();
}, 60 * 60 * 1000);
