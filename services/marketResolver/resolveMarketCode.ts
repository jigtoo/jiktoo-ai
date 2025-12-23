import { updateMarketMap } from './syncMarketMap';
import { selfHealMarketCode } from './selfHealMarket';
import { loadCache, saveCache } from './storageUtils';
import { getKnownExchange } from '../utils/marketExchangeMap';
import { supabase } from '../supabaseClient';

let MARKET_MAP: Record<string, string> = {};
let isCacheLoaded = false;

async function ensureCacheLoaded() {
    if (!isCacheLoaded) {
        MARKET_MAP = await loadCache();
        isCacheLoaded = true;
        console.log(`[MarketResolver] Loaded ${Object.keys(MARKET_MAP).length} tickers from LocalStorage`);
    }
}

/**
 * 3-Tier Exchange Code Resolution Strategy:
 * 1. Hardcoded Map (150+ major tickers) - Instant, no API calls
 * 2. Supabase Cache (learned tickers) - Fast, persistent
 * 3. Polygon API (new tickers) - Slow, rate-limited, last resort
 */
export async function resolveMarketCode(ticker: string, heal = false): Promise<'NAS' | 'NYS' | 'AMS'> {
    await ensureCacheLoaded();
    const t = ticker.trim().toUpperCase();

    // Tier 1: Check hardcoded map first (instant, no API call)
    const hardcoded = getKnownExchange(t);
    if (hardcoded && !heal) {
        MARKET_MAP[t] = hardcoded; // Update memory cache too
        return hardcoded as 'NAS' | 'NYS' | 'AMS';
    }

    // Tier 2: Check memory cache (from LocalStorage)
    if (MARKET_MAP[t] && !heal) {
        return MARKET_MAP[t] as 'NAS' | 'NYS' | 'AMS';
    }

    // Tier 2.5: Check Supabase persistent cache
    if (!heal) {
        try {
            const { data } = await supabase!
                .from('ticker_exchange_cache')
                .select('exchange_code')
                .eq('ticker', t)
                .single();

            if (data && (data as any).exchange_code) {
                const exchangeCode = (data as any).exchange_code;
                console.log(`[MarketResolver] Cache hit from Supabase: ${t} -> ${exchangeCode}`);
                MARKET_MAP[t] = exchangeCode;
                saveCache(MARKET_MAP); // Update LocalStorage
                return exchangeCode as 'NAS' | 'NYS' | 'AMS';
            }
        } catch (err) {
            // Cache miss, continue to Polygon
        }
    }

    // Tier 3: Polygon API (last resort, rate-limited)
    if (!heal) {
        console.log(`[MarketResolver] Cache miss for ${t}, querying Polygon API...`);
        const excd = await updateMarketMap(t);
        MARKET_MAP[t] = excd;

        // Save to both LocalStorage and Supabase for future use
        saveCache(MARKET_MAP);
        await saveToSupabaseCache(t, excd);

        return excd;
    } else {
        return MARKET_MAP[t] as any || 'NAS';
    }
}

/**
 * Save learned exchange code to Supabase for persistent caching
 */
async function saveToSupabaseCache(ticker: string, exchangeCode: string) {
    try {
        await supabase!
            .from('ticker_exchange_cache')
            .upsert({
                ticker: ticker.toUpperCase(),
                exchange_code: exchangeCode,
                market: 'US',
                last_verified: new Date().toISOString()
            } as any, {
                onConflict: 'ticker'
            });
        console.log(`[MarketResolver] Saved to Supabase cache: ${ticker} -> ${exchangeCode}`);
    } catch (err) {
        console.warn(`[MarketResolver] Failed to save to Supabase cache:`, err);
    }
}

/**
 * Called when 400 error occurs
 */
export async function healMarketCode(ticker: string, failedExcd: string): Promise<'NAS' | 'NYS' | 'AMS'> {
    // Ensure cache loaded to get current state
    await ensureCacheLoaded();
    const next = await selfHealMarketCode(ticker, failedExcd);
    MARKET_MAP[ticker.toUpperCase()] = next;

    // Update Supabase cache with corrected exchange code
    await saveToSupabaseCache(ticker, next);

    return next as 'NAS' | 'NYS' | 'AMS';
}

