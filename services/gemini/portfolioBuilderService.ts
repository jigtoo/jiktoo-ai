
import { generateContentWithRetry } from './client';
import { SchemaType } from '@google/generative-ai';
import type { Megatrend } from './megatrendService';
import type { InvestmentTheme } from './themeMapperService';
import type { ThemeStock } from './stockDiscoveryService';

export interface PortfolioStock {
    ticker: string;
    stockName: string;
    weight: string; // e.g. "5%"
    rationale: string;
    buyingStrategy: string; // Dynamic strategy (e.g. "분할 매수", "즉시 매수")
}

export interface LongTermPortfolio {
    trendId: string;
    description: string;
    stocks: PortfolioStock[];
    totalWeight: string; // e.g. "20%" of total asset
}

export const buildLongTermPortfolio = async (
    trend: Megatrend,
    themes: InvestmentTheme[],
    stocks: ThemeStock[],
    riskProfile: 'conservative' | 'moderate' | 'aggressive'
): Promise<LongTermPortfolio> => {

    // Logic to select top stocks (Improvement: use AI to select from pool)
    const selectedStocks = stocks.slice(0, 5);

    // Construct Input for AI
    const stockListText = selectedStocks.map(s =>
        `- ${s.stockName} (${s.ticker}): ${s.rationale} (Feature: ${s.aiConfidence}%)`
    ).join('\n');

    const prompt = `
    User Risk Profile: ${riskProfile.toUpperCase()}
    Selected Megatrend: ${trend.title}
    Candidate Stocks:
    ${stockListText}

    **Task:**
    Create an optimal "Long-Term Investment Portfolio" containing 3-5 stocks from the candidates.

    **Instructions:**
    1. **Weighting:** tailored to Risk Profile (Aggressive = concentrated, Conservative = diversified).
    2. **Buying Strategy (CRITICAL):**
       - Analyze the stock's nature (Growth vs Value, Volatility).
       - Provide specific instruction in Korean:
         - "3개월 분할 매수 (DCA)"
         - "조정 시 매수 (10% 하락)"
         - "즉시 진입 (강력한 모멘텀)"
         - "박스권 하단 매수"
    3. **Rationale:** Brief logic for selection and weight.

    **Output Language:** Korean (한국어)

    Response MUST be a JSON object with schema:
    {
        "description": "Portfolio Strategy Summary",
        "totalWeight": "Recommended % of total assets (e.g. '15%')",
        "stocks": [
            { "ticker": "...", "stockName": "...", "weight": "...", "rationale": "...", "buyingStrategy": "..." }
        ]
    }
    `;

    try {
        const response = await generateContentWithRetry({
            model: 'gemini-2.0-flash-001',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: SchemaType.OBJECT,
                    properties: {
                        description: { type: SchemaType.STRING },
                        totalWeight: { type: SchemaType.STRING },
                        stocks: {
                            type: SchemaType.ARRAY,
                            items: {
                                type: SchemaType.OBJECT,
                                properties: {
                                    ticker: { type: SchemaType.STRING },
                                    stockName: { type: SchemaType.STRING },
                                    weight: { type: SchemaType.STRING },
                                    rationale: { type: SchemaType.STRING },
                                    buyingStrategy: { type: SchemaType.STRING }
                                },
                                required: ['ticker', 'stockName', 'weight', 'rationale', 'buyingStrategy']
                            }
                        }
                    },
                    required: ['description', 'totalWeight', 'stocks']
                }
            }
        });

        const result = JSON.parse(response.text || '{}');
        return {
            trendId: trend.id,
            description: result.description,
            stocks: result.stocks,
            totalWeight: result.totalWeight
        };

    } catch (error) {
        console.error('Portfolio Build Failed:', error);
        // Fallback
        return {
            trendId: trend.id,
            description: "인공지능 포트폴리오 생성 실패 (기본값 제공)",
            stocks: selectedStocks.map(s => ({
                ticker: s.ticker,
                stockName: s.stockName,
                weight: "5%",
                rationale: s.rationale,
                buyingStrategy: "분할 매수 (기본)"
            })),
            totalWeight: "10%"
        };
    }
};
