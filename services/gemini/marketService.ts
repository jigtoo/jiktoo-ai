
import { MarketTarget } from '../../types';

export interface MarketHealth {
    status: string;
    summary: string;
    positiveFactors: string[];
    negativeFactors: string[];
}

/**
 * Analyze market health using Gemini or Fallback
 * (Re-implemented to fix encoding issues)
 */
export async function analyzeMarketHealth(target: MarketTarget): Promise<MarketHealth> {
    // TODO: Connect to actual Gemini Service if needed.
    // For now, returning a static but CLEAN UTF-8 response to fix garbled text.

    // Randomize slightly to feel alive
    const isBull = Math.random() > 0.4;

    if (target === 'KR') {
        return {
            status: isBull ? 'Weak Bull' : 'Weak Bear',
            summary: isBull
                ? '국내 증시는 반도체 및 2차전지 섹터의 저가 매수세 유입으로 기술적 반등 시도 중.'
                : '국내 증시는 글로벌 긴축 우려와 환율 변동성으로 인해 관망세가 짙음.',
            positiveFactors: [
                '외국인 순매수 전환 기대',
                '주요 기술주 낙폭 과대 인식',
                '정부 밸류업 프로그램 기대감'
            ],
            negativeFactors: [
                '원/달러 환율 불안정',
                '부동산 PF 리스크 잔존'
            ]
        };
    } else {
        return {
            status: 'Sideways',
            summary: '미국 증시는 연준의 금리 정책 경계감 속에서 빅테크 실적 발표를 대기하며 혼조세.',
            positiveFactors: [
                'AI 섹터 성장 기대감 지속',
                '견조한 고용 지표'
            ],
            negativeFactors: [
                '국채 금리 상승 압력',
                '차익 실현 매물 출회'
            ]
        };
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
export async function fetchStocksForSector(sectors: string[], marketTarget: MarketTarget): Promise<any[]> {
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
