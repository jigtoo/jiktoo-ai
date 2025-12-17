// services/EcosService.ts
/**
 * 한국은행 경제통계시스템 (ECOS) API 서비스
 * - 기준금리, GDP, CPI, 수출입, 환율 등 거시경제 지표 제공
 * - kis-proxy를 통해 CORS 우회
 */

const ECOS_PROXY_URL = 'http://127.0.0.1:8080/ecos';

interface EcosResponse {
    StatisticSearch: {
        row: Array<{
            STAT_CODE: string;
            STAT_NAME: string;
            ITEM_CODE1: string;
            ITEM_NAME1: string;
            DATA_VALUE: string;
            TIME: string;
        }>;
    };
}

export interface MacroIndicators {
    baseRate: number | null; // 기준금리
    gdpGrowth: number | null; // GDP 성장률
    cpi: number | null; // 소비자물가지수
    exportGrowth: number | null; // 수출 증감률
    usdKrw: number | null; // 환율
    lastUpdated: string;
}

class EcosService {
    /**
     * 기준금리 조회
     */
    async getBaseRate(): Promise<number | null> {
        try {
            const url = `${ECOS_PROXY_URL}?stat=722Y001&freq=M&startDate=202401&endDate=202412&code=0101000`;
            const response = await fetch(url);
            const data: EcosResponse = await response.json();

            if (data.StatisticSearch?.row?.[0]) {
                return parseFloat(data.StatisticSearch.row[0].DATA_VALUE);
            }
            return null;
        } catch (error) {
            console.error('[ECOS] 기준금리 조회 실패:', error);
            return null;
        }
    }

    /**
     * GDP 성장률 조회 (전년 동기 대비)
     */
    async getGDPGrowth(): Promise<number | null> {
        try {
            const url = `${ECOS_PROXY_URL}?stat=200Y001&freq=Q&startDate=202301&endDate=202312&code=10101`;
            const response = await fetch(url);
            const data: EcosResponse = await response.json();

            if (data.StatisticSearch?.row?.[0]) {
                return parseFloat(data.StatisticSearch.row[0].DATA_VALUE);
            }
            return null;
        } catch (error) {
            console.error('[ECOS] GDP 성장률 조회 실패:', error);
            return null;
        }
    }

    /**
     * 소비자물가지수 (CPI) 조회
     */
    async getCPI(): Promise<number | null> {
        try {
            const url = `${ECOS_PROXY_URL}?stat=901Y009&freq=M&startDate=202301&endDate=202312&code=0`;
            const response = await fetch(url);
            const data: EcosResponse = await response.json();

            if (data.StatisticSearch?.row?.[0]) {
                return parseFloat(data.StatisticSearch.row[0].DATA_VALUE);
            }
            return null;
        } catch (error) {
            console.error('[ECOS] CPI 조회 실패:', error);
            return null;
        }
    }

    /**
     * 수출 증감률 조회 (전년 동기 대비)
     */
    async getExportGrowth(): Promise<number | null> {
        try {
            const url = `${ECOS_PROXY_URL}?stat=403Y003&freq=M&startDate=202301&endDate=202312&code=I`;
            const response = await fetch(url);
            const data: EcosResponse = await response.json();

            if (data.StatisticSearch?.row?.[0]) {
                return parseFloat(data.StatisticSearch.row[0].DATA_VALUE);
            }
            return null;
        } catch (error) {
            console.error('[ECOS] 수출 증감률 조회 실패:', error);
            return null;
        }
    }

    /**
     * 환율 (USD/KRW) 조회
     */
    async getUsdKrw(): Promise<number | null> {
        try {
            const url = `${ECOS_PROXY_URL}?stat=731Y001&freq=D&startDate=202401&endDate=202412&code=0000001`;
            const response = await fetch(url);
            const data: EcosResponse = await response.json();

            if (data.StatisticSearch?.row?.[0]) {
                return parseFloat(data.StatisticSearch.row[0].DATA_VALUE);
            }
            return null;
        } catch (error) {
            console.error('[ECOS] 환율 조회 실패:', error);
            return null;
        }
    }

    /**
     * 모든 거시경제 지표 한 번에 조회
     */
    async getAllIndicators(): Promise<MacroIndicators> {
        console.log('[ECOS] 📊 거시경제 지표 조회 중...');

        const [baseRate, gdpGrowth, cpi, exportGrowth, usdKrw] = await Promise.all([
            this.getBaseRate(),
            this.getGDPGrowth(),
            this.getCPI(),
            this.getExportGrowth(),
            this.getUsdKrw()
        ]);

        const indicators: MacroIndicators = {
            baseRate,
            gdpGrowth,
            cpi,
            exportGrowth,
            usdKrw,
            lastUpdated: new Date().toISOString()
        };

        console.log('[ECOS] ✅ 거시경제 지표:', indicators);
        return indicators;
    }

    /**
     * 시장 강세/약세 판단
     */
    interpretMarketSentiment(indicators: MacroIndicators): {
        sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
        score: number;
        reasons: string[];
    } {
        let score = 50; // 중립 기준
        const reasons: string[] = [];

        // 1. 기준금리 (낮을수록 호재)
        if (indicators.baseRate !== null) {
            if (indicators.baseRate < 2.5) {
                score += 10;
                reasons.push(`낮은 기준금리 (${indicators.baseRate}%)`);
            } else if (indicators.baseRate > 3.5) {
                score -= 10;
                reasons.push(`높은 기준금리 (${indicators.baseRate}%)`);
            }
        }

        // 2. GDP 성장률 (높을수록 호재)
        if (indicators.gdpGrowth !== null) {
            if (indicators.gdpGrowth > 3.0) {
                score += 15;
                reasons.push(`강한 경제성장 (${indicators.gdpGrowth}%)`);
            } else if (indicators.gdpGrowth < 1.0) {
                score -= 15;
                reasons.push(`경제성장 둔화 (${indicators.gdpGrowth}%)`);
            }
        }

        // 3. 수출 증감률 (한국 경제 핵심)
        if (indicators.exportGrowth !== null) {
            if (indicators.exportGrowth > 5.0) {
                score += 15;
                reasons.push(`수출 급증 (+${indicators.exportGrowth}%)`);
            } else if (indicators.exportGrowth < -5.0) {
                score -= 15;
                reasons.push(`수출 감소 (${indicators.exportGrowth}%)`);
            }
        }

        // 4. CPI (인플레이션 - 너무 높거나 낮으면 악재)
        if (indicators.cpi !== null) {
            if (indicators.cpi > 4.0) {
                score -= 10;
                reasons.push(`고인플레이션 (${indicators.cpi}%)`);
            } else if (indicators.cpi < 1.0) {
                score -= 5;
                reasons.push(`디플레이션 우려 (${indicators.cpi}%)`);
            }
        }

        let sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
        if (score >= 60) sentiment = 'BULLISH';
        else if (score <= 40) sentiment = 'BEARISH';
        else sentiment = 'NEUTRAL';

        return { sentiment, score, reasons };
    }
}

export const ecosService = new EcosService();
