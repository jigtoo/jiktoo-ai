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
import { evolutionScheduler } from './EvolutionScheduler'; // [Darwin] Import

class AutonomousScheduler {
    private isRunning = false;
    private checkInterval: NodeJS.Timeout | null = null;
    private readonly INTERVAL_MS = 1000 * 60 * 5; // 5 minutes
    public currentMarketTarget: MarketTarget = 'KR';

    // State tracking structure for granular daily scans
    private dailyScanStates: {
        KR: { gap: string; morning: string; lunch: string; afternoon: string; closing: string; journal: string; bridge: string; evolution: string };
        US: { gap: string; morning: string; afternoon: string; closing: string };
    } = {
            KR: { gap: '', morning: '', lunch: '', afternoon: '', closing: '', journal: '', bridge: '', evolution: '' },
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

    private failedTickers = new Map<string, number>(); // Ticker -> Timestamp

    constructor() {
        // Enforce singleton instantiation via class export
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

                isMarketOpen = isUSTradingDay && ((hours >= 22 && minutes >= 30) || hours >= 23 || hours < 6);
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
                await this.scanForHunterStrategies(currentMarket, 'MORNING'); // Standard morning/anytime scan
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

                // [12:00 ~ 13:00] LUNCH TIME CHECK (Institutional Flow & Sector Rotation)
                if (hours === 12 && this.dailyScanStates.KR.lunch !== todayStr) {
                    await this.executeScan('KR', 'LUNCH', todayStr);
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

                // [15:40 ~ 16:00] AFTER MARKET JOURNAL (AI Trading Lab)
                if (hours === 15 && minutes >= 40 && this.dailyScanStates.KR.journal !== todayStr) {
                    await this.runAfterMarketJournal();
                    this.dailyScanStates.KR.journal = todayStr;
                }

                // [18:00 ~ 19:00] GLOBAL BRIDGE ANALYSIS (KR -> US Correlation)
                if (hours === 18 && this.dailyScanStates.KR.bridge !== todayStr) {
                    const { marketCorrelationService } = await import('./MarketCorrelationService');
                    await marketCorrelationService.runBridgeAnalysis();
                    this.dailyScanStates.KR.bridge = todayStr;
                }
            }


            // [06:00 KST] AI EVOLUTION CHECK (Darwin Engine)
            // Checks health of active strategy and evolves if needed.
            // Changed from 00:00 to 06:00 to avoid US Market hours (Delay Prevention)
            if (hours === 6 && minutes >= 5 && minutes <= 20 && this.dailyScanStates.KR.evolution !== todayStr) {
                console.log('[Scheduler] 🧬 Triggering Daily Evolution Check... (Idle Time)');
                await evolutionScheduler.startDailyRoutine();
                this.dailyScanStates.KR.evolution = todayStr;
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

    private async executeScan(market: MarketTarget, type: 'GAP' | 'MORNING' | 'LUNCH' | 'AFTERNOON' | 'CLOSING', dateKey: string) {
        console.log(`[Scheduler] ⚡ EXECUTING ${market} ${type} SCAN...`);

        // Update State FIRST to prevent double-fire during long execution
        if (market === 'KR') {
            if (type === 'GAP') this.dailyScanStates.KR.gap = dateKey;
            if (type === 'MORNING') this.dailyScanStates.KR.morning = dateKey;
            if (type === 'LUNCH') this.dailyScanStates.KR.lunch = dateKey;
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
            else if (type === 'MORNING' || type === 'AFTERNOON' || type === 'LUNCH') {
                const slotTitle = type === 'MORNING' ? '오전 핵심 공략' : (type === 'LUNCH' ? '점심 수급 점검' : '오후장 틈새 공략');
                const results = await scanForConviction(market);

                // Calls scanForHunterStrategies with type
                await this.scanForHunterStrategies(market, type);

                // [NEW] AI Quant Scanner - Runs during MORNING scan only to avoid overload
                if (type === 'MORNING') {
                    console.log('[Scheduler] 🤖 Running AI Quant Scanner...');
                    try {
                        const { scannerHub } = await import('./discovery/ScannerHubService');
                        await scannerHub.runAIQuantScan(market);
                        console.log('[Scheduler] ✅ AI Quant Scanner completed');
                    } catch (aiError) {
                        console.error('[Scheduler] AI Quant Scanner failed:', aiError);
                    }
                }

                if (results.length > 0) {
                    console.log(`[Scheduler] 🦈 Conviction Scan found ${results.length} candidates.`);
                }

                if (results.length > 0) {
                    const top = results[0];
                    await telegramService.sendMessage({
                        title: `[직투 AI] ⚡/${market} ${slotTitle}: ${top.stockName}`,
                        body: `🎯 **점수:** ${top.score}점\n📌 **이유:** ${top.reasons[0]}`,
                        urgency: 'high',
                        emoji: type === 'LUNCH' ? '🍛' : '💎'
                    });

                    // [PERSISTENCE] Save Conviction Results to Alpha Playbooks for Hunter to pick up
                    if (supabase) {
                        const strategiesToSave = results.map(r => ({
                            market: market,
                            ticker: r.ticker,
                            stock_name: r.stockName,
                            strategy_name: `Conviction (${type})`,
                            pattern_name: r.reasons[0] || 'High Conviction',
                            key_factors: r.reasons,
                            ai_confidence: r.score >= 2 ? 80 : 60, // Simplified mapping
                            created_at: new Date().toISOString()
                        }));

                        await supabase
                            .from('alpha_engine_playbooks')
                            .upsert(strategiesToSave as any);

                        console.log(`[Scheduler] 💾 Saved ${results.length} conviction candidates to Playbooks.`);
                    }

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

    private async runAfterMarketJournal() {
        console.log('[Scheduler] 🌙 Running After Market Journaling (AI Trading Lab)...');
        try {
            if (!supabase) return;

            const today = new Date().toISOString().split('T')[0];
            const { data: trades } = await supabase
                .from('ai_trade_journals')
                .select('*')
                .gte('created_at', today)
                .order('created_at', { ascending: false });

            if (!trades || trades.length === 0) {
                console.log('[Scheduler] No trades today for journaling.');
                return;
            }

            const summary = trades.map((t: any) => `- ${t.stock_name} (${t.ticker}): ${t.result_type} [${t.profit_rate}%] - ${t.ai_analysis?.slice(0, 100)}...`).join('\n');

            await telegramService.sendMessage({
                title: '🌙 [AI 트레이딩 랩] 오늘의 매매 복기 및 일지',
                body: `오늘 총 ${trades.length}건의 매매가 있었습니다.\n\n### 주요 매매 내역\n${summary}\n\n상세 내용은 [진화] 메뉴의 'AI 트레이딩 랩 & 저널'에서 확인하실 수 있습니다.`,
                urgency: 'medium',
                emoji: '📝'
            });

        } catch (e) {
            console.error('[Scheduler] After Market Journal failed:', e);
        }
    }

    /**
     * Monitors active playbooks in the DB and executes trades if entry conditions are met.
     */

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
    private async scanForHunterStrategies(market: MarketTarget, type: 'GAP' | 'MORNING' | 'LUNCH' | 'AFTERNOON' | 'CLOSING') {
        if (!supabase) return;

        try {
            // 1. Fetch Active V2 Strategies
            const query = supabase
                .from('strategies')
                .select('*')
                .eq('is_active', true)
                .eq('market', market);

            // [Time-Based Filtering] Only fetch strategies valid for this time slot
            // Assuming strategies have a 'schedule_type' column or we filter in memory
            // For now, let's filter in memory if column doesn't exist, or rely on naming convention

            const { data: strategies, error } = await query;

            if (error || !strategies || strategies.length === 0) return;

            // Strict Schedule Matching
            const v2Strategies = strategies.filter((s: any) => {
                const isV2 = s.logic_v2 && s.logic_v2.children;
                if (!isV2) return false;

                // If schedule_type exists, check it. If not, check name.
                const schedule = s.schedule_type || 'ANY';

                // [Logic]
                // 'MORNING' scan -> allows 'MORNING' or 'ANY'
                // 'AFTERNOON' scan -> allows 'AFTERNOON' or 'ANY'
                // 'CLOSING' scan -> allows 'CLOSING' or 'ANY'

                if (schedule === 'ANY') return true;

                // Map Scheduler Type to Strategy Schedule
                // Scheduler: 'MORNING' | 'AFTERNOON' | 'CLOSING'
                // Strategy: 'MORNING' | 'AFTERNOON' | 'CLOSING'
                if (type === 'MORNING' && schedule === 'MORNING') return true;
                if (type === 'LUNCH' && schedule === 'LUNCH') return true;
                if (type === 'AFTERNOON' && schedule === 'AFTERNOON') return true;
                if (type === 'CLOSING' && (schedule === 'CLOSING' || schedule === 'JONGGA')) return true;

                // Temporary: If strategy name contains '종가' (Closing), only run in CLOSING
                if (s.name.includes('종가') && type !== 'CLOSING') return false;

                return false;
            });

            if (v2Strategies.length === 0) return;

            // 2. Define Scanning Universe (The "Neural Network")
            // [Comprehensive Monitoring Strategy]
            // Monitors: 
            // 1. Virtual Positions (Risk Management)
            // 2. User Watchlists (My Library)
            // 3. Alpha Playbooks (High Conviction & Quant Screener Results)
            // 4. Megatrend Analysis (Long-term Vision)

            const targetSet = new Set<string>();

            // Source 1: Virtual Positions (Must Watch)
            const { data: positions } = await supabase
                .from('virtual_positions')
                .select('ticker');
            // Note: All positions in virtual_positions are implicitly OPEN

            if (positions) {
                positions.forEach((p: any) => targetSet.add(p.ticker));
            }

            // Source 2: User Watchlists
            const { data: watchlists } = await supabase
                .from('user_watchlists')
                .select('items')
                .eq('market', market);

            if (watchlists) {
                watchlists.forEach((w: any) => {
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

            // Source 3: Alpha Playbooks (AI Picks - Filter Removed as requested)
            const { data: playbooks } = await supabase
                .from('alpha_engine_playbooks')
                .select('ticker')
                .eq('market', market);

            if (playbooks) {
                playbooks.forEach((p: any) => {
                    if (p.ticker && p.ticker !== '없음' && p.ticker !== 'null') targetSet.add(p.ticker);
                });
            }

            // Source 4: Megatrend Analysis
            try {
                const { data: megatrends } = await supabase
                    .from('megatrend_analysis')
                    .select('trends')
                    .eq('market_target', market)
                    .order('analyzed_at', { ascending: false })
                    .limit(1);

                if (megatrends && megatrends.length > 0) {
                    const latest = megatrends[0] as any;
                    let trendsData = latest.trends;
                    if (typeof trendsData === 'string') {
                        try { trendsData = JSON.parse(trendsData); } catch (e) { }
                    }
                    if (Array.isArray(trendsData)) {
                        trendsData.forEach((t: any) => {
                            if (Array.isArray(t.topStocks)) {
                                t.topStocks.forEach((s: string) => {
                                    // Extract ticker from "Name(Ticker)" format
                                    const match = s.match(/\(([A-Z0-9.]+)\)/) || s.match(/^([A-Z0-9.]+)$/);
                                    if (match && match[1]) targetSet.add(match[1]);
                                    else targetSet.add(s); // Try adding raw if no match
                                });
                            }
                        });
                    }
                }
            } catch (e) {
                console.warn('[Hunter] Failed to load Megatrends:', e);
            }

            // Fallback: Message only, NO HARDCODED STOCKS
            if (targetSet.size === 0) {
                console.log('[Hunter] ⚠️ Neural network empty. Nothing to scan.');
                return;
            }

            console.log(`[Hunter] 🕸️ Neural Network Active: Scanning ${targetSet.size} targets (Positions, Watchlists, Playbooks, Megatrends) with ${v2Strategies.length} strategies...`);

            // 3. Prepare Engine
            const { StrategyEngine } = await import('./strategy/StrategyEngine');
            const { RealDataProvider } = await import('./strategy/RealDataProvider');
            // FIX: Using dynamic import for dataService to ensure clean loading
            const { fetchDailyCandles } = await import('./dataService');

            // [BOTTOM-UP OVERRIDE] In Bear/Crash markets, force include Inverse ETFs
            // "Scanner-Driven" means we look for opportunities regardless of the macro regime.
            const regime = await marketRegimeService.analyzeCurrentRegime(market);
            if (regime.regime === 'BEAR' || regime.regime === 'PANIC') {
                console.log(`[Hunter] 🐻 Bear Market Detected (${regime.regime}). Injecting Inverse ETFs for Hedging...`);
                const inverseTickers = market === 'KR'
                    ? ['252670', '114800', '251340'] // KODEX 200 Inverse 2X, KODEX Inverse, KOSDAQ 150 Inverse
                    : ['SQQQ', 'SOXS', 'SPXU']; // ProShares UltraPro Short QQQ, etc.

                inverseTickers.forEach(t => targetSet.add(t));
            }

            const engine = new StrategyEngine();

            // 4. Execution Loop (Daily/Weekly Scan -> Stage 1)
            // 4. Execution Loop (Daily/Weekly Scan -> Stage 1)
            // [Optimization] Blacklist failed tickers to prevent infinite loops
            const now = Date.now();

            for (const ticker of Array.from(targetSet)) {
                // Check Blacklist
                if (this.failedTickers.has(ticker)) {
                    const failTime = this.failedTickers.get(ticker) || 0;
                    if (now - failTime < 60 * 60 * 1000) { // 1 Hour Cooldown
                        // console.log(`[Hunter] Skipping blacklisted ticker: ${ticker}`); 
                        continue;
                    } else {
                        this.failedTickers.delete(ticker); // Retry after cooldown
                    }
                }

                let candles: any[] = [];
                try {
                    // Fetch enough history for V2 Logic (e.g. 250 days for SEPA/SMA200)
                    candles = await fetchDailyCandles(ticker, market, 250);
                } catch (err) {
                    console.warn(`[Hunter] Failed to fetch data for ${ticker}, adding to blacklist.`);
                    this.failedTickers.set(ticker, Date.now());
                    continue;
                }

                // If candles empty despite no error (e.g. invalid response)
                if (!candles || candles.length < 50) {
                    this.failedTickers.set(ticker, Date.now());
                    continue;
                }

                if (!candles || candles.length < 50) continue;

                // [DAILY LEADER FILTER] Apply technical analysis criteria
                // Only proceed with stocks that meet daily leader standards
                try {
                    const { analyzeDailyLeaderCriteria } = await import('./technicalAnalysis');
                    const leaderAnalysis = analyzeDailyLeaderCriteria(candles);

                    // [Learning Mode] Lowered threshold to 20 (was 75)
                    // Allow more experimental trades for learning
                    if (leaderAnalysis.score < 20) {
                        console.log(`[Hunter] ⏭️  ${ticker} skipped - Daily Leader score: ${leaderAnalysis.score}/100`);
                        continue;
                    }

                    console.log(`[Hunter] ✅ ${ticker} passes Daily Leader filter (${leaderAnalysis.score}/100)`);
                } catch (err) {
                    console.warn(`[Hunter] Daily Leader analysis failed for ${ticker}:`, err);
                    // Continue anyway if analysis fails (graceful degradation)
                }

                // Create Provider with real candles
                const provider = new RealDataProvider(candles);

                for (const strategy of (v2Strategies as any[])) {
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

// [Entry Point] Start Scheduler if run directly (Node.js only)
// Protected against Browser execution to prevent "Module url externalized" error
(async () => {
    try {
        if (typeof process !== 'undefined' && process.argv && process.argv[1]) {
            const { fileURLToPath } = await import('url');
            if (process.argv[1] === fileURLToPath(import.meta.url)) {
                await import('dotenv/config'); // Load env vars dynamically
                autonomousScheduler.start().catch((err: any) => {
                    console.error('[Scheduler] Fatal Error:', err);
                    process.exit(1);
                });
            }
        }
    } catch (e) {
        // Ignore errors in browser or if url module missing
    }
})();
