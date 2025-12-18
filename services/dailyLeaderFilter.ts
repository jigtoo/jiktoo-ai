// services/dailyLeaderFilter.ts
/**
 * Daily Leader Filter Service
 * Applies technical analysis criteria to filter stocks for daily leader selection
 */

import { fetchDailyCandles } from './dataService';
import { analyzeDailyLeaderCriteria, type DailyLeaderCriteria } from './technicalAnalysis';
import type { MarketTarget } from '../types';

export interface DailyLeaderStock {
    ticker: string;
    stockName: string;
    marketCap?: number;
    tradingValue?: number;
    criteria: DailyLeaderCriteria;
    meetsAllCriteria: boolean;
    score: number;
}

/**
 * Filter stocks based on daily leader criteria
 * 
 * Criteria:
 * 1. 거래대금 상위 100 (external filter)
 * 2. 시가총액 1,000억 이상 (external filter)
 * 3. 당일 시가 대비 +5% 이상
 * 4. MACD > Signal
 * 5. 20일 이평선 위
 * 6. 120일 거래량 대비 유의미
 */
export async function filterDailyLeaders(
    tickers: string[],
    market: MarketTarget,
    options: {
        minScore?: number;          // Minimum score (0-100), default: 75
        requireAllCriteria?: boolean; // Require all 4 criteria, default: false
    } = {}
): Promise<DailyLeaderStock[]> {
    const { minScore = 75, requireAllCriteria = false } = options;

    const results: DailyLeaderStock[] = [];

    console.log(`[Daily Leader Filter] Analyzing ${tickers.length} stocks...`);

    for (const ticker of tickers) {
        try {
            // Fetch 250 days of data for comprehensive analysis
            const candles = await fetchDailyCandles(ticker, market, 250);

            if (candles.length < 120) {
                console.warn(`[Daily Leader Filter] ${ticker}: Insufficient data (${candles.length} days)`);
                continue;
            }

            // Analyze daily leader criteria
            const criteria = analyzeDailyLeaderCriteria(candles);

            // Apply filters
            if (requireAllCriteria && !criteria.meetsAllCriteria) {
                continue;
            }

            if (criteria.score < minScore) {
                continue;
            }

            results.push({
                ticker,
                stockName: '', // Will be filled by caller
                criteria,
                meetsAllCriteria: criteria.meetsAllCriteria,
                score: criteria.score
            });

            console.log(`[Daily Leader Filter] ${ticker}: Score ${criteria.score}/100 ${criteria.meetsAllCriteria ? '✅' : ''}`);

        } catch (error) {
            console.error(`[Daily Leader Filter] Error analyzing ${ticker}:`, error);
        }
    }

    // Sort by score (highest first)
    results.sort((a, b) => b.score - a.score);

    console.log(`[Daily Leader Filter] ✅ Found ${results.length} daily leaders`);

    return results;
}

/**
 * Get daily leader summary for a single stock
 */
export async function getDailyLeaderAnalysis(
    ticker: string,
    market: MarketTarget
): Promise<DailyLeaderStock | null> {
    try {
        const candles = await fetchDailyCandles(ticker, market, 250);

        if (candles.length < 120) {
            return null;
        }

        const criteria = analyzeDailyLeaderCriteria(candles);

        return {
            ticker,
            stockName: '',
            criteria,
            meetsAllCriteria: criteria.meetsAllCriteria,
            score: criteria.score
        };
    } catch (error) {
        console.error(`[Daily Leader Filter] Error analyzing ${ticker}:`, error);
        return null;
    }
}

/**
 * Format daily leader criteria for display
 */
export function formatDailyLeaderCriteria(criteria: DailyLeaderCriteria): string {
    const parts: string[] = [];

    if (criteria.macd?.isBullish) {
        parts.push(`MACD 상승 (${criteria.macd.macd.toFixed(2)} > ${criteria.macd.signal.toFixed(2)})`);
    }

    if (criteria.movingAverage?.above20MA) {
        parts.push(`20일선 위 (현재가: ${criteria.movingAverage.ma20.toFixed(0)})`);
    }

    if (criteria.intradayChange.isUp5Percent) {
        parts.push(`당일 +${criteria.intradayChange.changePercent.toFixed(1)}%`);
    }

    if (criteria.volumeSignificance.isSignificant) {
        parts.push(`거래량 ${criteria.volumeSignificance.volumeRatio.toFixed(1)}배`);
    }

    return parts.join(' | ');
}
