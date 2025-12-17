// services/AutonomousScheduler.ts
import { isWeekend } from './utils/dateUtils';
import { marketRegimeService } from './MarketRegimeService';
// import { calculateAnchoredVWAP } from './anchoredVWAP';
// import { scanForVolatilityBreakouts } from './gemini/volatilityBreakout';
import { scanForBFLStocks, scanForConviction, scanForGapStocks } from './gemini/screenerService';
import { supabase } from './supabaseClient';
import { telegramService } from './telegramService';
import { autoPilotService } from './AutoPilotService';
import { MarketTarget } from '../types';
import { predatorService } from './PredatorService'; // [Predator] Import
import { evolutionScheduler } from './EvolutionScheduler'; // [Darwin] Import

class AutonomousScheduler {
    private isRunning = false;
    private checkInterval: NodeJS.Timeout | null = null;
    private readonly INTERVAL_MS = 1000 * 60 * 5; // 5 minutes
    public currentMarketTarget: MarketTarget = 'KR';

    // State tracking structure for granular daily scans
    private dailyScanStates: {
        KR: { gap: string; morning: string; afternoon: string; closing: string };
        US: { gap: string; morning: string; afternoon: string; closing: string };
    } = {
            KR: { gap: '', morning: '', afternoon: '', closing: '' },
            US: { gap: '', morning: '', afternoon: '', closing: '' }
        };

    public async start() {
        if (this.isRunning) return;
        this.isRunning = true;

        // Remote Control Listener
        // Remote Control Listener
        // [Handled by App.tsx]
        // try {
        //    const { systemCommandListener } = await import('./SystemCommandListener');
        //    systemCommandListener.start();
        // } catch (e) {
        //    console.error('[Scheduler] Failed to start Remote Listener:', e);
        // }

        // Circular Dependency Fix: Bind Services on Startup
        try {
            const { sniperTriggerService } = await import('./SniperTriggerService');
            autoPilotService.bindSniperTrigger(sniperTriggerService);
            console.log('[Scheduler] Bound AutoPilot <-> SniperTrigger');
        } catch (e) {
            console.error('[Scheduler] Failed to bind services:', e);
        }

        console.log('[Scheduler] Autonomous Scheduler Started');

        // Run immediately
        this.runCycle();

        // Check for missed runs (Memory Recall)
        this.checkMissedClosingBell();

        // Schedule next runs
        this.checkInterval = setInterval(() => this.runCycle(), this.INTERVAL_MS);
    }

