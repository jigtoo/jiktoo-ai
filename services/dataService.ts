// services/dataService.ts
import type { MarketTarget } from '../types';
import { IS_KIS_PROXY_ENABLED, KIS_PROXY_URL, API_GATEWAY_URL } from '../config';
import { kisRateLimiter } from './utils/rateLimiter';

const USE_MOCK_DATA = false;

export function isMockDataEnabled(): boolean {
    return USE_MOCK_DATA;
}

// ... (Mock logic omitted for brevity, keeping structure)

import { resolveMarketCode, healMarketCode } from './marketResolver/resolveMarketCode';

async function _fetchPriceViaKisProxy(ticker: string, marketTarget: MarketTarget): Promise<{ price: number; changeRate: number; volume: number; timestamp: string; isFallback?: boolean }> {
    const stockCode = ticker.trim().toUpperCase().replace(/\.(KS|KQ)$/i, '');

    // === KR MARKET STRATEGY ===
    if (marketTarget === 'KR') {
        const data = await kisRateLimiter.execute(async () => {
            const url = `${KIS_PROXY_URL}/rt-snapshot?ticker=${stockCode}&market=KR&fields=quote`;
            const response = await fetch(url.replace(/ /g, ''), {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`KIS Proxy returned ${response.status}: ${errText.substring(0, 100)}`);
            }
            return await response.json();
        });

        // Map KR Response
        const price = parseFloat(data.quote?.stck_prpr || '0');
        const changeRate = parseFloat(data.quote?.prdy_ctrt || '0');
        const volume = parseInt(data.quote?.acml_vol || '0');

        return { price, changeRate, volume, timestamp: 'Real-time (KR)' };
    }

    // === US MARKET STRATEGY (Self-Healing) ===
    let excd = await resolveMarketCode(stockCode);
    let lastError: any;

    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            const data = await kisRateLimiter.execute(async () => {
                // Ensure excd is set
                const currentExcd = excd || 'NAS';
                const url = `${KIS_PROXY_URL}/rt-snapshot?ticker=${stockCode}&market=US&fields=quote&excd=${currentExcd}`;

                const response = await fetch(url, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' }
                });

                if (!response.ok) {
                    const errText = await response.text();
                    // Detect "Stock not found" or 400 -> Trigger Self-Healing
                    if (response.status === 400 || errText.includes('Stock not found')) {
                        throw new Error(`STOCK_NOT_FOUND: ${errText}`);
                    }
                    throw new Error(`KIS Proxy returned ${response.status}: ${errText.substring(0, 100)}`);
                }
                return await response.json();
            });

            // If we get here, Success!
            const price = parseFloat(data.quote?.stck_prpr || data.quote?.last || '0');
            const changeRate = parseFloat(data.quote?.prdy_ctrt || data.quote?.chg_rate || '0');
            const volume = parseInt(data.quote?.acml_vol || data.quote?.volume || '0');
            const isFallback = data.quote?.is_fallback || false;

            if (price === 0 && changeRate === 0) {
                console.error(`[Data] ❌ Zero Data for ${stockCode} (US/${excd}):`, JSON.stringify(data));
                throw new Error('Zero Data Returned');
            }

            return { price, changeRate, volume, timestamp: `Real-time (US/${excd})`, isFallback };

        } catch (e: any) {
            lastError = e;
            const isStockNotFound = e.message.includes('STOCK_NOT_FOUND') || e.message.includes('400') || e.message.includes('Stock not found');

            if (isStockNotFound) {
                // Silent self-healing - only log if all attempts fail
                // console.log(`[Data] 🔍 ${stockCode} not in ${excd}, trying next exchange...`);
                excd = await healMarketCode(stockCode, excd);
                // Loop continues with new excd
            } else {
                // Only log non-404 errors (real problems like network issues)
                console.error(`[Data] ❌ Error fetching ${stockCode} (Attempt ${attempt + 1}):`, e.message);
                if (attempt === 2) throw e;
            }
        }
    }

    throw lastError || new Error(`All exchange attempts failed for ${stockCode}`);
}

