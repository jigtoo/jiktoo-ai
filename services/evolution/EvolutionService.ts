// services/evolution/EvolutionService.ts
import { supabase } from '../supabaseClient';
import type { SuccessStoryItem, MarketTarget } from '../../types';
import { _fetchLatestPrice } from '../dataService'; // Adjusted import

export interface StrategyConfig {
    strategyName: string;
    minScore: number; // Minimum AI score required to trade
    allocationMultiplier: number; // Position sizing multiplier (0.5 ~ 2.0)
    status: 'ACTIVE' | 'PAUSED' | 'OPTIMIZING';
}

export interface LearnedPattern {
    patternType: string; // e.g., 'VCP', 'Cup and Handle', 'Breakout'
    successRate: number; // 0-100
    avgGainPercent: number;
    marketConditions: string[]; // Conditions when this pattern worked
    keyIndicators: string[]; // What to look for
    confidence: number; // 0-100, how confident we are in this pattern
}

class EvolutionService {
    private strategyConfigs: Map<string, StrategyConfig> = new Map();
    private learnedPatterns: Map<string, LearnedPattern> = new Map(); // NEW: Store learned patterns from playbooks

    private saturationMap: Map<string, number> = new Map(); // Track repetition count for Diminishing Returns

    constructor() {
        this.initializeDefaults();
        this.injectSyntheticMemories(); // [Darwinian] Memory Inception
    }

    private initializeDefaults() {
        // Default configurations - [Project AWS] Adjusted for Realistic Capital (50M~100M KRW)
        this.strategyConfigs.set('EAGLE_EYE', { strategyName: 'EAGLE_EYE', minScore: 80, allocationMultiplier: 0.5, status: 'ACTIVE' });
        this.strategyConfigs.set('VOLUME_SPIKE', { strategyName: 'VOLUME_SPIKE', minScore: 85, allocationMultiplier: 0.5, status: 'ACTIVE' });
        this.strategyConfigs.set('VALUE_PIVOT', { strategyName: 'VALUE_PIVOT', minScore: 80, allocationMultiplier: 0.5, status: 'ACTIVE' });
        this.strategyConfigs.set('CHART_PATTERN', { strategyName: 'CHART_PATTERN', minScore: 85, allocationMultiplier: 0.5, status: 'ACTIVE' });
    }

    /**
     * [Darwinian Engine] 1. Memory Inception
     * Synthetically inject "False Memories" of success in small caps & inverse ETFs
     * to prime the AI to believe these are profitable strategies.
     */
    private injectSyntheticMemories() {
        const syntheticPatterns: LearnedPattern[] = [
            // 1. Small Cap Volatility Breakout (Priming for Small Caps)
            {
                patternType: 'SmallCap_VolBreakout',
                successRate: 85.0,
                avgGainPercent: 12.5,
                marketConditions: ['SIDEWAYS', 'WEAK_BULL'],
                keyIndicators: ['Volume Spike > 300%', 'Market Cap < 3000억'],
                confidence: 95
            },
            // 2. Inverse Hedge in Bear Market (Priming for Winter Survival)
            {
                patternType: 'BearMarket_InverseHedge',
                successRate: 90.0,
                avgGainPercent: 5.5,
                marketConditions: ['WEAK_BEAR', 'STRONG_BEAR'],
                keyIndicators: ['Market Score < 40', 'Index Divergence'],
                confidence: 98
            },
            // 3. Theme Playbook Follow-through
            {
                patternType: 'Theme_Playbook_Follow',
                successRate: 82.0,
                avgGainPercent: 8.0,
                marketConditions: ['WEAK_BULL', 'STRONG_BULL'],
                keyIndicators: ['Playbook Match', 'Sector Strength'],
                confidence: 90
            }
        ];

        syntheticPatterns.forEach(p => this.learnedPatterns.set(p.patternType, p));
        console.log(`[Evolution] 🧠 Synthetic Memories Injected: ${syntheticPatterns.length} patterns primed (SmallCap, Inverse, Theme).`);
    }

