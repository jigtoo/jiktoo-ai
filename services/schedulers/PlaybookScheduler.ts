// services/schedulers/PlaybookScheduler.ts
// ?êÎèô?ºÎ°ú ?∏Î†à?¥Îî© ?åÎ†à?¥Î∂ÅKRW?ÖÎç∞?¥Ìä∏?òÍ≥† AI ?ôÏäµKRW?òÌñâ?òÎäî ?§Ï?Ï§ÑÎü¨

import type { MarketTarget } from '../../types';
import { fetchTradingPlaybook } from '../gemini/playbookService';
import { supabase } from '../supabaseClient';
import { evolutionService } from '../EvolutionService';

class PlaybookScheduler {
    private intervalId: NodeJS.Timeout | null = null;
    private isRunning = false;
    private readonly UPDATE_INTERVAL_HOURS = 24; // 24?úÍ∞ÑÎßàÎã§ ?ÖÎç∞?¥Ìä∏

    /**
     * ?§Ï?Ï§ÑÎü¨ ?úÏûë
     */
    public start() {
        if (this.isRunning) {
            console.log('[PlaybookScheduler] Already running');
            return;
        }

        console.log('[PlaybookScheduler] KRW Starting playbook auto-update scheduler...');
        this.isRunning = true;

        // Ï¶âÏãú KRWÎ≤KRW§Ìñâ
        this.runPlaybookUpdate();

        // 24?úÍ∞ÑÎßàÎã§ ?êÎèô ?§Ìñâ
        const intervalMs = this.UPDATE_INTERVAL_HOURS * 60 * 60 * 1000;
        this.intervalId = setInterval(() => {
            this.runPlaybookUpdate();
        }, intervalMs);

        console.log(`[PlaybookScheduler] KRWScheduler started. Will update every ${this.UPDATE_INTERVAL_HOURS} hours.`);
    }

    /**
     * ?§Ï?Ï§ÑÎü¨ Ï§ëÏ?
     */
    public stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.isRunning = false;
        console.log('[PlaybookScheduler] ?∏Ô∏è Scheduler stopped');
    }

    /**
     * ?åÎ†à?¥Î∂Å ?ÖÎç∞?¥Ìä∏ Î∞KRWôÏäµ ?§Ìñâ
     */
    private async runPlaybookUpdate() {
        console.log('[PlaybookScheduler] ?ìö Starting playbook update cycle...');

        try {
            // KR ?úÏû• ?åÎ†à?¥Î∂Å ?ÖÎç∞?¥Ìä∏
            await this.updatePlaybookForMarket('KR');

            // US ?úÏû• ?åÎ†à?¥Î∂Å ?ÖÎç∞?¥Ìä∏
            await this.updatePlaybookForMarket('US');

            console.log('[PlaybookScheduler] KRWPlaybook update cycle complete');

        } catch (error) {
            console.error('[PlaybookScheduler] KRWError during playbook update:', error);
        }
    }

    /**
     * ?πÏ†ï ?úÏû•KRW?åÎ†à?¥Î∂Å ?ÖÎç∞?¥Ìä∏
     */
    private async updatePlaybookForMarket(marketTarget: MarketTarget) {
        console.log(`[PlaybookScheduler] ?ìä Updating ${marketTarget} playbook...`);

        try {
            // 1. Í∏∞Ï°¥ ?åÎ†à?¥Î∂Å ?ïÏù∏
            const shouldUpdate = await this.shouldUpdatePlaybook(marketTarget);

            if (!shouldUpdate) {
                console.log(`[PlaybookScheduler] KRW∏è ${marketTarget} playbook is recent, skipping update`);
                // Í∏∞Ï°¥ ?åÎ†à?¥Î∂Å?ºÎ°ú ?ôÏäµÎßKRWòÌñâ
                await evolutionService.learnFromPlaybooks(marketTarget);
                return;
            }

            // 2. KRW?åÎ†à?¥Î∂Å ?ùÏÑ± (Gemini API ?∏Ï∂ú)
            console.log(`[PlaybookScheduler] ?§ñ Generating new ${marketTarget} playbook via Gemini...`);
            const stories = await fetchTradingPlaybook(marketTarget);

            if (!stories || stories.length === 0) {
                console.log(`[PlaybookScheduler] ?†Ô∏è No stories generated for ${marketTarget}`);
                return;
            }

            // 3. SupabaseKRW?ÄKRW
            if (supabase) {
                await supabase.from('trading_playbooks').upsert({
                    market: marketTarget,
                    stories,
                    updated_at: new Date().toISOString()
                } as any);
                console.log(`[PlaybookScheduler] ?íæ Saved ${stories.length} stories for ${marketTarget}`);
            }

            // 4. AI ?ôÏäµ ?òÌñâ
            console.log(`[PlaybookScheduler] ?ß† Training AI with new ${marketTarget} playbook...`);
            await evolutionService.learnFromPlaybooks(marketTarget);

            console.log(`[PlaybookScheduler] KRW${marketTarget} playbook updated and learned`);

        } catch (error) {
            console.error(`[PlaybookScheduler] KRWError updating ${marketTarget} playbook:`, error);
        }
    }

    /**
     * ?åÎ†à?¥Î∂ÅKRW?ÖÎç∞?¥Ìä∏?¥Ïïº ?òÎäîÏßÄ ?ïÏù∏
     * (24?úÍ∞Ñ ?¥ÎÇ¥KRW?ÖÎç∞?¥Ìä∏?òÏóà?ºÎ©¥ ?§ÌÇµ)
     */
    private async shouldUpdatePlaybook(marketTarget: MarketTarget): Promise<boolean> {
        if (!supabase) return true; // Supabase ?ÜÏúºÎ©KRW?ÉÅ ?ÖÎç∞?¥Ìä∏

        try {
            const { data, error } = await supabase
                .from('trading_playbooks')
                .select('updated_at')
                .eq('market', marketTarget)
                .maybeSingle();

            if (error || !data) return true; // ?∞Ïù¥KRW?ÜÏúºÎ©KRWÖÎç∞?¥Ìä∏ ?ÑÏöî

            const lastUpdate = new Date((data as any).updated_at);
            const hoursSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60);

            // 24?úÍ∞Ñ ?¥ÎÇ¥Î©KRWÖÎç∞?¥Ìä∏ Î∂àÌïÑKRW
            return hoursSinceUpdate >= this.UPDATE_INTERVAL_HOURS;

        } catch (error) {
            console.error('[PlaybookScheduler] Error checking update status:', error);
            return true; // ?§Î•ò KRW?àÏ†Ñ?òÍ≤å ?ÖÎç∞?¥Ìä∏
        }
    }

    /**
     * ?òÎèô?ºÎ°ú ?åÎ†à?¥Î∂Å Í∞ïÏ†ú ?ÖÎç∞?¥Ìä∏
     */
    public async forceUpdate(marketTarget?: MarketTarget) {
        console.log('[PlaybookScheduler] ?îÑ Force updating playbooks...');

        if (marketTarget) {
            await this.updatePlaybookForMarket(marketTarget);
        } else {
            await this.updatePlaybookForMarket('KR');
            await this.updatePlaybookForMarket('US');
        }
    }

    /**
     * ?§Ï?Ï§ÑÎü¨ ?ÅÌÉú ?ïÏù∏
     */
    public getStatus() {
        return {
            isRunning: this.isRunning,
            updateIntervalHours: this.UPDATE_INTERVAL_HOURS
        };
    }
}

export const playbookScheduler = new PlaybookScheduler();
