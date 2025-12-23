
import { supabase } from './supabaseClient';
import type { UserIntelligenceBriefing } from '../types';

export class IntelligenceBriefingProcessorV2 {

    // Process all pending briefings
    async processAllPending() {
        console.log('[ProcessorV2] 📡 Scanning for new Intelligence Briefings...');

        // Since is_processed column doesn't exist, fetch recent briefings
        // and track processed ones in-memory or via a separate table
        const { data: briefings, error } = await supabase
            .from('user_intelligence_briefings')
            .select('*')
            .order('created_at', { ascending: true })
            .limit(10); // Process last 10 briefings

        if (error) {
            console.error('[ProcessorV2] Error fetching briefings:', error);
            return;
        }

        if (!briefings || briefings.length === 0) {
            // console.log('[ProcessorV2] No pending briefings.');
            return;
        }

        console.log(`[ProcessorV2] 📬 Found ${briefings.length} pending briefings. Starting analysis...`);

        for (const briefing of briefings) {
            await this.processBriefing(briefing);
        }
    }

    private async processBriefing(briefing: UserIntelligenceBriefing) {
        console.log(`[ProcessorV2] 🧬 Analyzing Briefing: ${briefing.title}`);

        // 1. Mark as Processing (Optional, skipped for speed)

        // 2. Analyze Content (Mocking AI Analysis for now, or using a simple heuristic)
        // In V2, we assume high importance if it's a Strategy Report
        const isStrategyReport = briefing.title.includes('전략') || briefing.title.includes('Strategy') || briefing.content.length > 500;
        const confidence = isStrategyReport ? 100 : 85;

        // 3. Log Thought
        await supabase.from('ai_thought_logs').insert({
            action: 'ANALYSIS',
            message: `[Intelligence] 사용자 브리핑 분석 중: ${briefing.title}`,
            confidence: confidence,
            details: { briefingId: briefing.id }
        });

        // 4. [Feature] Living Theme Lab: Extract Megatrends
        // Always attempt extraction for detailed reports
        if (briefing.content.length > 100) {
            console.log('[ProcessorV2] 🧪 Living Theme Lab: Extracting themes from briefing...');
            try {
                const { extractThemesFromBriefing } = await import('./gemini/megatrendService');
                const newThemes = await extractThemesFromBriefing(briefing.content);

                if (newThemes && newThemes.length > 0) {
                    const payload = newThemes.map(theme => ({
                        category: 'USER_STRATEGY', // Special Category
                        theme_name: theme.trendName,
                        summary: theme.description,
                        related_sectors: theme.relatedSectors,
                        top_stocks: theme.topStocks,
                        growth_potential: theme.growthPotential,
                        created_at: new Date().toISOString()
                    }));

                    const { error: insertError } = await supabase.from('megatrend_analysis').insert(payload);

                    if (!insertError) {
                        console.log(`[ProcessorV2] ✅ Successfully injected ${newThemes.length} user-defined themes.`);

                        // Notify User via Thought Log
                        await supabase.from('ai_thought_logs').insert({
                            action: 'EVOLUTION',
                            message: `[Vision Sync] 보고서에서 '${newThemes[0].trendName}' 등 ${newThemes.length}개 테마를 추출하여 메가트랜드에 반영했습니다.`,
                            confidence: 100,
                            strategy: 'LIVING_THEME_LAB',
                            details: { themes: newThemes.map(t => t.trendName) }
                        });
                    } else {
                        console.error('[ProcessorV2] Failed to save user themes:', insertError);
                    }
                }
            } catch (e) {
                console.error('[ProcessorV2] Theme extraction failed:', e);
            }
        }

        // Note: is_processed column doesn't exist, so we process recent briefings each time
        console.log(`[ProcessorV2] ✅ Briefing processed: ${briefing.title}`);
    }

}

export const intelligenceBriefingProcessor = new IntelligenceBriefingProcessorV2();
