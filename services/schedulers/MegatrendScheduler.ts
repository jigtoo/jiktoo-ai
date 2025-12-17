// services/schedulers/MegatrendScheduler.ts
import { analyzeMegatrends } from '../gemini/megatrendService';
import { supabase } from '../supabaseClient';
import type { MarketTarget } from '../../types';

interface SchedulerConfig {
    enabled: boolean;
    dayOfMonth: number; // 1-28
    marketTargets: MarketTarget[];
    notifyOnNewTrends: boolean;
}

class MegatrendScheduler {
    private config: SchedulerConfig = {
        enabled: true,
        dayOfMonth: 1, // Run on 1st of each month
        marketTargets: ['KR', 'US'],
        notifyOnNewTrends: true
    };

    private intervalId: NodeJS.Timeout | null = null;
    private lastRunDate: string | null = null;

    /**
     * Start the scheduler
     */
    start(): void {
        if (this.intervalId) {
            console.log('[MegatrendScheduler] Already running');
            return;
        }

        console.log('[MegatrendScheduler] Starting scheduler');

        // Check immediately on start
        this.checkAndRun();

        // Then check every hour
        this.intervalId = setInterval(() => {
            this.checkAndRun();
        }, 60 * 60 * 1000); // Every hour
    }

    /**
     * Stop the scheduler
     */
    stop(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            console.log('[MegatrendScheduler] Stopped');
        }
    }

    /**
     * Check if we should run and execute if needed
     */
    private async checkAndRun(): Promise<void> {
        if (!this.config.enabled) {
            return;
        }

        const now = new Date();
        const today = now.toISOString().slice(0, 10); // YYYY-MM-DD
        const dayOfMonth = now.getDate();

        // Check if we already ran today
        if (this.lastRunDate === today) {
            return;
        }

        // Check if it's the scheduled day
        if (dayOfMonth !== this.config.dayOfMonth) {
            return;
        }

        console.log('[MegatrendScheduler] Running scheduled analysis');
        this.lastRunDate = today;

        // Run analysis for each market
        for (const marketTarget of this.config.marketTargets) {
            try {
                await this.runAnalysis(marketTarget);
            } catch (err) {
                console.error(`[MegatrendScheduler] Failed for ${marketTarget}:`, err);
            }
        }
    }

    /**
     * Run megatrend analysis and store results
     */
    private async runAnalysis(marketTarget: MarketTarget): Promise<void> {
        console.log(`[MegatrendScheduler] Analyzing ${marketTarget} market`);

        const trends = await analyzeMegatrends(marketTarget);

        // Store in Supabase
        const { error } = await supabase
            .from('megatrend_analysis')
            .insert({
                market_target: marketTarget,
                trends: trends,
                analyzed_at: new Date().toISOString(),
                trend_count: trends.length
            });

        if (error) {
            console.error('[MegatrendScheduler] Failed to store results:', error);
            return;
        }

        console.log(`[MegatrendScheduler] Stored ${trends.length} trends for ${marketTarget}`);

        // Send notifications if enabled
        if (this.config.notifyOnNewTrends) {
            await this.notifyNewTrends(marketTarget, trends);
        }
    }

    /**
     * Send Telegram notifications for new trends
     */
    private async notifyNewTrends(marketTarget: MarketTarget, trends: any[]): Promise<void> {
        // Get previous trends to compare
        const { data: previousData } = await supabase
            .from('megatrend_analysis')
            .select('trends')
            .eq('market_target', marketTarget)
            .order('analyzed_at', { ascending: false })
            .limit(2);

        if (!previousData || previousData.length < 2) {
            console.log('[MegatrendScheduler] No previous data to compare');
            return;
        }

        const previousTrends = previousData[1].trends || [];
        const previousTitles = new Set(previousTrends.map((t: any) => t.title));

        // Find new trends
        const newTrends = trends.filter(t => !previousTitles.has(t.title));

        if (newTrends.length === 0) {
            console.log('[MegatrendScheduler] No new trends detected');
            return;
        }

        console.log(`[MegatrendScheduler] Found ${newTrends.length} new trends`);

        // Send Telegram notification
        for (const trend of newTrends) {
            const message = `
? **?로KRW메KRW렌KRW발견!**

**${trend.title}**
${trend.summary}

?️ ?간 지KRW ${trend.timeHorizon}
? ?뢰KRW ${trend.confidence}%

? ?자 기회:
${trend.investmentOpportunities.map((o: string) => `KRW${o}`).join('\n')}

?️ 리스KRW
${trend.risks.slice(0, 2).map((r: string) => `KRW${r}`).join('\n')}

? 출처: ${trend.sources[0]}
            `.trim();

            try {
                await supabase.functions.invoke('send-telegram-message', {
                    body: { message }
                });
            } catch (err) {
                console.error('[MegatrendScheduler] Failed to send Telegram:', err);
            }
        }
    }

    /**
     * Update scheduler configuration
     */
    updateConfig(config: Partial<SchedulerConfig>): void {
        this.config = { ...this.config, ...config };
        console.log('[MegatrendScheduler] Config updated:', this.config);
    }

    /**
     * Get current configuration
     */
    getConfig(): SchedulerConfig {
        return { ...this.config };
    }

    /**
     * Manually trigger analysis (for testing)
     */
    async runNow(marketTarget?: MarketTarget): Promise<void> {
        console.log('[MegatrendScheduler] Manual run triggered');

        const targets = marketTarget ? [marketTarget] : this.config.marketTargets;

        for (const target of targets) {
            await this.runAnalysis(target);
        }
    }
}

export const megatrendScheduler = new MegatrendScheduler();
