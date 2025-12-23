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
?πÏã†?Ä ?ÑÎ¨∏ ?∏Î†à?¥Îçî???∏ÌÖîÎ¶¨Ï†Ñ??Î∏åÎ¶¨?ëÏùÑ Î∂ÑÏÑù?òÎäî AI?ÖÎãà??
?¨Ïö©?êÍ? ?úÍ≥µ???ïÎ≥¥Î•?Î∞îÌÉï?ºÎ°ú ?§Ìñâ Í∞Ä?•Ìïú Îß§Îß§ ?†Ìò∏Î•?Ï∂îÏ∂ú?òÏÑ∏??

?úÎ™©: ${(briefing as any).title}
?¥Ïö©: ${(briefing as any).content}
Í¥Ä???∞Ïª§: ${(briefing as any).related_tickers || '?ÜÏùå'}
Ï∂úÏ≤ò: ${(briefing as any).source_url || '?ÜÏùå'}

?§Ïùå JSON ?ïÏãù?ºÎ°ú ?ëÎãµ?òÏÑ∏??
{
    "actionable": boolean (???ïÎ≥¥Í∞Ä Ï¶âÏãú ?§Ìñâ Í∞Ä?•Ìïú Îß§Îß§ ?†Ìò∏Î•??¨Ìï®?òÎäîÍ∞Ä?),
    "sentiment": "BULLISH" | "BEARISH" | "NEUTRAL",
    "urgency": "HIGH" | "MEDIUM" | "LOW",
    "relatedTickers": ["Ï¢ÖÎ™©ÏΩîÎìú Î∞∞Ïó¥"],
    "tradingSignals": [
        {
            "ticker": "Ï¢ÖÎ™©ÏΩîÎìú",
            "action": "BUY" | "SELL" | "WATCH",
            "confidence": 0-100,
            "reasoning": "Íµ¨Ï≤¥?ÅÏù∏ Í∑ºÍ±∞"
        }
    ],
    "marketInsights": ["?úÏû• ?ÑÎ∞ò???Ä???∏ÏÇ¨?¥Ìä∏ Î∞∞Ïó¥"]
}
`;

            const aiResponse = await generateContentWithRetry({
                model: 'gemini-2.0-flash-001',
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
                    message: `[?¨Ïö©??Î∏åÎ¶¨??Î∂ÑÏÑù] ${(briefing as any).title} ??${analysis.tradingSignals.length}Í∞?Îß§Îß§ ?†Ìò∏ Ï∂îÏ∂ú`,
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
                    console.log(`[BriefingProcessor] ?éØ Actionable signals found! Forwarding to AutoPilot...`);

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