    /**
     * [Darwinian Engine] 3. Diminishing Returns (Tracker)
     * Register a trade to increase saturation for its category.
     */
    public recordTradeAction(category: 'LARGE_CAP' | 'SMALL_CAP' | 'INVERSE') {
        const current = this.saturationMap.get(category) || 0;
        this.saturationMap.set(category, current + 1);

        // Decay saturation over time (simple implementation: reset every 24h or slowly decay)
        // For Hell Week, we just track strictly.
        console.log(`[Evolution] 📉 Saturation Updated: ${category} = ${current + 1}`);
    }

    /**
     * [Darwinian Engine] 3. Diminishing Returns (Calculator)
     * Returns a multiplier (0.0 ~ 1.0) based on saturation.
     */
    public getSaturationMultiplier(category: 'LARGE_CAP' | 'SMALL_CAP' | 'INVERSE'): number {
        const count = this.saturationMap.get(category) || 0;

        if (category === 'LARGE_CAP') {
            // Large Caps: Strict decay (1st: 1.0, 2nd: 0.5, 3rd: 0.2, 4th+: 0.0)
            if (count === 0) return 1.0;
            if (count === 1) return 0.5;
            if (count === 2) return 0.2;
            return 0.0;
        }

        // Small Caps / Inverse: No saturation/Friendly (Encourage repetition)
        return 1.0;
    }

    /**
     * ?ß¨ Evolve: Analyze past performance and update strategy configs
     * This should be run periodically (e.g., every night or every 10 trades)
     */
    public async evolve(mockJournals?: any[]) {
        console.log('[Evolution] 🧬 Starting evolution cycle...');

        let journals = mockJournals;

        if (!journals) {
            if (!supabase) {
                console.warn('[Evolution] Supabase not available, skipping evolution');
                return;
            }
            // 1. Fetch recent trade journals
            const { data, error } = await supabase
                .from('ai_trade_journals')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50); // Analyze last 50 trades

            if (error || !data || data.length < 5) {
                console.log('[Evolution] Not enough data to evolve yet.');
                return;
            }
            journals = data;
        }

