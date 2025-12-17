// services/IntelligenceBriefingProcessor.ts
// This service processes user intelligence briefings and converts them into actionable trading signals

import { supabase } from './supabaseClient';
import { generateContentWithRetry } from './gemini/client';
import { sanitizeJsonString } from './utils/jsonUtils';
import type { MarketTarget } from '../types';

interface BriefingAnalysis {
    actionable: boolean;
    sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    urgency: 'HIGH' | 'MEDIUM' | 'LOW';
    relatedTickers: string[];
    tradingSignals: {
        ticker: string;
        action: 'BUY' | 'SELL' | 'WATCH';
        confidence: number;
        reasoning: string;
    }[];
    marketInsights: string[];
}

class IntelligenceBriefingProcessor {
    /**
     * Process a user briefing and extract actionable trading intelligence
     */
    async processBriefing(briefingId: string): Promise<BriefingAnalysis | null> {
        if (!supabase) {
            console.error('[BriefingProcessor] Supabase not available');
            return null;
        }

        try {
            // 1. Fetch the briefing
            const { data: briefing, error } = await supabase
                .from('user_intelligence_briefings')
                .select('*')
                .eq('id', briefingId)
                .single();

            if (error || !briefing) {
                console.error('[BriefingProcessor] Failed to fetch briefing:', error);
                return null;
            }

            console.log(`[BriefingProcessor] Processing briefing: "${(briefing as any).title}"`);

            // 2. AI Analysis
            const prompt = `
?뱀떊? ?꾨Ц ?몃젅?대뜑???명뀛由ъ쟾??釉뚮━?묒쓣 遺꾩꽍?섎뒗 AI?낅땲??
?ъ슜?먭? ?쒓났???뺣낫瑜?諛뷀깢?쇰줈 ?ㅽ뻾 媛?ν븳 留ㅻℓ ?좏샇瑜?異붿텧?섏꽭??

?쒕ぉ: ${(briefing as any).title}
?댁슜: ${(briefing as any).content}
愿???곗빱: ${(briefing as any).related_tickers || '?놁쓬'}
異쒖쿂: ${(briefing as any).source_url || '?놁쓬'}

?ㅼ쓬 JSON ?뺤떇?쇰줈 ?묐떟?섏꽭??
{
    "actionable": boolean (???뺣낫媛 利됱떆 ?ㅽ뻾 媛?ν븳 留ㅻℓ ?좏샇瑜??ы븿?섎뒗媛?),
    "sentiment": "BULLISH" | "BEARISH" | "NEUTRAL",
    "urgency": "HIGH" | "MEDIUM" | "LOW",
    "relatedTickers": ["醫낅ぉ肄붾뱶 諛곗뿴"],
    "tradingSignals": [
        {
            "ticker": "醫낅ぉ肄붾뱶",
            "action": "BUY" | "SELL" | "WATCH",
            "confidence": 0-100,
            "reasoning": "援ъ껜?곸씤 洹쇨굅"
        }
    ],
    "marketInsights": ["?쒖옣 ?꾨컲??????몄궗?댄듃 諛곗뿴"]
}
`;

            const aiResponse = await generateContentWithRetry({
                model: 'gemini-1.5-flash',
                contents: prompt,
                // config: { responseMimeType: 'application/json' } // Removed to prevent Tool/JSON conflict
            });

            const rawText = aiResponse.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
            const analysis: BriefingAnalysis = JSON.parse(sanitizeJsonString(rawText));

            console.log('[BriefingProcessor] Analysis complete:', analysis);

            // 3. Store analysis result
            // [FIX] Sanitize analysis object for Supabase (JSONB)
            // JSON.stringify replaces undefined with null or omits it, which is safe.
            // But we must ensure the top level is an object.
            const cleanAnalysis = JSON.parse(JSON.stringify(analysis));

            await (supabase as any)
                .from('user_intelligence_briefings')
                .update({
                    processed_at: new Date().toISOString(),
                    ai_analysis: cleanAnalysis
                })
                .eq('id', briefingId);

            // 4. Log to AI thought stream
            if (analysis.actionable) {
                await (supabase as any).from('ai_thought_logs').insert({
                    ticker: analysis.relatedTickers[0] || null,
                    action: 'ANALYSIS',
                    confidence: 90,
                    message: `[?ъ슜??釉뚮━??遺꾩꽍] ${(briefing as any).title} ??${analysis.tradingSignals.length}媛?留ㅻℓ ?좏샇 異붿텧`,
                    details: {
                        briefingId,
                        analysis,
                        source: 'USER_INTELLIGENCE_BRIEFING'
                    },
                    strategy: 'INTELLIGENCE_BRIEFING'
                });
            }

            return analysis;

        } catch (error) {
            console.error('[BriefingProcessor] Processing failed:', error);
            return null;
        }
    }

    /**
     * Process all unprocessed briefings
     */
    async processAllPending(): Promise<void> {
        if (!supabase) return;

        try {
            // Find briefings that haven't been processed yet
            const { data: pendingBriefings, error } = await supabase
                .from('user_intelligence_briefings')
                .select('id')
                .is('processed_at', null)
                .order('created_at', { ascending: false })
                .limit(20);

            if (error || !pendingBriefings || pendingBriefings.length === 0) {
                console.log('[BriefingProcessor] No pending briefings to process');
                return;
            }

            console.log(`[BriefingProcessor] Processing ${pendingBriefings.length} pending briefings...`);

            for (const briefing of pendingBriefings) {
                const analysis = await this.processBriefing((briefing as any).id);

                // If actionable, trigger AutoPilot
                if (analysis?.actionable && analysis.tradingSignals.length > 0) {
                    console.log(`[BriefingProcessor] ?렞 Actionable signals found! Forwarding to AutoPilot...`);

                    // Import dynamically to avoid circular dependency
                    const { autoPilotService } = await import('./AutoPilotService');

                    for (const signal of analysis.tradingSignals) {
                        if (signal.action === 'BUY' || signal.action === 'WATCH') {
                            // Use processExternalInsight to route through Sniper Mode/Evolution Logic
                            await autoPilotService.processExternalInsight({
                                ticker: signal.ticker,
                                stockName: signal.ticker,
                                type: 'USER_INTELLIGENCE',
                                score: signal.confidence,
                                details: signal.reasoning,
                                currentPrice: 0,
                                changeRate: 0,
                                volume: 0
                            });
                        }
                    }
                }

                // Small delay to avoid rate limits (Optimized: 200ms)
                await new Promise(resolve => setTimeout(resolve, 200));
            }

            console.log('[BriefingProcessor] ??All pending briefings processed');

        } catch (error) {
            console.error('[BriefingProcessor] Batch processing failed:', error);
        }
    }
}

export const intelligenceBriefingProcessor = new IntelligenceBriefingProcessor();