export async function fetchLatestPrice(ticker: string, _stockName: string, marketTarget: MarketTarget): Promise<{ price: number, changeRate: number, volume: number, timestamp: string, isFallback?: boolean }> {
    if (isMockDataEnabled()) return { price: 10000, changeRate: 1.5, volume: 500000, timestamp: 'Mock' };

    // ... validation logic ...

    // [Validation] Block invalid tickers immediately
    if (!ticker || ticker === '없음' || ticker === 'null' || ticker === 'undefined' || ticker.length < 2) {
        return { price: 0, changeRate: 0, volume: 0, timestamp: 'Invalid' };
    }

    // [Spam Protection] Block generic/fake tickers
    const blockedTickers = ['ABC', 'XYZ', 'GHI', 'JKL', 'LMN', 'DEF', 'TEST', 'SAMPLE', 'N/A', 'UNKNOWN'];
    if (blockedTickers.includes(ticker.toUpperCase())) {
        return { price: 0, changeRate: 0, volume: 0, timestamp: 'Blocked' };
    }


    // [Legacy Fix] Redirect old tickers
    if (ticker === 'RDS.A' || ticker === 'RDS-A') ticker = 'SHEL';

    try {
        if (IS_KIS_PROXY_ENABLED) return await _fetchPriceViaKisProxy(ticker, marketTarget);
    } catch (error: any) {
        // Only log if it's a real error (not just stock not found)
        if (!error.message?.includes('STOCK_NOT_FOUND')) {
            console.error(`[Data] ❌ ${ticker}: ${error.message?.substring(0, 100)}`);
        }
        return { price: 0, changeRate: 0, volume: 0, timestamp: 'FETCH_FAILED' };
    }
    return { price: 0, changeRate: 0, volume: 0, timestamp: 'FETCH_FAILED' };
}

export const _fetchLatestPrice = fetchLatestPrice;

export interface OHLCV {
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

export async function fetchDailyCandles(ticker: string, _marketTarget: MarketTarget, period: number = 20): Promise<OHLCV[]> {
    return fetchCandles(ticker, 'day', period);
}

/**
 * Universal Candle Fetcher (Supports Minute/Day)
 * Uses API Gateway (Polygon) or KIS Proxy fallback
 */
export async function fetchCandles(ticker: string, timeframe: 'day' | '60' | '1', count: number = 20): Promise<OHLCV[]> {
    // [Validation] Block invalid tickers immediately
    if (!ticker || ['없음', 'null', 'NA', 'undefined', 'NYS', 'NYSE', 'NASDAQ', 'AMEX', 'OTC'].includes(ticker) || ticker.length < 2) {
        // console.warn(`[Data] Blocked invalid ticker request: ${ticker}`);
        return [];
    }

    // [Legacy Fix] Redirect old tickers
    if (ticker === 'RDS.A' || ticker === 'RDS-A') ticker = 'SHEL';

    const timeframeMap: any = { 'day': '1/day', '60': '60/minute', '1': '1/minute' };
    const polygonTimeframe = timeframeMap[timeframe];

    // Calculate Date Range
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (timeframe === 'day' ? count * 1.5 : 5)); // Buffer
    const startStr = startDate.toISOString().split('T')[0];

    // [PRIORITY FIX] Try KIS Proxy FIRST for KR tickers (Polygon Gateway has 500 errors)
    const isKRTicker = ticker.endsWith('.KS') || ticker.endsWith('.KQ') || ticker.endsWith(' KS') || ticker.endsWith(' KQ') || /^\d{6}$/.test(ticker);

    // 1. KIS Proxy for KR tickers (Daily Only)
    if (timeframe === 'day' && isKRTicker) {
        try {
            const kisUrl = `http://localhost:8080/daily-price?ticker=${ticker}&period=${count}`;
            const res = await fetch(kisUrl);
            if (res.ok) {
                const data = await res.json();
                if (data.candles && data.candles.length > 0) {
                    console.log(`[Data] ✅ KIS Proxy Success for ${ticker}`);
                    return data.candles;
                }
            }
        } catch (e) {
            console.warn(`[Data] KIS Proxy failed for ${ticker}, trying Polygon...`);
        }
    }