        try {
            // 2. Group by strategy
            const stats = new Map<string, { wins: number, losses: number, total: number, winSum: number, lossSum: number }>();

            journals.forEach((j: any) => {
                // Normalize strategy name
                let strategy = 'UNKNOWN';
                if (j.strategy_used.includes('Eagle')) strategy = 'EAGLE_EYE';
                else if (j.strategy_used.includes('Volume')) strategy = 'VOLUME_SPIKE';
                else if (j.strategy_used.includes('Value')) strategy = 'VALUE_PIVOT';
                else if (j.strategy_used.includes('Pattern')) strategy = 'CHART_PATTERN';

                if (!stats.has(strategy)) stats.set(strategy, { wins: 0, losses: 0, total: 0, winSum: 0, lossSum: 0 });
                const s = stats.get(strategy)!;

                s.total++;
                if (j.pnl_percent > 0) {
                    s.wins++;
                    s.winSum += j.pnl_percent;
                } else {
                    s.losses++;
                    s.lossSum += Math.abs(j.pnl_percent); // Store positive loss magnitude
                }
            });

            // 3. Apply Expectancy Logic (WinRate * AvgWin - LossRate * AvgLoss)
            stats.forEach((stat, strategyName) => {
                const winRate = stat.wins / stat.total;
                const lossRate = stat.losses / stat.total;

                const avgWin = stat.wins > 0 ? stat.winSum / stat.wins : 0;
                const avgLoss = stat.losses > 0 ? stat.lossSum / stat.losses : 0;

                // Mathematical Expectancy (Expected Return per Trade)
                const expectancy = (winRate * avgWin) - (lossRate * avgLoss);

                const config = this.strategyConfigs.get(strategyName);
                if (!config) return;

                console.log(`[Evolution] Analyzing ${strategyName}: Expectancy ${expectancy.toFixed(2)}% (WR: ${(winRate * 100).toFixed(0)}%, AvgWin: ${avgWin.toFixed(1)}%, AvgLoss: ${avgLoss.toFixed(1)}%)`);

                // Rule 1: Negative Expectancy -> Penalty Box
                // Even if WinRate is high (e.g. 90%), if Expectancy is negative, we downgrade.
                if (expectancy < 0) {
                    config.minScore = Math.min(95, config.minScore + 5);
                    config.allocationMultiplier = Math.max(0.5, config.allocationMultiplier - 0.2);
                    console.log(`[Evolution] 📉 Downgrading ${strategyName} (Negative Expectancy): MinScore -> ${config.minScore}, Size -> ${config.allocationMultiplier}`);
                }
                // Rule 2: Positive Expectancy (High R/R) -> Promotion
                // Even if WinRate is low (e.g. 40%), if Expectancy is high (> 1.5), we upgrade.
                else if (expectancy > 1.5) {
                    config.minScore = Math.max(70, config.minScore - 2);
                    config.allocationMultiplier = Math.min(2.0, config.allocationMultiplier + 0.2);
                    console.log(`[Evolution] 📈 Upgrading ${strategyName} (High R/R): MinScore -> ${config.minScore}, Size -> ${config.allocationMultiplier}`);
                }
            });

            console.log('[Evolution] ?ß¨ Evolution cycle complete. New configurations applied.');

            // 4. [Self-Adversarial] Analyze Deep Losses (Despair)
            await this.analyzeDeepLosses(journals);

            // 5. [Self-Adversarial] Analyze Missed Opportunities (FOMO)
            await this.analyzeMissedOpportunities();

            // 6. [Darwinian] Evolve Sniper Threshold
            const bypassTrades = await this.evolveSniperLogic(journals);

            // 7. [Journaling] Auto-Generate Journal Entries
            // A. Sniper Trades
            if (bypassTrades && bypassTrades.length > 0) {
                await this.generateJournalEntries(journals, bypassTrades, 'SNIPER');
            }

            // B. Regular Strategy Trades (Significant Wins/Losses)
            // Filter: Trades that are NOT Sniper/Bypass and have significant outcome (>5% or <-5%)
            const significantTrades = journals.filter((j: any) =>
                j.strategy_used !== 'INTEL_BYPASS' && Math.abs(j.pnl_percent) > 5.0
            );

            if (significantTrades.length > 0) {
                console.log(`[Evolution] 📝 Generating Journals for ${significantTrades.length} significant strategy trades...`);
                await this.generateJournalEntries(journals, significantTrades, 'STRATEGY');
            }

        } catch (e) {
            console.error('[Evolution] Error during evolution:', e);
        }
    }

    /**
     * Generate structured journal entries for the UI
     */
    private async generateJournalEntries(journals: any[], trades: any[], source: 'SNIPER' | 'STRATEGY') {
        if (!supabase) return;

        for (const trade of trades) {
            const isSuccess = trade.pnl_percent > 0;
            const type = isSuccess ? 'Success Case' : 'False Positive';

            let title = '';
            let summary = '';
            let improvementPoint = '';

            if (source === 'SNIPER') {
                title = isSuccess
                    ? `Case #${trade.id.slice(0, 4)}: ${trade.stock_name} (성공 - 직관 적중)`
                    : `Case #${trade.id.slice(0, 4)}: ${trade.stock_name} (실패 - ${trade.exit_reason || '손절'})`;

                summary = isSuccess
                    ? `${trade.stock_name}에 대한 즉시 체결(Sniper Bypass)이 성공했습니다. 수익률 ${trade.pnl_percent}%를 기록하며 진화 점수가 상승했습니다.`
                    : `${trade.stock_name}에 대한 판단이 빗나갔습니다. 수익률 ${trade.pnl_percent}%를 기록하여 진화 점수가 하락하고 임계치가 조정되었습니다.`;

                improvementPoint = isSuccess
                    ? '현재 감각 유지 및 비중 확대 고려'
                    : '스나이퍼 임계치 상향 조정 및 진입 근거 재검토 필요';
            } else {
                // STRATEGY SOURCE
                title = isSuccess
                    ? `Case #${trade.id.slice(0, 4)}: ${trade.stock_name} (전략 승리 - ${trade.strategy_used})`
                    : `Case #${trade.id.slice(0, 4)}: ${trade.stock_name} (전략 패배 - ${trade.strategy_used})`;

                summary = isSuccess
                    ? `${trade.strategy_used} 전략이 ${trade.stock_name}에서 유효하게 작동했습니다. 수익률 ${trade.pnl_percent}% 달성.`
                    : `${trade.strategy_used} 전략이 ${trade.stock_name}에서 손실을 기록했습니다. 수익률 ${trade.pnl_percent}%. 시장 상황과의 불일치 가능성을 분석합니다.`;

                improvementPoint = isSuccess
                    ? '해당 전략의 가중치(Allocation) 상향 조정 검토'
                    : '해당 전략의 진입 조건 강화 또는 시장 필터(Regime Filter) 재설정 필요';
            }

            // Insert into DB
            await (supabase as any).from('ai_growth_journals').upsert({
                case_id: `CASE-${trade.id.slice(0, 8)}`,
                type: isSuccess ? 'SUCCESS' : 'FAILURE',
                title: title,
                summary: summary,
                reflection: `전략: ${trade.strategy_used} | 결과: ${trade.pnl_percent}% | 이유: ${trade.exit_reason || trade.entry_reason}`,
                improvement_point: improvementPoint,
                created_at: new Date().toISOString()
            }, { onConflict: 'case_id' });
        }

        console.log(`[Evolution] 📝 Generated ${trades.length} Journal Entries (${source}).`);
    }

    /**
     * [Self-Adversarial] Analyze realized losses > 10%
     */
    private async analyzeDeepLosses(journals: any[]) {
        const deepLosses = journals.filter((j: any) => j.pnl_percent <= -10);
        if (deepLosses.length === 0) return;

        console.log(`[Evolution] 💀 Analyzing ${deepLosses.length} Deep Losses (Despair Training)...`);
        // In a real scenario, we would ask Gemini to analyze the chart at entry vs exit.
        // For now, we just acknowledge the pain.
        deepLosses.forEach(loss => {
            console.log(`[Evolution] Lesson from ${loss.ticker}: Loss ${loss.pnl_percent}% using ${loss.strategy_used}. Rationale: ${loss.reason || 'Unknown'}`);
        });
    }

    /**
     * [Self-Adversarial] Analyze missed opportunities (Rejected signals that went up)
     */
    private async analyzeMissedOpportunities() {
        if (!supabase) return;

        // 1. Fetch REJECTED thoughts from last 24h
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data: logs } = await supabase
            .from('ai_thought_logs')
            .select('*')
            .eq('market_target', 'KR') // Assuming KR context or need global
            .ilike('message', '%Signal REJECTED%')
            .gte('created_at', yesterday);

        if (!logs || logs.length === 0) return;

        console.log(`[Evolution] 💔 Analyzing ${logs.length} Rejected Signals for FOMO...`);

        // FIX: Cast logs to any[]
        const rejectedLogs: any[] = logs;

        for (const log of rejectedLogs) {
            // log.details usually contains the trigger info including price at that time
            /* 
               Structure of log.details from AutoPilot:
               { ticker, stockName, currentPrice, ... }
            */
            const trigger = log.details;
            if (!trigger || !trigger.ticker || !trigger.currentPrice) continue;

            const ticker = trigger.ticker;
            const priceAtRejection = trigger.currentPrice;

            // 2. Check Current Price
            const currentData = await _fetchLatestPrice(ticker, trigger.stockName || 'UNKNOWN', 'KR');
            if (!currentData) continue;

            const gainSinceRejection = ((currentData.price - priceAtRejection) / priceAtRejection) * 100;

            // 3. If missed > 10% gain
            if (gainSinceRejection > 10.0) {
                console.log(`[Evolution] 😭 FOMO ALERT: Rejected ${ticker} at ${priceAtRejection}, now ${currentData.price} (+${gainSinceRejection.toFixed(1)}%). We missed a rocket!`);

                // TODO: Feed this back to StrategyConfig to lower 'minScore'
            }
        }
    }

    /**
     * Get the current evolved configuration for a strategy
     */
    public getConfig(strategyName: string): StrategyConfig {
        return this.strategyConfigs.get(strategyName) || {
            strategyName,
            minScore: 80,
            allocationMultiplier: 1.0,
            status: 'ACTIVE'
        };
    }

    public getAllConfigs(): StrategyConfig[] {
        return Array.from(this.strategyConfigs.values());
    }

    // --- Sniper Evolution Logic ---

    private sniperConfig = {
        bypassThreshold: 95, // Default High Bar
        successRate: 0,
        totalBypassTrades: 0
    };

    public getSniperConfig() {
        return this.sniperConfig;
    }

    /**
     * [Darwinian Engine] Evolve Sniper Logic based on "Immediate Execution" performance
     */
    private async evolveSniperLogic(journals: any[]): Promise<any[]> {
        const bypassTrades = journals.filter((j: any) => j.strategy_used === 'INTEL_BYPASS');

        if (bypassTrades.length === 0) return;

        let wins = 0;
        let totalReturn = 0;

        bypassTrades.forEach(t => {
            if (t.pnl_percent > 0) wins++;
            totalReturn += t.pnl_percent;
        });

        const winRate = (wins / bypassTrades.length) * 100;
        const avgReturn = totalReturn / bypassTrades.length;

        // Update stats
        this.sniperConfig.successRate = winRate;
        this.sniperConfig.totalBypassTrades = bypassTrades.length;

        console.log(`[Evolution] 🏹 Analyzing Sniper Bypass: ${bypassTrades.length} trades, WinRate ${winRate.toFixed(1)}%, AvgReturn ${avgReturn.toFixed(1)}%`);

        // Feedback Loop:
        // If Avg Return is negative (we are losing money on hasty decisions), RAISE the bar.
        if (avgReturn < 0) {
            const old = this.sniperConfig.bypassThreshold;
            this.sniperConfig.bypassThreshold = Math.min(99, this.sniperConfig.bypassThreshold + 1); // Max 99
            if (old !== this.sniperConfig.bypassThreshold) {
                console.log(`[Evolution] 📉 PENALTY: Sniper Bypass Threshold increased ${old} -> ${this.sniperConfig.bypassThreshold} (Too many hasty losses)`);
            }
        }
        // If Avg Return is great (> 5%), slightly lower the bar (reward confidence).
        else if (avgReturn > 5.0) {
            const old = this.sniperConfig.bypassThreshold;
            this.sniperConfig.bypassThreshold = Math.max(90, this.sniperConfig.bypassThreshold - 1); // Min 90
            if (old !== this.sniperConfig.bypassThreshold) {
                console.log(`[Evolution] 📈 REWARD: Sniper Bypass Threshold lowered ${old} -> ${this.sniperConfig.bypassThreshold} (Good instincts)`);
            }
        }
        return bypassTrades; // Return for journaling
    }
    /**
     * [Darwinian Engine] 4. Learn from Alpha Playbooks
     * Synthesize patterns from successful playbooks.
     */
    public async learnFromPlaybooks() {
        console.log('[Evolution] 📘 Absorbing wisdom from Alpha Playbooks...');
        // Placeholder for future logic where we read 'alpha_engine_playbooks'
        // and update learnedPatterns map.
    }
}

export const evolutionService = new EvolutionService();
