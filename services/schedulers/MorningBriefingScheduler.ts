import { Subject } from 'rxjs'; // RxJS Subject for Event Stream

import { telegramService } from '../telegramService';
import { marketLogicService } from '../gemini/marketLogicService';
import { isWeekend } from '../utils/dateUtils';
import type { MarketTarget } from '../../types';

export type BriefingEventType = 'BRIEFING_START' | 'BRIEFING_COMPLETE' | 'BRIEFING_ERROR';
export interface BriefingEvent {
    type: BriefingEventType;
    market: MarketTarget;
    error?: any;
}

class MorningBriefingScheduler {
    private isRunning = false;
    private checkInterval: NodeJS.Timeout | null = null;
    private lastRunMap: { [key: string]: string } = {};

    // Public Event Stream for UI Notifications
    public readonly event$ = new Subject<BriefingEvent>();

    public start() {
        if (this.isRunning) return;
        this.isRunning = true;

        console.log('[MorningBriefing] Scheduler started.');

        // Check immediately
        this.checkSchedule();

        // Check every 1 minute
        this.checkInterval = setInterval(() => this.checkSchedule(), 60000);
    }

    public stop() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
        this.isRunning = false;
    }

    private async checkSchedule() {
        const now = new Date();
        const kstNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
        const day = kstNow.getDay();
        const hour = kstNow.getHours();
        const minute = kstNow.getMinutes();
        const todayStr = kstNow.toISOString().split('T')[0];

        // 1. KR Morning Briefing (08:30 KST)
        if (hour === 8 && minute === 30 && this.lastRunMap['KR'] !== todayStr) {
            // Skip Sunday/Saturday for KR Open? KR opens Mon-Fri.
            if (day !== 0 && day !== 6) {
                await this.runBriefing('KR');
                this.lastRunMap['KR'] = todayStr;
            }
        }

        // 2. US Morning Briefing (22:30 KST - Pre-market / Market Open)
        if (hour === 22 && minute === 30 && this.lastRunMap['US'] !== todayStr) {
            if (day >= 1 && day <= 5) {
                await this.runBriefing('US');
                this.lastRunMap['US'] = todayStr;
            }
        }
    }

    private async runBriefing(market: MarketTarget) {
        console.log(`[MorningBriefing] 🌅 Preparing ${market} briefing...`);
        this.event$.next({ type: 'BRIEFING_START', market });

        try {
            // Generate Oracle Logic Chains
            // Generate Oracle Logic Chains (Insight Radar)
            const result = await (marketLogicService as any).analyzeMarketStructure(market);

            // Check if result is the new object format { report, chains }
            const chains = result.chains || result; // Fallback
            const report = result.report;

            if (!chains || chains.length === 0) {
                console.log('[MorningBriefing] No significant logic chains found today.');
                this.event$.next({ type: 'BRIEFING_ERROR', market, error: 'No chains found' });
                return;
            }

            // Send to Telegram
            await telegramService.sendMorningBriefing(market, chains, report);
            console.log(`[MorningBriefing] ✅ ${market} Briefing sent.`);

            // [PROFITABILITY UPGRADE] Connect Insights -> Execution
            // Feed the "Related Tickers" directly to the Sniper Watchlist.
            if (chains.length > 0) {
                const { sniperTriggerService } = await import('../SniperTriggerService');
                let addedCount = 0;

                for (const chain of chains) {
                    if (chain.relatedTickers && Array.isArray(chain.relatedTickers)) {
                        for (const ticker of chain.relatedTickers) {
                            // Add to Sniper: Watch for 60m setup -> 1m trigger
                            sniperTriggerService.addToWatchlist(
                                ticker,
                                ticker, // Name resolution happens later or via manual check
                                `InsightRadar: ${chain.primaryKeyword}`,
                                85 // High initial score for "S-Class" logic
                            );
                            addedCount++;
                        }
                    }
                }
                console.log(`[MorningBriefing] 🎯 Forwarded ${addedCount} Insight Targets to Sniper Watchlist.`);
            }

            this.event$.next({ type: 'BRIEFING_COMPLETE', market });

        } catch (error) {
            console.error(`[MorningBriefing] Failed to run ${market} briefing:`, error);
            this.event$.next({ type: 'BRIEFING_ERROR', market, error });
        }
    }
}

export const morningBriefingScheduler = new MorningBriefingScheduler();