    // 2. Try API Gateway (Polygon) for US tickers only
    if (!isKRTicker && API_GATEWAY_URL && !['EV', 'AI'].includes(ticker)) {
        try {
            const endpoint = `/v2/aggs/ticker/${ticker}/range/${polygonTimeframe}/${startStr}/${endDate}?adjusted=true&sort=desc&limit=${count}`;
            const res = await fetch(`${API_GATEWAY_URL}?service=polygon&endpoint=${encodeURIComponent(endpoint)}`);

            if (res.ok) {
                const data = await res.json();
                if (data.results) {
                    return data.results.map((bar: any) => ({
                        date: new Date(bar.t).toISOString(),
                        open: bar.o,
                        high: bar.h,
                        low: bar.l,
                        close: bar.c,
                        volume: bar.v
                    })).reverse();
                }
            } else {
                const errText = await res.text().catch(() => 'No Body');
                if (errText.includes('429') || res.status === 429) {
                    console.warn(`[Data] Rate Limit Hit (429) via Gateway for ${ticker}.`);
                } else {
                    console.warn(`[Data] API Gateway returned ${res.status} for ${ticker}: ${errText.substring(0, 100)}.`);
                }
            }
        } catch (e) {
            console.warn(`[Data] API Gateway Error for ${ticker}:`, e);
        }
    }

    // 2. Fallback to KIS Proxy (Daily Only) - Essential for KR
    // Route if: Day timeframe AND (.KS/.KQ suffix OR 6-digit numeric ticker)
    const isKRTickerFallback = ticker.endsWith('.KS') || ticker.endsWith('.KQ') || ticker.endsWith(' KS') || ticker.endsWith(' KQ') || /^\d{6}$/.test(ticker);

    if (timeframe === 'day' && isKRTickerFallback) {
        try {
            // [Sanitization] Ensure strict 6-digit code for KIS Proxy
            // Remove any spaces, dots, or letters (like ' KS')
            const stockCode = ticker.replace(/[^0-9]/g, '');

            if (stockCode.length !== 6) throw new Error('Invalid KIS Ticker Format');

            const response = await fetch(`${KIS_PROXY_URL}/daily-price?ticker=${stockCode}&market=KR&period=${count}`);
            if (response.ok) {
                const data = await response.json();
                // [FIX] KIS API returns data.output2, not data.output
                if (Array.isArray(data.output2)) {
                    return data.output2.map((item: any) => ({
                        date: item.stck_bsop_date,
                        open: parseFloat(item.stck_oprc),
                        high: parseFloat(item.stck_hgpr),
                        low: parseFloat(item.stck_lwpr),
                        close: parseFloat(item.stck_clpr),
                        volume: parseInt(item.acml_vol)
                    })).reverse();
                }
            } else {
                console.warn(`[Data] KIS Proxy daily-price failed: ${response.status} ${response.statusText}`);
            }
        } catch (e) {
            // Silent - KIS Proxy fallback is expected when proxy is unavailable
            // console.log(`[Data] KIS Proxy fallback exception:`, e);
        }
    }

    // 3. Fallback to Synthetic Mock Data (DISABLED FOR PRODUCTION SAFETY)
    // Only allow if explicitly enabled via config (e.g. for Time Machine tests)
    if (isMockDataEnabled()) {
        console.warn(`[Data] ⚠️ Using SYNTHETIC data for ${ticker} (Mock Mode Enabled)`);
        return generateSyntheticCandles(count);
    }

    // Default: FAIL SAFE
    return [];
}

/**
 * Fetch Daily Candles for Market Index (KOSPI/KOSDAQ/SPX)
 * Dedicated function for Market Regime 2.0 Trend Analysis
 */
