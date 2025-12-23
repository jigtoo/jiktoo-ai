import { loadCache, saveCache } from './storageUtils';

const MARKET_PRIORITY = ['NAS', 'NYS', 'AMS'];

export async function selfHealMarketCode(ticker: string, failedExcd: string) {
    try {
        const cache = await loadCache();

        // Normalize ticker
        const t = ticker.trim().toUpperCase();

        const current = cache[t] || failedExcd;
        // Find next exchange in priority list
        // If current is not in list (e.g. empty), start from 0 (NAS) -> 1 (NYS)
        let idx = MARKET_PRIORITY.indexOf(current);
        if (idx === -1) idx = 0;

        const next = MARKET_PRIORITY[(idx + 1) % MARKET_PRIORITY.length];

        // Update cache
        cache[t] = next;
        await saveCache(cache);

        console.log(`[MarketResolver][Heal] ${t}: ${current} -> ${next} (auto re-map)`);

        return next;
    } catch (err: any) {
        console.error(`[MarketResolver][Heal] Failed for ${ticker}`, err.message);
        return failedExcd; // Fallback to failed one to avoid crash, though likely to fail again
    }
}