    public stop() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
        this.isRunning = false;
        console.log('[Scheduler] Stopped');
    }

    private async runCycle() {
        try {
            const now = new Date();
            const kstTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
            const todayStr = kstTime.toISOString().split('T')[0];
            const hours = kstTime.getHours();
            const minutes = kstTime.getMinutes();

            // 1. Determine Dynamic Market Target
            // KR: 08:30 ~ 16:00
            // US: 22:00 ~ 06:00
            let currentMarket: MarketTarget = 'KR';
            let isMarketOpen = false;

            if (hours >= 8 && hours < 16) {
                currentMarket = 'KR';
                // KR: Mon(1) ~ Fri(5)
                const isWeekday = kstTime.getDay() >= 1 && kstTime.getDay() <= 5;
                isMarketOpen = isWeekday && ((hours >= 9 && hours < 15) || (hours === 15 && minutes <= 30));

            } else if (hours >= 22 || hours < 6) {
                currentMarket = 'US';
                const day = kstTime.getDay();
                // US Market Open in KST:
                // Mon 22:30 ~ Tue 05:00
                // ...
                // Fri 22:30 ~ Sat 05:00

                // So, if it is Sunday (0) or Saturday (6) or Monday morning (before 22:30), it is largely closed or pre-market.
                // Monday 00:00 ~ 06:00 KST is Sunday EST -> CLOSED.

                let isUSTradingDay = false;
                if (day === 2 || day === 3 || day === 4 || day === 5) isUSTradingDay = true; // Tue, Wed, Thu, Fri (covering Mon-Thu nights)
                if (day === 6 && hours < 6) isUSTradingDay = true; // Sat early morning (Fri night)
                if (day === 1 && hours >= 22) isUSTradingDay = true; // Mon night

                isMarketOpen = isUSTradingDay && ((hours >= 22 && minutes >= 30) || hours >= 23 || hours < 5);
            }

            // Sync System State
            if (autonomousScheduler.currentMarketTarget !== currentMarket) {
                console.log(`[Scheduler] 🔄 Market Switch: ${autonomousScheduler.currentMarketTarget} -> ${currentMarket}`);
                autonomousScheduler.currentMarketTarget = currentMarket;
            }

            console.log(`[Scheduler] Cycle Start: ${kstTime.toISOString()} (KST ${hours}:${minutes}) | Market: ${currentMarket} | Open: ${isMarketOpen}`);

            // 2. Check Market Regime
            const regime = await marketRegimeService.analyzeCurrentRegime(currentMarket);
            console.log(`[Scheduler] Regime: ${regime.regime} (Score: ${regime.score})`);

            // Check if it's weekend
            const todayIsWeekend = isWeekend();

            // 🏁 DYNAMIC MULTI-SESSION SCHEDULING 🏁

            if (todayIsWeekend) {
                // === WEEKEND STUDY MODE ===
                // [Saturday 10:00] Weekly Review & Learning
                if (now.getDay() === 6 && hours === 10 && this.dailyScanStates.KR.morning !== 'WEEKEND_REVIEW_' + todayStr) {
                    await this.runWeekendStudy('REVIEW');
                    this.dailyScanStates.KR.morning = 'WEEKEND_REVIEW_' + todayStr;
                }

                // [Sunday 20:00] Next Week Prep & Sector Study
                if (now.getDay() === 0 && hours === 20 && this.dailyScanStates.KR.closing !== 'WEEKEND_PREP_' + todayStr) {
                    await this.runWeekendStudy('PREP');
                    this.dailyScanStates.KR.closing = 'WEEKEND_PREP_' + todayStr;
                }

                console.log('[Scheduler] Weekend Mode: Monitor sleeping. Study routine active.');
                return; // Skip trading scans
            }

            // [Hunter Mode] - Real-time User Strategy Scan (Runs every cycle if market is open)
            if (isMarketOpen) {
                await this.scanForHunterStrategies(currentMarket);

                // [Sniper Mode] - CHECK WATCHLIST for 60m/1m setups
                const { sniperTriggerService } = await import('./SniperTriggerService');
                await sniperTriggerService.scanForTriggers(currentMarket);
            }

            // === KR MARKET STRATEGY ===
            if (currentMarket === 'KR') {
                // [09:00 ~ 09:20] GAP-UP (Opening Volatility)
                // Strict check: Only fire if we are actually in the opening window.
                if (hours === 9 && minutes <= 20 && this.dailyScanStates.KR.gap !== todayStr) {
                    await this.executeScan('KR', 'GAP', todayStr);
                }

                // [10:00 ~ 11:00] MORNING CONVICTION (Trend Confirmation - Golden Hour)
                if (hours === 10 && this.dailyScanStates.KR.morning !== todayStr) {
                    await this.executeScan('KR', 'MORNING', todayStr);
                }

                // [13:00 ~ 14:00] AFTERNOON CONVICTION (Second Wind / Reversals)
                // New addition based on user feedback for more frequent optimized scans
                if (hours === 13 && this.dailyScanStates.KR.afternoon !== todayStr) {
                    await this.executeScan('KR', 'AFTERNOON', todayStr);
                }

                // [15:20 ~ 15:30] CLOSING BELL (BFL)
                if (hours === 15 && minutes >= 20 && this.dailyScanStates.KR.closing !== todayStr) {
                    await this.executeScan('KR', 'CLOSING', todayStr);
                }
            }


            // [06:00 KST] AI EVOLUTION CHECK (Darwin Engine)
            // Checks health of active strategy and evolves if needed.
            // Changed from 00:00 to 06:00 to avoid US Market hours (Delay Prevention)
            if (hours === 6 && minutes >= 5 && minutes <= 20 && this.dailyScanStates.KR.closing !== 'EVOL_DONE_' + todayStr) {
                console.log('[Scheduler] 🧬 Triggering Daily Evolution Check... (Idle Time)');
                await evolutionScheduler.startDailyRoutine();
                // Use a dummy state slot or better, add one to the interface. For now hacking into KR.closing
                // A cleaner way is to add 'evolution' to dailyScanStates.
                // But for quick integration:
                this.dailyScanStates.KR.closing = 'EVOL_DONE_' + todayStr;
            }


            // === US MARKET STRATEGY ===
            if (currentMarket === 'US') {
                // [23:30 ~ 00:00 KST] GAP-UP (US 09:30 EST)
                // Assuming Standard Time (23:30 Open). For DST (22:30), this needs adjustment.
                // Current logic handles Winter Time.
                if ((hours === 23 && minutes >= 30) && this.dailyScanStates.US.gap !== todayStr) {
                    await this.executeScan('US', 'GAP', todayStr);
                }

                // [00:30 ~ 01:30 KST] MORNING CONVICTION (US 10:30 EST)
                if ((hours === 0 && minutes >= 30) && this.dailyScanStates.US.morning !== todayStr) {
                    await this.executeScan('US', 'MORNING', todayStr);
                }

                // [04:00 ~ 05:00 KST] AFTERNOON CONVICTION (US 14:00 EST)
                if (hours === 4 && this.dailyScanStates.US.afternoon !== todayStr) {
                    await this.executeScan('US', 'AFTERNOON', todayStr);
                }

                // [05:20 ~ 05:50 KST] CLOSING BELL (US 15:20 EST)
                if (hours === 5 && minutes >= 20 && this.dailyScanStates.US.closing !== todayStr) {
                    await this.executeScan('US', 'CLOSING', todayStr);
                }
            }


            // 🔁 CONTINUOUS MONITORING
            if (isMarketOpen) {
                // [DEPRECATED] Handled by AutoPilotService with Sniper Logic
                // await this.monitorActivePlaybooks(currentMarket);
            }

        } catch (error) {
            console.error('[Scheduler] Cycle Failed:', error);
        }
    }

    private async executeScan(market: MarketTarget, type: 'GAP' | 'MORNING' | 'AFTERNOON' | 'CLOSING', dateKey: string) {
        console.log(`[Scheduler] ⚡ EXECUTING ${market} ${type} SCAN...`);

        // Update State FIRST to prevent double-fire during long execution
        if (market === 'KR') {
            if (type === 'GAP') this.dailyScanStates.KR.gap = dateKey;
            if (type === 'MORNING') this.dailyScanStates.KR.morning = dateKey;
            if (type === 'AFTERNOON') this.dailyScanStates.KR.afternoon = dateKey;
            if (type === 'CLOSING') this.dailyScanStates.KR.closing = dateKey;
        } else {
            if (type === 'GAP') this.dailyScanStates.US.gap = dateKey;
            if (type === 'MORNING') this.dailyScanStates.US.morning = dateKey;
            if (type === 'AFTERNOON') this.dailyScanStates.US.afternoon = dateKey;
            if (type === 'CLOSING') this.dailyScanStates.US.closing = dateKey;
        }

        try {
            if (type === 'GAP') {
                const results = await scanForGapStocks(market);
                if (results.length > 0) {
                    const top = results[0];
                    await telegramService.sendMessage({
                        title: `[직투 AI] 🚀/${market} 장시작 갭상승: ${top.stockName}`,
                        body: `📈 +${top.gapPercent}% | ${top.news}`,
                        urgency: 'high',
                        emoji: '🚀'
                    });
                    await autoPilotService.executeSignal({
                        ticker: top.ticker, stockName: top.stockName, type: 'GAP_STRATEGY',
                        score: 85, details: 'Gap Strat', currentPrice: 0, changeRate: top.currentChange, volume: 0
                    });
                }
            }
            else if (type === 'MORNING' || type === 'AFTERNOON') {
                const slotTitle = type === 'MORNING' ? '오전 핵심 공략' : '오후장 틈새 공략';
                const results = await scanForConviction(market);

                // [Predator Logic] Analyze for Vulture/FOMO opportunities
                if (results.length > 0) {
                    console.log(`[Scheduler] 🦈 Running Predator Analysis on ${results.length} candidates...`);
                    // Fire and forget (or await if we want to log completion)
                    await predatorService.scanForPanicSells(results, market);
                    await predatorService.scanForFOMOClimax(results, market);
                }

                if (results.length > 0) {
                    const top = results[0];
                    await telegramService.sendMessage({
                        title: `[직투 AI] ⚡/${market} ${slotTitle}: ${top.stockName}`,
                        body: `🎯 **점수:** ${top.score}점\n📌 **이유:** ${top.reasons[0]}`,
                        urgency: 'high',
                        emoji: '💎'
                    });
                    await autoPilotService.executeSignal({
                        ticker: top.ticker, stockName: top.stockName, type: 'CONVICTION',
                        score: top.score, details: `Conviction (${type}): ${top.reasons.join(', ')}`, currentPrice: 0, changeRate: 0, volume: 0
                    });
                }
            }
            else if (type === 'CLOSING') {
                const results = await scanForBFLStocks(market);
                if (results.length > 0) {
                    if (supabase) {
                        await supabase.from('bfl_scanner_results').upsert([{ market, results, updated_at: new Date().toISOString() }] as any);
                    }
                    const top = results[0];
                    await telegramService.sendMessage({
                        title: `[직투 AI] 🌙/${market} 종가베팅: ${top.stockName}`,
                        body: `✨ ${top.rationale}`,
                        urgency: 'high',
                        emoji: '🌙'
                    });
                    for (const s of results) {
                        await autoPilotService.executeSignal({
                            ticker: s.ticker, stockName: s.stockName, type: 'CLOSING_BELL',
                            score: s.aiConfidence, details: s.rationale, currentPrice: 0, changeRate: 0, volume: 0
                        });
                    }
                }
            }

        } catch (e) {
            console.error(`[Scheduler] Error executing ${type} scan:`, e);
        }
    }

    /**
     * Monitors active playbooks in the DB and executes trades if entry conditions are met.
     */
    private async monitorActivePlaybooks(market: MarketTarget) {
        if (!supabase) return;
        try {
            // Fetch active playbooks
            const { data } = await supabase
                .from('alpha_engine_playbooks')
                .select('*')
                .eq('market', market)
                .order('created_at', { ascending: false })
                .limit(10);

            const playbooks = data as any[];

            if (!playbooks || playbooks.length === 0) return;

            console.log(`[Scheduler] Monitoring ${playbooks.length} active playbooks...`);

            /* 
               CRITICAL: Active Monitoring Logic 
               Iterate through playbooks and check valid entry conditions
            */
            for (const playbook of playbooks) {
                // Parse Playbook JSON safely
                const playbookData = typeof playbook.playbook_data === 'string'
                    ? JSON.parse(playbook.playbook_data)
                    : playbook.playbook_data;

                if (!playbookData || !playbookData.ticker) continue;

                // 1. Get Current Price (Using AutoPilot's helper if available, or just mocking for now via 'executeSignal' indirect checks)
                // Since executeSignal does fresh analysis, we can trigger it with a special intent 'PLAYBOOK_MONITORING'
                // However, doing full analysis every cycle for 10 stocks is expensive (Gemini costs).
                // Better approach: Check price vs 'pivotPrice' if available in playbook.

                // For now, to satisfy "Try to buy at least", we will trust the playbook's existence implies potential.
                // We will send a signal to AutoPilot with type 'PLAYBOOK_EXECUTION'.
                // AutoPilot will check if we already own it. form 'monitorPositions'.

                // Let's rely on AutoPilot's internal duplicate logic.
                // Triggers with score 75 (lower than Conviction 85, but actionable)
                const trigger = {
                    ticker: playbookData.ticker,
                    stockName: playbookData.stockName,
                    type: 'PLAYBOOK_EXECUTION',
                    score: 75, // Reasonable score for a playbook item
                    details: `Playbook Monitor: ${playbookData.strategyName} - ${playbookData.rationale?.slice(0, 50)}...`,
                    currentPrice: 0, // Let AutoPilot fetch
                    changeRate: 0,
                    volume: 0
                };

                // Only fire if we haven't fired recently? 
                // AutoPilot handles duplication (isPositionOpen).
                await autoPilotService.executeSignal(trigger);
            }

        } catch (error) {
            console.error('[Scheduler] monitorActivePlaybooks failed:', error);
        }
    }

    private async checkMissedClosingBell() {
        console.log('[Scheduler] Checking for missed Closing Bell scans...');
        if (!supabase) return;

        const now = new Date();
        const kstNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
        const hour = kstNow.getHours();

        // Only verify if market has closed (after 15:50)
        // If it is 16:00, 19:00, etc., we check.
        if (hour < 16) return;

        try {
            // Check DB for today's results
            const todayStr = kstNow.toISOString().split('T')[0];
            const { data } = await supabase
                .from('bfl_scanner_results')
                .select('updated_at')
                .eq('market', 'KR')
                .gte('updated_at', `${todayStr}T00:00:00`)
                .maybeSingle();

            if (data) {
                console.log('[Scheduler] Found existing BFL results for today. Memory intact.');
                return;
            }

            console.log('[Scheduler] 🚨 Missed Closing Bell Scan! Running Late Scan...');

            // Execute Late Scan
            const bflSignals = await scanForBFLStocks('KR');

            if (bflSignals.length > 0) {
                const { error } = await supabase.from('bfl_scanner_results').upsert([{
                    market: 'KR',
                    results: bflSignals,
                    updated_at: new Date().toISOString(),
                }] as any); // Cast to any to avoid strict type checks

                if (error) console.error('[Scheduler] Failed to save Late BFL results:', error);
                else {
                    console.log('[Scheduler] Late BFL results restored to Memory.');

                    // Late Notification
                    const body = `
[지연 복구] 오늘의 종가 공략 후보가 포착되었습니다. (${bflSignals.length}종목)
(앱 종료로 인해 지연 분석됨)

${bflSignals.map(s => `
----------
📌 **${s.stockName} (${s.ticker})**
✨ **선정 사유:** ${s.rationale}
📊 **AI 확신도:** ${s.aiConfidence}%
🎯 **진입 전략:** ${s.entryPlan.timing} / ${s.entryPlan.strategy}
`).join('\n')
                        }
                `.trim();

                    await telegramService.sendMessage({
                        title: '[직투 AI] 종가배팅 데이터 복구 완료',
                        body: body,
                        urgency: 'medium', // Adjusted to valid type
                        emoji: '💾'
                    });
                }
            } else {
                console.log('[Scheduler] Late Scan found no signals.');
            }

        } catch (error) {
            console.error('[Scheduler] checkMissedClosingBell failed:', error);
        }
    }

    /**
     * Weekend Study Routine: Review or Prep
     */
    private async runWeekendStudy(mode: 'REVIEW' | 'PREP') {
        console.log(`[Scheduler] 📚 Running Weekend Study: ${mode}`);
        try {
            let recentLogs = "";
            if (supabase) {
                const { data } = await supabase
                    .from('ai_thought_logs')
                    .select('message, created_at')
                    .order('created_at', { ascending: false })
                    .limit(20);
                if (data) {
                    recentLogs = data.map((l: any) => `[${l.created_at}] ${l.message}`).join('\n');
                }
            }

            const prompt = mode === 'REVIEW'
                ? `You are an expert stock market instructor. It is Saturday.
                   Based on the recent AI logs below (or your general market knowledge), provide a "Weekly Review".
                   1. Key events of the past week.
                   2. What strategies worked well?
                   3. Lessons learned.
                   Review Logs:
                   ${recentLogs}`
                : `You are an expert stock market strategist. It is Sunday.
                   Provide a "Next Week Preparation" report.
                   1. Expected market flow for next week.
                   2. Sectors to watch (Strategic Focus).
                   3. Key economic events to watch.
                   4. Mindset for the week.`;

            // Dynamic import
            const { callGemini } = await import('./gemini/client');
            const aiResponse = await callGemini(prompt);

            const title = mode === 'REVIEW' ? '📝 [주말 공부] 이번 주 주식시장 복기' : '🔭 [주말 공부] 다음 주 시장 전망 및 전략';

            await telegramService.sendMessage({
                title: title,
                body: aiResponse,
                urgency: 'high',
                emoji: mode === 'REVIEW' ? '🤔' : '👀'
            });

        } catch (error) {
            console.error('[Scheduler] Weekend study failed:', error);
        }
    }

    /**
     * [Hunter Mode] 
     * Scans for User-Defined V2 Strategies against the "Neural Network" (User Watchlists + Playbooks)
     */
    private async scanForHunterStrategies(market: MarketTarget) {
        if (!supabase) return;

        try {
            // 1. Fetch Active V2 Strategies
            const { data: strategies, error } = await supabase
                .from('strategies')
                .select('*')
                // .not('logic_v2', 'is', null) // Ideally filter strictly, but let's fetch all and check in code
                .eq('is_active', true)
                .eq('market', market);

            if (error || !strategies || strategies.length === 0) return;

            const v2Strategies = strategies.filter((s: any) => s.logic_v2 && s.logic_v2.children);
            if (v2Strategies.length === 0) return;

            // 2. Define Scanning Universe (The "Neural Network")
            // The User explicitly stated: Scan stocks that are "Included/Excluded" (Watchlists) and "Scanned" (Playbooks).

            const targetSet = new Set<string>();

            // Source A: User Watchlists (My Library)
            const { data: watchlists } = await supabase
                .from('user_watchlists')
                .select('items')
                .eq('market', market);

            if (watchlists) {
                watchlists.forEach((w: any) => {
                    // Items might be JSONb, need parsing
                    let items = w.items;
                    if (typeof items === 'string') {
                        try { items = JSON.parse(items); } catch (e) { }
                    }
                    if (Array.isArray(items)) {
                        items.forEach((i: any) => {
                            if (i.ticker) targetSet.add(i.ticker);
                        });
                    }
                });
            }

            // Source B: Active Playbooks (AI Picks)
            const { data: playbooks } = await supabase
                .from('alpha_engine_playbooks')
                .select('ticker')
                .eq('market', market);

            if (playbooks) {
                playbooks.forEach((p: any) => {
                    if (p.ticker) targetSet.add(p.ticker);
                });
            }

            // Fallback: If network is empty, use a minimal sector leader list to keep the heart beating
            if (targetSet.size === 0) {
                const leaders = market === 'KR'
                    ? ['005930', '000660', '035420', '005380', '051910']
                    : ['AAPL', 'TSLA', 'NVDA', 'MSFT', 'AMZN'];
                leaders.forEach(t => targetSet.add(t));
                console.log('[Hunter] ⚠️ Neural network empty. Using fallback leaders.');
            }

            console.log(`[Hunter] 🕸️ Neural Network Active: Scanning ${targetSet.size} targets with ${v2Strategies.length} strategies...`);

            // 3. Prepare Engine
            const { StrategyEngine } = await import('./strategy/StrategyEngine');
            const { RealDataProvider } = await import('./strategy/RealDataProvider');
            // FIX: Using dynamic import for dataService to ensure clean loading
            const { fetchDailyCandles } = await import('./dataService');

            const engine = new StrategyEngine();

            // 4. Execution Loop (Daily/Weekly Scan -> Stage 1)
            for (const ticker of Array.from(targetSet)) {
                // Optimize: Skip if data fetch fails repeatedly?
                let candles: any[] = [];
                try {
                    // Fetch enough history for V2 Logic (e.g. 250 days for SEPA/SMA200)
                    candles = await fetchDailyCandles(ticker, market, 250);
                } catch (err) {
                    console.warn(`[Hunter] Failed to fetch data for ${ticker}, skipping.`);
                    continue;
                }

                if (!candles || candles.length < 50) continue;

                // Create Provider with real candles
                const provider = new RealDataProvider(candles);

                for (const strategy of v2Strategies) {
                    try {
                        const isMatch = engine.evaluate(strategy.logic_v2, provider);

                        if (isMatch) {
                            console.log(`[Hunter] 🎯 Strategy "${strategy.name}" HIT on ${ticker}! Handing off to Sniper...`);

                            // [WATERFALL EXECUTION HAND-OFF]
                            // Old: Immediate Execution
                            // New: Add to Sniper Watchlist for 60m/1m precision entry

                            const { sniperTriggerService } = await import('./SniperTriggerService');

                            sniperTriggerService.addToWatchlist(
                                ticker,
                                ticker, // Stock name might need resolving, using ticker for now
                                strategy.name,
                                90 // Initial Score
                            );

                            // 6. Alert (User expects report of discovery)
                            await telegramService.sendMessage({
                                title: `🎯 [Hunter] "${strategy.name}" 포착 (1차 관문 통과)`,
                                body: `**${ticker}** 종목이 전략 조건(일봉)을 만족했습니다.\n👉 **[Sniper]** 2차 정밀 타격 대기 모드로 전환합니다.\n(60분봉/1분봉 감시 시작)`,
                                urgency: 'medium', // Not high urgency yet
                                emoji: '🔭'
                            });
                        }
                    } catch (err) {
                        console.error(`[Hunter] Failed to evaluate ${ticker} for ${strategy.name}:`, err);
                    }
                }
            }

        } catch (e) {
            console.error('[Scheduler] Hunter Scan Error:', e);
        }
    }
}

export const autonomousScheduler = new AutonomousScheduler();
