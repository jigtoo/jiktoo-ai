// services/fmpService.ts
import { KIS_PROXY_URL } from '../config';

export interface FMPFinancials {
    symbol: string;
    date: string;
    revenue: number;
    netIncome: number;
    eps: number;
    pe: number;
    pb: number;
    roe: number;
    debtToEquity: number;
}

/**
 * FMP APIKRW해 ?무?표 ?이KRW 조회?니KRW
 * @param ticker 미국 주식 ?커
 */
export async function fetchFMPFinancials(ticker: string): Promise<FMPFinancials | null> {
    try {
        // Key Metrics (PER, PBR, ROE KRW
        const metricsResponse = await fetch(
            `${KIS_PROXY_URL}/api-gateway?service=fmp&endpoint=v3/key-metrics/${ticker}`,
            {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            }
        );

        if (!metricsResponse.ok) {
            throw new Error(`FMP API error: ${metricsResponse.status}`);
        }

        const metricsData = await metricsResponse.json();

        if (!metricsData || metricsData.length === 0) {
            return null;
        }

        const latest = metricsData[0];

        return {
            symbol: ticker,
            date: latest.date,
            revenue: latest.revenue || 0,
            netIncome: latest.netIncome || 0,
            eps: latest.eps || 0,
            pe: latest.peRatio || 0,
            pb: latest.pbRatio || 0,
            roe: latest.roe || 0,
            debtToEquity: latest.debtToEquity || 0
        };
    } catch (error) {
        console.error('[FMP Service] Error:', error);
        return null;
    }
}

/**
 * KRW멘KRW?수 계산 (0-100)
 */
export function calculateFundamentalScore(financials: FMPFinancials): number {
    let score = 50; // 기본 ?수

    // PER KRW (KRW?록 좋음, 15 ?하 가KRW
    if (financials.pe > 0 && financials.pe < 15) score += 15;
    else if (financials.pe >= 15 && financials.pe < 25) score += 5;
    else if (financials.pe >= 25) score -= 10;

    // PBR KRW (KRW?록 좋음, 1.5 ?하 가KRW
    if (financials.pb > 0 && financials.pb < 1.5) score += 15;
    else if (financials.pb >= 1.5 && financials.pb < 3) score += 5;
    else if (financials.pb >= 3) score -= 10;

    // ROE KRW (?을?록 좋음, 15% ?상 가KRW
    if (financials.roe > 0.15) score += 15;
    else if (financials.roe > 0.10) score += 5;
    else if (financials.roe < 0.05) score -= 10;

    // 부채비KRWKRW (KRW?록 좋음, 1.0 ?하 가KRW
    if (financials.debtToEquity < 1.0) score += 10;
    else if (financials.debtToEquity > 2.0) score -= 10;

    return Math.max(0, Math.min(100, score));
}
