import { loadCache, saveCache } from './storageUtils';

const getApiKey = () => {
    // Frontend (Vite)
    if (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.VITE_POLYGON_API_KEY) {
        return (import.meta as any).env.VITE_POLYGON_API_KEY;
    }
    // Backend (Node)
    if (typeof process !== 'undefined' && process.env) {
        return process.env.VITE_POLYGON_API_KEY || process.env.POLYGON_API_KEY;
    }
    return '';
};
const POLYGON_API_KEY = getApiKey();

/**
 * Fetch exchange info from Polygon for a specific ticker
 */
export async function fetchExchangeFromPolygon(ticker: string): Promise<'NAS' | 'NYS' | 'AMS'> {
    try {
        if (!POLYGON_API_KEY || POLYGON_API_KEY === 'YOUR_KEY_HERE') {
            // console.debug('[MarketResolver] No Polygon Key, skipping fetch.');
            return 'NAS';
        }

        const url = `https://api.polygon.io/v3/reference/tickers/${ticker}?apiKey=${POLYGON_API_KEY}`;
        const res = await fetch(url);
        const data: any = await res.json();

        if (!data || !data.results) throw new Error('No data returned');

        const primaryExchange = (data.results.primary_exchange || '').toUpperCase();

        // Polygon -> KIS EXCD mapping
        if (primaryExchange.includes('NASDAQ')) return 'NAS';
        if (primaryExchange.includes('NYSE')) return 'NYS';
        if (primaryExchange.includes('AMEX')) return 'AMS';
        return 'NAS'; // fallback
    } catch (err: any) {
        // console.error(`[MarketResolver] Polygon lookup failed for ${ticker}:`, err.message);
        return 'NAS';
    }
}

/**
 * Update cache after synchronization
 */
export async function updateMarketMap(ticker: string): Promise<'NAS' | 'NYS' | 'AMS'> {
    const excd = await fetchExchangeFromPolygon(ticker);

    let cache = await loadCache();
    cache[ticker.toUpperCase()] = excd;
    await saveCache(cache);
    console.log(`[MarketResolver] Sync: ${ticker} -> ${excd}`);
    return excd;
}
