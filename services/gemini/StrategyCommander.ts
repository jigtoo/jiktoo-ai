import { generateContentWithRetry } from './client';
import { selectModelByTask } from './modelSelector';

export interface CommanderDecision {
    marketStatus: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'VOLATILE';
    focusSectors: string[];
    scannersToActivate: string[];
    tradingMode: 'AGGRESSIVE' | 'SELECTIVE' | 'DEFENSIVE';
    rationale: string;
}

class StrategyCommander {
    private modelName: string;

    constructor() {
        // Use intelligent model selection for strategy decisions (complex task)
        this.modelName = selectModelByTask('complex');
    }

    public async decideStrategy(marketData: any, newsHeadlines: string[], recentLessons: string[] = []): Promise<CommanderDecision> {
        try {
            const prompt = `
                Your task is to analyze the following market intelligence derived from a professional telegram channel.
                
                You are 'Jiktoo', an elite AI autonomous trader.
                Analyze the current market situation and decide the immediate trading strategy.

                [Current Market Data]
                ${JSON.stringify(marketData, null, 2)}

                [Recent News Headlines & Intelligence]
                ${newsHeadlines.join('\n')}

                [Lessons from Recent Trades (Feedback Loop)]
                ${recentLessons.length > 0 ? recentLessons.join('\n') : 'No recent lessons available.'}

                IMPORTANT: Reflect on the lessons above. If a strategy failed recently in similar conditions, avoid it. If it succeeded, reinforce it.

                Based on this, determine the market phase, which sectors to focus on, and WHICH TOOLS (Scanners) to deploy right now.
                
                Available Tools:
                - EAGLE_EYE: Detect institutional/foreign supply (Smart Money). Use when market is trending.
                - VOLUME_SPIKE: Detect sudden volume explosion. Use for momentum trading.
                - NEW_HIGH: Detect 52-week highs. Use in strong Bull markets.
                - VALUE_PIVOT: Find undervalued stocks bouncing back. Use in Sideways/Bear markets (Bottom fishing).
                - CHART_PATTERN: Find technical patterns (Cup&Handle, etc.). Use for precise entry.
                - NEWS_RADAR: Analyze breaking news. Use when volatility is high due to external events.

                Respond strictly in JSON format.
                **CRITICAL: The 'rationale' field MUST be written in KOREAN (?�국??.**

                {
                    "marketStatus": "BULLISH" | "BEARISH" | "NEUTRAL" | "VOLATILE",
                    "focusSectors": ["Sector1", "Sector2"],
                    "scannersToActivate": ["SCANNER1", "SCANNER2"],
                    "tradingMode": "AGGRESSIVE" | "SELECTIVE" | "DEFENSIVE",
                    "rationale": "?�장 ?�황�?과거 교훈??반영???�세???�단 근거 (?�국?�로 ?�성)"
                }
            `;

            const response = await generateContentWithRetry({
                model: this.modelName,
                contents: prompt
            });

            const text = response.text || '';
            const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const decision: CommanderDecision = JSON.parse(jsonStr);

            return decision;

        } catch (error) {
            console.error('[StrategyCommander] Failed to make decision:', error);
            // Fallback safe decision
            return {
                marketStatus: 'NEUTRAL',
                focusSectors: [],
                scannersToActivate: ['VOLUME_SPIKE'],
                tradingMode: 'SELECTIVE',
                rationale: 'AI Commander failed to respond. Reverting to safety mode.'
            };
        }
    }

    public async analyzeTrade(tradeData: any): Promise<{ analysis: string; lesson: string; score: number }> {
        try {
            // Use moderate complexity model for trade analysis
            const modelName = selectModelByTask('moderate');

            const prompt = `
                You are 'Jiktoo' (직투), an expert trading coach. Analyze this completed trade and provide a post-mortem.

                [Trade Details]
                Stock: ${tradeData.stockName} (${tradeData.ticker})
                Strategy: ${tradeData.strategyUsed}
                Entry: ${tradeData.entryPrice} on ${tradeData.entryDate}
                Exit: ${tradeData.exitPrice} on ${tradeData.exitDate}
                Result: ${tradeData.pnlPercent.toFixed(2)}% (${tradeData.pnlAmount})
                Market Condition: ${tradeData.marketCondition}

                1. Analyze why this trade succeeded or failed (MUST be in Korean).
                2. Extract a key lesson for the future (MUST be in Korean, concise).
                3. Rate this trade from 0 to 100 based on execution and strategy adherence (not just profit).

                Respond strictly in JSON:
                {
                    "analysis": "?�세 분석 ?�용 (?�국??...",
                    "lesson": "??문장 ?�심 교훈 (?�국??...",
                    "score": 85
                }
            `;

            const response = await generateContentWithRetry({
                model: modelName,
                contents: prompt
            });

            const text = response.text || '';

            const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(jsonStr);

        } catch (error) {
            console.error('[StrategyCommander] Failed to analyze trade:', error);
            return { analysis: 'Analysis failed.', lesson: 'N/A', score: 0 };
        }
    }
}

export const strategyCommander = new StrategyCommander();
