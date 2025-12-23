
import { MarketTarget } from '../../types';

export interface MarketHealth {
    status: string;
    summary: string;
    positiveFactors: string[];
    negativeFactors: string[];
}

/**
 * Analyze market health using Gemini
 */
export async function analyzeMarketHealth(target: MarketTarget): Promise<MarketHealth> {
    try {
        const { callGemini } = await import('./client');

        const prompt = `
            You are a professional market analyst for the ${target === 'KR' ? 'South Korean (KOSPI/KOSDAQ)' : 'US (S&P500/Nasdaq)'} market.
            Analyze the current market health based on recent general trends (as of late 2025).
            
            **CRITICAL: ALL TEXT MUST BE IN KOREAN (한국어)**
            - Summary: Korean only
            - Positive Factors: Korean only
            - Negative Factors: Korean only
            
            Return a JSON object with the following structure:
            {
                "status": "Bull", "Weak Bull", "Sideways", "Weak Bear", or "Bear",
                "summary": "시장 상황을 한 문장으로 요약 (반드시 한국어)",
                "positiveFactors": ["긍정 요인 1 (한국어)", "긍정 요인 2 (한국어)", ...],
                "negativeFactors": ["부정 요인 1 (한국어)", "부정 요인 2 (한국어)", ...]
            }
            
            Focus on macro trends like interest rates, exchange rates, and sector rotations.
            Respond ONLY with the JSON object. Do NOT use English for factors.
        `;

        const response = await callGemini(prompt);

        // Validate response is not empty
        if (!response || response.trim().length === 0) {
            throw new Error('Empty response from Gemini API');
        }

        // Clean up response if it has markdown blocks
        const cleanJson = response.replace(/```json|```/g, '').trim();

        // Validate cleaned JSON is not empty
        if (!cleanJson) {
            throw new Error('Response became empty after cleaning markdown');
        }

        const data = JSON.parse(cleanJson);

        return {
            status: data.status,
            summary: data.summary,
            positiveFactors: data.positiveFactors || [],
            negativeFactors: data.negativeFactors || []
        };

    } catch (error) {
        console.error('[analyzeMarketHealth] AI Analysis failed, using stable fallback:', error);

        // Return a STABLE fallback instead of random
        if (target === 'KR') {
            return {
                status: 'Sideways',
                summary: '국내 증시는 글로벌 매크로 불확실성 속에서 박스권 흐름을 보이고 있음.',
                positiveFactors: ['외국인 수급 개선 기대', '반도체 업황 회복'],
                negativeFactors: ['환율 변동성 확대', '내수 침체 우려']
            };
        } else {
            return {
                status: 'Sideways',
                summary: '미국 증시는 금리 정책 방향성을 확인하며 혼조세를 기록 중.',
                positiveFactors: ['빅테크 실적 견조', '인플레이션 둔화 추세'],
                negativeFactors: ['고금리 장기화 우려', '밸류에이션 부담']
            };
        }
    }
}

/**
 * Alias for analyzeMarketHealth to satisfy useDiscovery.ts import
 */
export const fetchMarketHealth = analyzeMarketHealth;

/**
 * Mock Institutional Flow Analysis for KR market
 */
export async function fetchInstitutionalFlowAnalysis(date?: string): Promise<any> {
    // Mock data matching the expected structure
    return {
        date: date || new Date().toISOString().split('T')[0],
        analysis: "기관 투자자들은 전기전자 및 운수장비 업종을 중심으로 순매수를 확대하고 있습니다.",
        topSectors: [
            { sectorName: '전기전자', netBuyAmount: 5000000000 },
            { sectorName: '운수장비', netBuyAmount: 3000000000 },
            { sectorName: '서비스업', netBuyAmount: 1500000000 }
        ],
        marketSentiment: 'Neutral'
    };
}

/**
 * Mock Fetch Stocks for Sector
 */
export async function fetchStocksForSector(_sectors: string[], marketTarget: MarketTarget): Promise<any[]> {
    // Return dummy stocks for the requested sectors
    if (marketTarget === 'KR') {
        return [
            { ticker: '005930', stockName: '삼성전자', sector: '전기전자' },
            { ticker: '000660', stockName: 'SK하이닉스', sector: '전기전자' },
            { ticker: '005380', stockName: '현대차', sector: '운수장비' }
        ];
    }
    return [];
}
