
import { generateContentWithRetry } from '../gemini/client';
import type { MarketTarget } from '../../types';

interface LogicChain {
    primaryKeyword: string;
    cause: string;
    effect: string;
    beneficiarySector: string;
    relatedTickers: string[];
    logicStrength: number;
    alphaGap: number;
}

class MarketLogicService {

    public async analyzeMarketStructure(market: MarketTarget): Promise<{ report: string; chains: LogicChain[] }> {
        console.log(`[MarketLogic] 📡 Running Insight Radar for ${market}...`);

        // S-Class Logic Prompt (Adapted from User Request)
        const prompt = `
        You are an elite Financial Research AI (Sell-side + Trader hybrid) covering the ${market} market.
        
        [Objective]
        Analyze the current market structure using the "Hunter" methodology:
        1. Identify "Growing Keywords" (Institutional Interest).
        2. Map these keywords to "Beneficiary Sectors".
        3. Select top "Related Companies" (Tickers).

        [Context]
        Target Market: ${market === 'KR' ? 'South Korea (KOSPI/KOSDAQ)' : 'USA (NYSE/NASDAQ)'}
        Language: Korean (한국어) - Output must be in formatted Markdown tables.

        [Output Format]
        Return a SINGLE JSON object with two fields:
        1. "report_markdown": A simplified version of the "S-Class Report" containing:
           - Section A: Top 5 Keywords (Table: Keyword | Context | Growth)
           - Section B: Top 3 Logic Chains (Table: Keyword -> Sector -> Ticker)
           - Section C: 3-Line Executive Summary at the top.
           - Use Emojis (🇰🇷/🇺🇸) explicitly.
        
        2. "structured_data": An array of LogicChain objects for the trading engine:
           [
             {
               "primaryKeyword": "string",
               "cause": "Event/Trend",
               "effect": "Market Impact",
               "beneficiarySector": "Sector Name",
               "relatedTickers": ["Ticker1", "Ticker2"],
               "logicStrength": 80-100,
               "alphaGap": 0-100
             }
           ]

        [Constraints]
        - Do NOT invent data. If unsure, assume generic valid sectors.
        - Tickers: ${market === 'KR' ? 'Use 6-digit codes (e.g., 005930)' : 'Use Ticker symbols (e.g., NVDA)'}.
        - Focus on: AI, Semiconductors, Bio, Defense, Energy.
        `;

        try {
            const result = await generateContentWithRetry({
                model: 'gemini-1.5-flash',
                contents: prompt
            });

            const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
            const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const data = JSON.parse(cleanText);

            return {
                report: data.report_markdown || "보고서 생성 실패",
                chains: data.structured_data || []
            };

        } catch (error) {
            console.error('[MarketLogic] Analysis Failed:', error);
            // Fallback
            return {
                report: "⚠️ 시장 분석 데이터를 가져오는데 실패했습니다.",
                chains: []
            };
        }
    }
}

export const marketLogicService = new MarketLogicService();

export async function generateAndSave(market: MarketTarget) {
    const { report, chains } = await marketLogicService.analyzeMarketStructure(market);
    if (chains && chains.length > 0) {
        // Dynamic import to avoid circular dependency issues if any
        const { telegramService } = await import('../telegramService');
        await telegramService.sendMorningBriefing(market, chains, report);
    }
}
