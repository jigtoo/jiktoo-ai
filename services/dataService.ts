// services/dataService.ts
import type { MarketTarget } from '../types';
import { IS_KIS_PROXY_ENABLED, KIS_PROXY_URL, API_GATEWAY_URL } from '../config';
import { kisRateLimiter } from './utils/rateLimiter';

const USE_MOCK_DATA = false;

export function isMockDataEnabled(): boolean {
    return USE_MOCK_DATA;
}

// ... (Mock logic omitted for brevity, keeping structure)

async function _fetchPriceViaKisProxy(ticker: string, marketTarget: MarketTarget): Promise<{ price: number; changeRate: number; volume: number; timestamp: string }> {
    // ... existing logic ...
    const stockCode = ticker.replace(/\.(KS|KQ)$/i, '');
    const data = await kisRateLimiter.execute(async () => {
        const response = await fetch(`${KIS_PROXY_URL}/rt-snapshot?ticker=${stockCode}&market=${marketTarget}&fields=quote`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        if (!response.ok) throw new Error(`KIS Proxy returned ${response.status}`);
        return await response.json();
    });

    const priceValue = data.quote?.stck_prpr || data.quote?.last;
    if (!priceValue) throw new Error('No price data');
    const price = typeof priceValue === 'string' ? parseFloat(priceValue.replace(/[,+\-]/g, '')) : priceValue;
    const changeRate = typeof (data.quote?.prdy_ctrt || data.quote?.chg_rate) === 'string' ? parseFloat(data.quote?.prdy_ctrt) : (data.quote?.prdy_ctrt || 0);
    const volume = typeof (data.quote?.acml_vol || data.quote?.volume) === 'string' ? parseInt(data.quote?.acml_vol.replace(/[,]/g, '')) : (data.quote?.acml_vol || 0);

    return { price, changeRate, volume, timestamp: 'Real-time (KIS)' };
}

export async function fetchLatestPrice(ticker: string, stockName: string, marketTarget: MarketTarget): Promise<{ price: number, changeRate: number, volume: number, timestamp: string }> {
    if (isMockDataEnabled()) return { price: 10000, changeRate: 1.5, volume: 500000, timestamp: 'Mock' };

    // ... validation logic ...

    // [Validation] Block invalid tickers immediately
    if (!ticker || ticker === '없음' || ticker === 'null' || ticker === 'undefined' || ticker.length < 2) {
        // console.warn(`[Data] Blocked invalid ticker request: ${ticker}`); // Reduce noise
        return { price: 0, changeRate: 0, volume: 0, timestamp: 'Invalid' };
    }

    try {
        if (IS_KIS_PROXY_ENABLED) return await _fetchPriceViaKisProxy(ticker, marketTarget);
    } catch (error) {
        // [ENHANCED] More visible error logging
        console.error(`[Data] ❌ Price fetch FAILED for ${ticker} (${stockName}):`, error);
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

export async function fetchDailyCandles(ticker: string, marketTarget: MarketTarget, period: number = 20): Promise<OHLCV[]> {
    return fetchCandles(ticker, 'day', period);
}

/**
 * Universal Candle Fetcher (Supports Minute/Day)
 * Uses API Gateway (Polygon) or KIS Proxy fallback
 */
export async function fetchCandles(ticker: string, timeframe: 'day' | '60' | '1', count: number = 20): Promise<OHLCV[]> {
    // [Validation] Block invalid tickers immediately
    if (!ticker || ticker === '없음' || ticker === 'null' || ticker === 'NA' || ticker === 'undefined' || ticker.length < 2) {
        // console.warn(`[Data] Blocked invalid ticker request: ${ticker}`);
        return [];
    }

    const timeframeMap: any = { 'day': '1/day', '60': '60/minute', '1': '1/minute' };
    const polygonTimeframe = timeframeMap[timeframe];

    // Calculate Date Range
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (timeframe === 'day' ? count * 1.5 : 5)); // Buffer
    const startStr = startDate.toISOString().split('T')[0];

    // 1. Try API Gateway (Polygon) for US/KR High Quality Data
    try {
        // const API_GATEWAY_URL = 'http://localhost:3000/api/gateway'; // Import from config
        // Fix: Exclude KR tickers (6 digits) explicitly preventing them from hitting Polygon
        if (API_GATEWAY_URL && !ticker.endsWith('.KS') && !ticker.endsWith('.KQ') && !/^\d{6}$/.test(ticker) && !['EV', 'AI'].includes(ticker)) {
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
                console.warn(`[Data] API Gateway returned ${res.status}. Switching to fallback.`);
            }
        }
    } catch (e) {
        console.warn('[Data] API Gateway failed, falling back to KIS/Mock', e);
    }

    // 2. Fallback to KIS Proxy (Daily Only) - Essential for KR
    // Route if: Day timeframe OR .KS/.KQ suffix OR 6-digit numeric ticker (KR)
    if (timeframe === 'day' || ticker.endsWith('.KS') || ticker.endsWith('.KQ') || /^\d{6}$/.test(ticker)) {
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
            }
        } catch (e) { }
    }

    // 3. Fallback to Synthetic Mock Data (Last Resort for Time Machine)
    // If we return [], Time Machine fails. Better to return a random walk for simulation testing.
    // [ENHANCED] Critical warning for synthetic data usage
    console.error(`🚨 [CRITICAL] All providers failed for ${ticker}. Using SYNTHETIC data - Trading signals UNRELIABLE!`);
    console.error(`[Data] ⚠️ This data is FAKE and should NOT be used for real trading decisions!`);

    // TODO: Send Telegram alert (requires telegramService import)
    // telegramService.sendMessage({ title: '⚠️ 데이터 오류', body: `${ticker} 실시간 데이터 조회 실패` });

    return generateSyntheticCandles(count);
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
    // ... existing logic ...
    return { price: 2500, changeRate: 0, name: 'KOSPI' };
}