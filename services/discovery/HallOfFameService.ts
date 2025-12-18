import { supabase } from '../supabaseClient';
import { generateContentWithRetry } from '../gemini/client';
import { MarketTarget, ScannerResult } from '../../types';

/**
 * [Discovery Engine] HallOfFameService
 * 
 * "Active Scanner" that finds stocks matching past legendary success patterns.
 * It's not just a trophy case; it's a Coach that says "Find me another one like this!"
 */

export class HallOfFameService {

    /**
     * Finds stocks that look like past winners.
     */
    public async runHallOfFameScan(marketTarget: MarketTarget): Promise<ScannerResult[]> {
        console.log('[HallOfFame] 🏆 Consulting the legends...');

        // 1. Fetch Top 3 Best Performers from Hall of Fame
        const { data: legends, error } = await supabase
            .from('ai_growth_journals')
            .select('*')
            .eq('type', 'SUCCESS')
            .order('reflection', { ascending: false }) // Assuming reflection or some score field exists, actually need to parse PnL
            .limit(3);

        if (!legends || legends.length === 0) {
            console.log('[HallOfFame] No legends found yet. Skipping.');
            return [];
        }

        // Construct a prompt based on these legends
        const legendDescriptions = legends.map(l => `${l.title}: ${l.reflection}`).join('\n');

        const marketName = marketTarget === 'KR' ? 'Korean Market' : 'US Market';

        const prompt = `
        You are the 'Hall of Fame' Scanner.
        We have historical success cases with these patterns:
        ${legendDescriptions}

        TASK: Find 3 stocks currently in the ${marketName} that exhibit a VERY SIMILAR technical setup to these legends.
        Focus on:
        1. Chart Pattern (VCP, CupWithHandle, etc)
        2. Volume Characteristics
        3. Breakout readiness

        Response MUST be a JSON array of objects:
        - ticker
        - stockName
        - currentPrice
        - similarityScore (0-100)
        - rationale (Compare it to the specific legend it resembles)
        
         Tools: Use Google Search to find real-time data.
        `;

        try {
            const response = await generateContentWithRetry({
                model: 'gemini-2.0-flash-001',
                contents: [
                    { role: 'user', parts: [{ text: prompt }] }
                ],
                config: {
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: 'ARRAY',
                        items: {
                            type: 'OBJECT',
                            properties: {
                                ticker: { type: 'STRING' },
                                stockName: { type: 'STRING' },
                                currentPrice: { type: 'NUMBER' },
                                similarityScore: { type: 'NUMBER' },
                                rationale: { type: 'STRING' }
                            },
                            required: ['ticker', 'stockName', 'rationale']
                        }
                    },
                    tools: [{ googleSearch: {} }]
                }
            });

            const text = response.text || '[]';
            const raw = JSON.parse(text);

            return raw
                .filter((item: any) => item.ticker && item.ticker !== '없음' && item.ticker !== 'null' && item.ticker !== 'undefined' && item.ticker.length > 1)
                .map((item: any) => ({
                    ticker: item.ticker,
                    stockName: item.stockName,
                    matchType: 'Hall-of-Fame',
                    price: item.currentPrice,
                    changeRate: 0,
                    volumeStrength: item.similarityScore || 80,
                    reason: item.rationale,
                    technicalSignal: `Similar to Legend: ${item.stockName}`
                }));

        } catch (e) {
            console.error('[HallOfFame] Scan failed:', e);
            return [];
        }
    }
}

export const hallOfFameService = new HallOfFameService();