export async function fetchMarketIndexCandles(marketTarget: MarketTarget, count: number = 60): Promise<OHLCV[]> {
    try {
        if (marketTarget === 'KR') {
            const indexTicker = '0001'; // KOSPI
            // Attempt to use a dedicated endpoint for Index History
            // Pattern follows /daily-price but for index
            const url = `${KIS_PROXY_URL}/daily-index-price?ticker=${indexTicker}&market=KR&period=${count}`;

            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                // Assuming KIS Index response structure (output2) similar to stock
                if (Array.isArray(data.output2)) {
                    return data.output2.map((item: any) => ({
                        date: item.stck_bsop_date,
                        open: parseFloat(item.stck_oprc),
                        high: parseFloat(item.stck_hgpr),
                        low: parseFloat(item.stck_lwpr),
                        close: parseFloat(item.stck_clpr),
                        volume: parseInt(item.acml_vol)
                    })).reverse();
                }
            } else {
                console.warn(`[Data] Index Candle Fetch Failed: ${response.status}`);
            }
        }

        // If KR fails or US (Mock for now or API Gateway if supported)
        if (marketTarget === 'US') {
            // Placeholder: US Index Candles not fully connected yet
            // Return empty to fallback to "Momentum Only" mode in Regime Service
            return [];
        }
    } catch (e) {
        console.error('[Data] fetchMarketIndexCandles Error:', e);
    }
    return [];
}

function generateSyntheticCandles(count: number): OHLCV[] {
    console.warn(`[Data] 🎲 Generating ${count} SYNTHETIC candles (FAKE DATA)`);
    const data: OHLCV[] = [];
    let price = 50000; // Start at 50k KRW
    const now = new Date();

    for (let i = 0; i < count; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() - (count - i));

        const change = (Math.random() - 0.48) * 0.05; // Slight upward drift
        const open = price;
        const close = price * (1 + change);
        const high = Math.max(open, close) * (1 + Math.random() * 0.01);
        const low = Math.min(open, close) * (1 - Math.random() * 0.01);
        const volume = Math.floor(Math.random() * 1000000) + 100000;

        data.push({
            date: date.toISOString().split('T')[0], // YYYY-MM-DD
            open: Math.round(open),
            high: Math.round(high),
            low: Math.round(low),
            close: Math.round(close),
            volume: volume
        });

        price = close;
    }

    return data;
}

export async function fetchMarketIndex(marketTarget: MarketTarget): Promise<{ price: number; changeRate: number; name: string }> {
    try {
        if (marketTarget === 'KR') {
            // Fetch KOSPI Index (0001)
            let price = 0;
            let changeRate = 0;

            try {
                const data = await kisRateLimiter.execute(async () => {
                    const url = `${KIS_PROXY_URL}/index-price?ticker=0001&market=KR`;
                    const response = await fetch(url, {
                        method: 'GET',
                        headers: { 'Content-Type': 'application/json' }
                    });
                    if (!response.ok) throw new Error(`KIS Proxy Index Fetch Failed: ${response.status}`);
                    return await response.json();
                });

                // Parse response - handle both real-time and closing price
                console.log('[fetchMarketIndex] 🔍 Full KIS API Response:', JSON.stringify(data, null, 2));

                price = parseFloat(data.bstp_nmix_prpr || data.stck_prpr || '0');
                changeRate = parseFloat(data.prdy_ctrt || data.prdy_vrss_sign || '0');

                console.log('[fetchMarketIndex] Parsed values:', {
                    price,
                    changeRate,
                    available_fields: Object.keys(data)
                });
            } catch (kisError) {
                console.error('[fetchMarketIndex] ❌ KIS API failed:', kisError);
                // Don't throw - use fallback instead
                price = 2500; // Approximate KOSPI value
                changeRate = 0;
                console.warn('[fetchMarketIndex] Using fallback KOSPI value');
            }

            // Validate data
            if (price === 0) {
                console.warn('[fetchMarketIndex] ⚠️ KIS API returned price=0, using fallback');
                price = 2500; // Approximate KOSPI value
                changeRate = 0;
            }

            console.log(`[fetchMarketIndex] KOSPI: ${price} (${changeRate}%)`);
            return { price, changeRate, name: 'KOSPI' };
        } else {
            // Basic S&P 500 stub for now (can be expanded later)
            // Ideally we'd fetch SPX or similar if available via proxy
            return { price: 4500, changeRate: 0.5, name: 'S&P 500' };
        }
    } catch (error) {
        console.error('[fetchMarketIndex] Error:', error);
        return { price: 0, changeRate: 0, name: marketTarget === 'KR' ? 'KOSPI' : 'S&P 500' };
    }
}