// services/AutoPilotService.ts
import { virtualTradingService } from './VirtualTradingService';
import { marketRegimeService } from './MarketRegimeService';
import { supabase } from './supabaseClient';
// import { sniperTriggerService } from './SniperTriggerService'; // Circular Dependency Fix: Lazy Load or Inject
import { telegramService } from './telegramService';
import { _fetchLatestPrice, fetchDailyCandles } from './dataService';
import type { MarketTarget } from '../types';
import { strategyCommander } from './gemini/StrategyCommander';
import { morningBriefingScheduler } from './schedulers/MorningBriefingScheduler';
import { evolutionService } from './EvolutionService';
import { deepResearchService } from './DeepResearchService';
import { telegramIntelligenceService } from './TelegramIntelligenceService';
import { longTermPortfolioService } from './LongTermPortfolioService';
import { quantScreenerScheduler } from './schedulers/QuantScreenerScheduler';
import type { SniperTriggerService } from './SniperTriggerService'; // Type only import

class AutoPilotService {
    private isRunning: boolean = false;
    private cycleInterval: any = null;
    private marketTarget: MarketTarget = 'KR'; // Default to KR
    private tradingMode: 'AGGRESSIVE' | 'SELECTIVE' = 'SELECTIVE';
    private currentMarketRegime: string = 'NEUTRAL'; // Track current regime

    // Dynamic Trading Parameters (Predator Mode)
    private dynamicConfig = {
        stopLoss: -30.0, // Deep Valley Tolerance relative to entry
        takeProfit: 100.0, // Let winners run (The 10-bagger mindset)
        trailingStop: 5.0, // Give breathing room
        maxDrawdownTolerance: 30.0,
        pyramidingEnabled: true // Enable Scale-up logic
    };

    // System Protection State
    private circuitBreaker = {
        triggered: false,
        triggerTime: 0,
        reason: ''
    };

    constructor() {
        // Constructor decoupled from SniperTriggerService to avoid circular dependency
    }

    // Method Injection to break circular dependency
    public bindSniperTrigger(sniperService: SniperTriggerService) {
        sniperService.setOnTriggerCallback(async (trigger) => {
            console.log(`[AutoPilot] 🕒 Realtime Trigger Received: ${trigger.stockName}`);
            await this.logThought({
                ticker: trigger.ticker,
                action: 'DECISION',
                message: `실시간 급등 포착: ${trigger.type}`,
                details: trigger,
                confidence: trigger.score
            });
            await this.executeSignal(trigger);
        });
        console.log('[AutoPilot] Sniper Trigger Bound Successfully.');
    }

    public setMarketTarget(target: MarketTarget) {
        this.marketTarget = target;
        virtualTradingService.setMarketTarget(target);
        console.log(`[AutoPilot] Market target set to: ${target}`);
    }

    public setTradingMode(mode: 'AGGRESSIVE' | 'SELECTIVE') {
        this.tradingMode = mode;
        console.log(`[AutoPilot] Trading mode set to: ${mode}`);
    }

    public setStrategy(strategy: string) {
        console.log(`[AutoPilot] Manual strategy override: ${strategy}`);
    }

    public async start() {
        if (this.isRunning) return;
        this.isRunning = true;
        // Register as handler for Telegram Intelligence
        telegramIntelligenceService.setSignalHandler(this.processExternalInsight.bind(this));

        console.log('[AutoPilot] Service started', '(Intel Active via Supabase Realtime)');

        // Initial run
        this.runCycle();
        morningBriefingScheduler.start();

        // Start loop
        this.cycleInterval = setInterval(() => {
            this.runCycle();
        }, 300000); // 5분 주기

        // Trigger evolution check once a day (e.g., check right now)
        this.evolveParameters();

        // [NEW] Run Evolution Protocol every 4 hours (Darwin Engine)
        setInterval(() => {
            const now = new Date();
            // Optional: Check if market is closed or specific time?
            // For now, run periodically to allow continuous evolution.
            this.evolveParameters();
        }, 4 * 60 * 60 * 1000); // 4시간 주기

        // [NEW] Process user intelligence briefings every 10 minutes
        this.processUserBriefings();
        setInterval(() => this.processUserBriefings(), 600000); // 10분 주기

        // [NEW] Start Quant Screener Scheduler (Smart Schedule)
        quantScreenerScheduler.start();
    }

    private async processUserBriefings() {
        try {
            const { intelligenceBriefingProcessor } = await import('./IntelligenceBriefingProcessor');
            await intelligenceBriefingProcessor.processAllPending();
        } catch (error) {
            console.error('[AutoPilot] Failed to process user briefings:', error);
        }
    }

    public async processExternalInsight(signal: any) {
        // [Refactor] News/Intel -> Playbook (Hunter) -> Sniper -> Execute
        console.log(`[AutoPilot] 📨 External Signal Received: ${signal.stockName} (Score: ${signal.score})`);

        // Exception: If Confidence is EXTREME (Dynamic Threshold), we trust the Intel immediately
        // [Evolution] Dynamic Threshold from Darwinian Engine
        const bypassThreshold = evolutionService.getSniperConfig().bypassThreshold;

        try {
            if (signal.score >= bypassThreshold) {
                console.log(`[AutoPilot] ⚡ HIGH PRIORITY INTEL (Score ${signal.score} >= ${bypassThreshold}): Executing Immediate Buy for ${signal.stockName}`);

                // Tag as INTEL_BYPASS for Evolution tracking
                signal.strategy = 'INTEL_BYPASS';

                // [Fix] Also add to Playbook as 'EXECUTED' for visibility (In-Memory)
                sniperTriggerService.addToWatchlist(
                    signal.ticker,
                    signal.stockName,
                    'INTEL_BYPASS',
                    signal.score,
                    'EXECUTED'
                );

                // [Deep Research] Check for Priced-In Risk
                const researchResult = await deepResearchService.analyzePricedInRisk(signal.ticker, this.marketTarget);

                if (researchResult.isPricedIn) {
                    console.warn(`[AutoPilot] 🛡️ Deep Research Alert: Signal for ${signal.stockName} is Priced-In (Risk: ${researchResult.riskScore}). Downgrading to Watchlist.`);
                    console.warn(`[AutoPilot] 🔎 Rationale: ${researchResult.rationale}`);

                    // Downgrade to Watchlist Logic (Same as else block)
                    sniperTriggerService.addToWatchlist(
                        signal.ticker,
                        signal.stockName,
                        'INTEL_PRICED_IN', // Special Source
                        signal.score
                    );

                    await this.logThought({
                        ticker: signal.ticker,
                        action: 'ANALYSIS',
                        message: `[Deep Research] 선반영 위험 감지(Risk ${researchResult.riskScore}): 즉시 매수 보류 및 정밀 타격(스나이퍼) 모드로 전환.`,
                        confidence: signal.score,
                        details: `Rationale: ${researchResult.rationale}`
                    });

                } else {
                    // [Persistence] Save to Supabase (EXECUTED)
                    const analysisPayload = {
                        ticker: signal.ticker,
                        stockName: signal.stockName,
                        referencePrice: signal.currentPrice || 0,
                        priceTimestamp: new Date().toISOString(),
                        status: 'ActionableSignal',
                        psychoanalystAnalysis: { confidenceScore: signal.score, reason: signal.details || 'External Signal - High Confidence' },
                        strategistAnalysis: { strategyRecommendation: 'INTEL_BYPASS' },
                        synthesis: { finalVerdict: 'BUY', confidenceScore: signal.score, rationale: 'Sniper Bypass Executed' },
                        stockDossier: { companySummary: 'AI Auto-Generated', positiveNews: [], negativeNews: [], mainProducts: [] }
                    };

                    await (supabase as any).from('user_analysis_history').upsert({
                        ticker: signal.ticker,
                        stock_name: signal.stockName,
                        analysis_result: analysisPayload,
                        created_at: new Date().toISOString()
                    });

                    // Execute Immediately
                    await this.executeSignal(signal);
                }

            } else {
                console.log(`[AutoPilot] 🔭 Added to Sniper Watchlist: ${signal.stockName} (Score ${signal.score})`);

                sniperTriggerService.addToWatchlist(
                    signal.ticker,
                    signal.stockName,
                    'INTELLIGENCE',
                    signal.score
                );

                // [Persistence] Save to Supabase (WATCHING)
                const analysisPayload = {
                    ticker: signal.ticker,
                    stockName: signal.stockName,
                    referencePrice: signal.currentPrice || 0,
                    priceTimestamp: new Date().toISOString(),
                    status: 'Watchlist',
                    psychoanalystAnalysis: { confidenceScore: signal.score, reason: signal.details || 'External Signal - Waiting for Confirmation' },
                    strategistAnalysis: { strategyRecommendation: 'INTELLIGENCE' },
                    synthesis: { finalVerdict: 'WATCH', confidenceScore: signal.score, rationale: 'Waiting for Technical Confirmation (Sniper Mode)' },
                    stockDossier: { companySummary: 'AI Auto-Generated', positiveNews: [], negativeNews: [], mainProducts: [] }
                };

                await (supabase as any).from('user_analysis_history').upsert({
                    ticker: signal.ticker,
                    stock_name: signal.stockName,
                    analysis_result: analysisPayload,
                    created_at: new Date().toISOString()
                });

                await this.logThought({
                    ticker: signal.ticker,
                    action: 'ANALYSIS',
                    message: `인텔리전스 종목을 감시 목록(Playbook)에 추가: ${signal.stockName}`,
                    confidence: signal.score,
                    details: 'Waiting for Technical Confirmation (Sniper Mode)'
                });
            }
        } catch (error) {
            console.error(`[AutoPilot] Error processing external insight for ${signal.stockName}:`, error);
        }
    }

    public stop() {
        this.isRunning = false;
        if (this.cycleInterval) {
            clearInterval(this.cycleInterval);
        }
        console.log('[AutoPilot] Service stopped');
    }

    public getStatus() {
        return {
            isRunning: this.isRunning,
            marketTarget: this.marketTarget,
            tradingMode: this.tradingMode
        };
    }

    public getStrategyConfig() {
        return {
            mode: this.tradingMode,
            market: this.marketTarget,
            activeStrategies: ['SEPA', 'ATR_TRAILING', 'KELLY_CRITERION', 'TRINITY_SWITCHING']
        };
    }

    private isKoreanMarketOpen(): boolean {
        const now = new Date();
        const kstNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
        const day = kstNow.getDay();
        const hour = kstNow.getHours();
        const minute = kstNow.getMinutes();

        // Weekend check
        if (day === 0 || day === 6) return false;

        // Market hours: 09:00 ~ 15:30
        const currentMinutes = hour * 60 + minute;
        const openMinutes = 9 * 60;
        const closeMinutes = 15 * 60 + 30;

        return currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
    }

    private isPowerHour(): boolean {
        const now = new Date();
        const kstNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
        const hour = kstNow.getHours();
        const minute = kstNow.getMinutes();

        // KR Power Hour: 15:00 ~ 15:20 (Before Closing)
        if (this.marketTarget === 'KR') {
            return hour === 15 && minute >= 0 && minute <= 20;
        }
        // US Power Hour: 15:00 ~ 15:50 EST (Simplified logic needed for US timezone, skipping for brevity)
        return false;
    }

    private async checkAndSwitchMarket(forceTicker?: string) {
        const now = new Date();
        const kstNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
        const hour = kstNow.getHours();
        const minute = kstNow.getMinutes();
        const currentMinutes = hour * 60 + minute;

        // KR Market: 09:00 ~ 15:30
        const krOpen = 9 * 60;
        const krClose = 15 * 60 + 30;

        // US Market: 22:30 ~ 05:00 (Standard Time) - Simplified
        const usOpen = 22 * 60 + 30;
        const usClose = 5 * 60;

        let target: MarketTarget = 'KR';

        if (forceTicker) {
            // Dynamic Market Detection based on Ticker Format
            if (/^[0-9]{5,6}$/.test(forceTicker)) target = 'KR';
            else if (/^[A-Za-z]+$/.test(forceTicker)) target = 'US';
            else target = 'KR'; // Default
        } else {
            // Time-based fallback
            if (hour >= 9 && hour < 16) target = 'KR';
            else if (hour >= 18 || hour < 5) target = 'US'; // Preparing for US
            else target = 'KR';
        }

        if (this.marketTarget !== target) {
            console.log(`[AutoPilot] 🔄 Switching Market: ${this.marketTarget} -> ${target}`);
            this.setMarketTarget(target);

            // When switching markets, re-evaluate parameters
            this.evolveParameters();
        }
    }

    private async evolveParameters() {
        console.log('[AutoPilot] 🧬 Initiating Neural Evolution Protocol...');

        // Delegate to the specialized Evolution Brain
        try {
            await evolutionService.evolve();

            // Sync dynamic config with the latest wisdom from EvolutionService
            // (Assuming EvolutionService updates shared state or DB, and we might reload config here if needed)
            // For now, we trust EvolutionService to log its own progress.

            await this.logThought({
                action: 'ANALYSIS',
                message: `Neural Evolution Cycle Completed. Strategy weights optimized.`,
                confidence: 100,
                strategy: 'EVOLUTION'
            });
        } catch (error) {
            console.error('[AutoPilot] Evolution Protocol Failed:', error);
        }
    }

    private async logThought(log: {
        ticker?: string;
        action: 'SCAN' | 'ANALYSIS' | 'DECISION' | 'EXECUTION';
        confidence?: number;
        message: string;
        details?: any;
        strategy?: string;
    }) {
        try {
            if (!supabase) {
                console.warn('[AutoPilot] Supabase not available for thought logging');
                return;
            }
            // Fire and forget
            supabase.from('ai_thought_logs').insert({
                ticker: log.ticker,
                action: log.action,
                confidence: log.confidence,
                message: log.message,
                details: log.details,
                strategy: log.strategy,
                created_at: new Date().toISOString()
            } as any).then(({ error }) => {
                if (error) console.error('[AutoPilot] Failed to log thought:', error);
            });
        } catch (e) {
            console.error('[AutoPilot] Error logging thought:', e);
        }
    }

    private async runCycle() {
        if (!this.isRunning) return;

        try {
            // 0. Check Market & Time
            await this.checkAndSwitchMarket();

            console.log(`[AutoPilot] 🔄 Starting Autonomous Cycle (${this.marketTarget})...`);

            // [Constitution Article 4] Check Circuit Breaker
            if (this.circuitBreaker.triggered) {
                const elapsedMinutes = (Date.now() - this.circuitBreaker.triggerTime) / 60000;
                if (elapsedMinutes < 60) {
                    console.warn(`[AutoPilot] 🛑 Circuit Breaker Active. Trading Halt. Reason: ${this.circuitBreaker.reason} (${Math.floor(60 - elapsedMinutes)}m remaining)`);
                    return; // Skip cycle
                } else {
                    console.log(`[AutoPilot] 🟢 Circuit Breaker Reset. Resuming Operations.`);
                    this.circuitBreaker.triggered = false;
                    this.circuitBreaker.reason = '';
                }
            }

            // 1. Gather Context (Market Data)
            const marketData = await marketRegimeService.analyzeCurrentRegime(this.marketTarget);
            this.currentMarketRegime = marketData.regime; // Update regime
            const headlines: string[] = [];

            // [Fix] Fetch 15 most recent telegram messages to inform the Commander
            if (supabase) {
                const { data: recentMsgs } = await supabase
                    .from('telegram_messages')
                    .select('message, created_at')
                    .order('created_at', { ascending: false })
                    .limit(15);

                if (recentMsgs && recentMsgs.length > 0) {
                    // [NEW] Deep Research Integration: Filter out 'Fake News' or 'Traps'
                    for (const msg of recentMsgs) {
                        // Simple extraction of Ticker (Naive regex for now, better to use LLM later)
                        // Improved Regex: Match 6 digits (KR) or 2-5 uppercase chars (US, but exclude common words like AI, EV, CEO)
                        const invalidTickers = ['AI', 'EV', 'CEO', 'IPO', 'ETF', 'USA', 'GDP', 'CPI'];
                        const tickerMatch = msg.message.match(/[A-Z]{2,5}|[0-9]{6}/g);

                        let ticker = '';
                        if (tickerMatch) {
                            // Find first valid ticker
                            const candidate = tickerMatch.find(t =>
                                (t.length === 6 && !isNaN(Number(t)) && !t.startsWith('2024') && !t.startsWith('2025')) || // KR Ticker (6 digits, no years)
                                (t.length >= 2 && !invalidTickers.includes(t) && !t.match(/[0-9]/)) // US Ticker (No digits, not ignored)
                            );
                            if (candidate) ticker = candidate;
                        }

                        if (ticker) {
                            // Run verification "Ghost Protocol"
                            // Assume Bullish for now unless negative keywords found
                            const sentiment = msg.message.includes('하락') || msg.message.includes('매도') ? 'BEARISH' : 'BULLISH';

                            const integrity = await deepResearchService.verifyNewsIntegrity(ticker, msg.message, sentiment, this.marketTarget);

                            if (integrity.isManipulation) {
                                console.warn(`[AutoPilot] ⚠️ Discarding News for ${ticker}: ${integrity.insight}`);
                                continue; // Skip adding this to headlines
                            } else {
                                // Append verifiable connection
                                headlines.push(`[Verified] ${msg.message} (Whale Action: ${integrity.whalesAction})`);
                            }
                        } else {
                            headlines.push(msg.message.substring(0, 200));
                        }
                    }
                    console.log(`[AutoPilot] 📰 Fed ${headlines.length} verified intelligence items to Commander.`);
                }
            }

            // [Evolutionary Learning] Fetch Recent Lessons from DB
            let recentLessons: string[] = [];
            if (supabase) {
                const { data: lessons } = await supabase
                    .from('ai_trade_journals')
                    .select('lessons_learned')
                    .order('created_at', { ascending: false })
                    .limit(5);

                if (lessons) {
                    recentLessons = (lessons as any[]).map(l => l.lessons_learned).filter(l => l);
                    if (recentLessons.length > 0) {
                        console.log(`[AutoPilot] 🧠 Recalled ${recentLessons.length} lessons from past trades.`);
                    }
                }
            }

            // 2. Ask Strategy Commander
            const decision = await strategyCommander.decideStrategy(marketData, headlines, recentLessons);

            // Log the Commander's thought process
            await this.logThought({
                action: 'ANALYSIS',
                message: `[Commander] ${decision.rationale}`,
                confidence: 85,
                details: decision,
                strategy: 'AI_COMMAND'
            });


            console.log(`[AutoPilot] 👨‍✈️ Commander Decision: ${decision.marketStatus} | Focus: ${decision.focusSectors.join(', ')} `);
            console.log(`[AutoPilot] 🛠️ Deploying Tools: ${decision.scannersToActivate.join(', ')} `);

            // 3. Execute Recommended Tools Dynamically
            // ... (Handled by Schedulers)

            // [POWER HOUR] Closing Bell Betting (15:00 ~ 15:20)
            if (this.isPowerHour()) {
                console.log('[AutoPilot] 🔔 POWER HOUR ACTIVE: Hunting for Closing Bell Bets!');
                await this.logThought({
                    action: 'SCAN',
                    message: 'Power Hour Detected. Scanning for strong close candidates.',
                    confidence: 95,
                    strategy: 'CLOSING_BELL'
                });
            }

            // [NEW] 4. Sniper Execution from Playbook (The Missing Link)
            if (supabase) {
                const { data } = await supabase
                    .from('alpha_engine_playbooks')
                    .select('*')
                    .eq('market', this.marketTarget)
                    .eq('status', 'WATCHING');

                const playbookItems = data as any[];

                if (playbookItems && playbookItems.length > 0) {
                    console.log(`[AutoPilot] 🔭 Monitoring ${playbookItems.length} Playbook Candidates...`);
                    for (const item of playbookItems) {
                        try {
                            // [Guard] Skip invalid tickers from bad LLM generation or mock data
                            const invalidTickers = ['ABC', 'LMN', 'XYZ', 'NA', 'LITH', 'SAMPLE'];
                            if (item.ticker.includes('종목코드') ||
                                item.ticker.includes('StockCode') ||
                                item.ticker.length < 2 ||
                                invalidTickers.includes(item.ticker.toUpperCase().trim()) ||
                                item.ticker.trim().toLowerCase().includes('lith') // specific case
                            ) {
                                console.warn(`[AutoPilot] ⚠️ Skipping invalid playbook item: ${item.ticker} (${item.stockName})`);
                                continue;
                            }

                            // Check Price
                            const priceData = await _fetchLatestPrice(item.ticker, item.ticker, this.marketTarget);
                            if (!priceData || priceData.price <= 0) continue;

                            // Evaluate Entry (Sniper Logic)
                            let shouldBuy = false;
                            let reason = '';

                            const entryPlan = item.entry_plan || {};
                            const triggerPrice = entryPlan.trigger_price || 0;
                            const condition = entryPlan.condition || 'BREAKOUT';

                            // Logic: If trigger_price is 0 (missing), we assume immediate buy if sentiment is high? 
                            // No, safety first. If no plan, we watch. 
                            // Exception: If created just now (fresh signal), we might want to check volatility.

                            if (triggerPrice > 0) {
                                if (condition === 'PULLBACK' && priceData.price <= triggerPrice * 1.02) { // 2% buffer
                                    shouldBuy = true;
                                    reason = `🎯 Sniper Hit: Pullback to ${triggerPrice} (Current: ${priceData.price})`;
                                } else if (condition === 'BREAKOUT' && priceData.price >= triggerPrice) {
                                    shouldBuy = true;
                                    reason = `🚀 Sniper Hit: Breakout above ${triggerPrice} (Current: ${priceData.price})`;
                                }
                            } else {
                                // Fallback: If AI didn't give a price, check recent candle pattern or just buy if filtered by Conviction
                                // For now, simple fallback: Buy if price is moving up (> 2%)
                                if (priceData.changeRate > 2.0) {
                                    shouldBuy = true;
                                    reason = `🔥 Momentum Follow: No hard trigger, but price is running (+${priceData.changeRate}%)`;
                                }
                            }

                            if (shouldBuy) {
                                // EXECUTE
                                await this.executeSignal({
                                    ticker: item.ticker,
                                    stockName: item.ticker,
                                    type: `PLAYBOOK_${item.pattern_name}`,
                                    score: 95,
                                    currentPrice: priceData.price,
                                    changeRate: priceData.changeRate,
                                    volume: priceData.volume,
                                    details: reason
                                });

                                // Update Playbook Status to BOUGHT so we don't buy again
                                await supabase.from('alpha_engine_playbooks')
                                    .update({ status: 'BOUGHT', updated_at: new Date().toISOString() } as any)
                                    .eq('id', item.id);

                                console.log(`[AutoPilot] ✅ Playbook Item Executed & Closed: ${item.ticker}`);
                            }
                        } catch (e) {
                            console.error(`[AutoPilot] Error monitoring playbook item ${item.ticker}:`, e);
                        }
                    }
                }
            }

            // 5. Monitor Positions (Always active)
            await this.monitorPositions();

        } catch (error) {
            console.error('[Shadow Trader] Cycle Error:', error);
            await this.logThought({
                action: 'ANALYSIS',
                message: `Cycle Error: ${error instanceof Error ? error.message : 'Unknown error'} `,
                details: { error }
            });
        }
    }

    /**
     * Determine optimal strategy based on Trigger Type & Market Regime
     */
    private determineStrategy(triggerType: string, regime: string): 'DAY' | 'SWING' | 'LONG' {
        // 1. Volatility Breakout -> Always DAY (Scalping)
        if (triggerType === 'VOLATILITY_BREAKOUT') return 'DAY';

        // 2. Volume Spike -> Depends on Regime
        if (triggerType === 'VOLUME_SPIKE') {
            // In Bull market, hold for Swing
            if (regime === 'BULL' || regime === 'STRONG_BULL') return 'SWING';
            // In Bear market, take quick profits (Day)
            return 'DAY';
        }

        // 3. Eagle Eye (Smart Money) -> Usually Swing
        if (triggerType === 'EAGLE_EYE') return 'SWING';

        // 4. Value Pivot -> Swing or Long
        if (triggerType === 'VALUE_PIVOT') {
            if (regime === 'CRASH' || regime === 'BEAR') return 'LONG'; // Deep value
            return 'SWING';
        }
        // Default
        return 'DAY';
    }

    public async executeSignal(trigger: any) {
        // [Safety] Market Open Check
        if (this.marketTarget === 'US') {
            const now = new Date();
            const kstNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
            const currentMinutes = kstNow.getHours() * 60 + kstNow.getMinutes();
            // US Open is approx 23:30 KST (1410 mins) or 22:30 (1350 mins)
            // Using strict 23:30 for Standard Time based on dateUtils
            const usOpenMinutes = 23 * 60 + 30;
            const usCloseMinutes = 6 * 60; // Next day 06:00

            // Handle day crossing (23:30 ~ 24:00 and 00:00 ~ 06:00)
            const isLateNight = currentMinutes >= usOpenMinutes;
            const isEarlyMorning = currentMinutes < usCloseMinutes;

            if (!isLateNight && !isEarlyMorning) {
                // [Use-Case] Extended Hours Check (User Request: "Meaningful Timing")
                if (this.isExtendedSniperWindow(trigger)) {
                    console.log(`[AutoPilot] 🌙 Extended Hours Snipe! Attempting execution for ${trigger.stockName} (Score ${trigger.score})`);
                    // IMPORTANT: We must ensure LIMIT ORDER logic in real trading, 
                    // but for Virtual Service, we proceed.
                } else {
                    console.warn(`[AutoPilot] 🛑 Trade Rejected: US Market Closed (Current KST: ${kstNow.toLocaleTimeString()}). Waiting for 23:30 Open.`);
                    return;
                }
            }
        } else if (this.marketTarget === 'KR') {
            if (!this.isKoreanMarketOpen()) {
                // [Use-Case] Extended Hours Check
                if (this.isExtendedSniperWindow(trigger)) {
                    console.log(`[AutoPilot] 🌅 KR Extended Hours Snipe! Attempting execution for ${trigger.stockName}`);
                } else {
                    console.warn(`[AutoPilot] 🛑 Trade Rejected: KR Market Closed.`);
                    return;
                }
            }
        }

        // Simple execution logic for now, can be expanded
        const account = virtualTradingService.getAccount();
        if (account.positions.find(p => p.ticker === trigger.ticker)) return;

        console.log(`[AutoPilot] Executing signal for ${trigger.stockName}`);

        // [VALIDATION] Strict Ticker Validation
        let ticker = String(trigger.ticker || '').trim().toUpperCase(); // Normalize
        let stockName = trigger.stockName;

        // [FEATURE] Index to ETF Mapping (User Request)
        if (ticker === 'KOSPI') {
            console.log(`[AutoPilot] 🔄 Mapping KOSPI Index -> KODEX 200 ETF(069500)`);
            ticker = '069500';
            stockName = 'KODEX 200';
            // Reset price to force fetch for the ETF, not the Index value
            trigger.currentPrice = 0;
        } else if (ticker === 'KOSDAQ') {
            console.log(`[AutoPilot] 🔄 Mapping KOSDAQ Index -> KODEX KOSDAQ150(229200)`);
            ticker = '229200';
            stockName = 'KODEX KOSDAQ150';
            trigger.currentPrice = 0;
        }

        if (!ticker || ticker === '미제공') {
            console.log(`[AutoPilot] 🛑 Signal Blocked: Invalid Ticker(${ticker})`);
            return;
        }

        // 1. Ensure we are in the correct market mode for this ticker
        await this.checkAndSwitchMarket(ticker);

        // Filter out Date-like tickers (e.g., 20251212)
        if (/^20\d{6}$/.test(ticker)) {
            console.warn(`[AutoPilot] 🛑 Signal Blocked: Ticker looks like a date(${ticker})`);
            return;
        }

        // KR Market: Must be 6 digits (KOSPI/KOSDAQ)
        if (this.marketTarget === 'KR') {
            if (!/^\d{6}$/.test(ticker)) {
                // Allow some special ETF cases if needed, but standard is 6 digits
                console.warn(`[AutoPilot] 🛑 Signal Blocked: Invalid KR Ticker Format(${ticker})`);
                return;
            }
        }

        // US Market: Alphanumeric (1-5 chars usually, sometimes dots like BRK.B -> BRK-B)
        // Relaxing regex to allow common US formats
        if (this.marketTarget === 'US') {
            if (!/^[A-Z]{1,6}$/.test(ticker) && !ticker.includes('-')) {
                // Check logic: 1-6 chars OR contains hyphen (BRK-B)
                console.warn(`[AutoPilot] 🛑 Signal Blocked: Invalid US Ticker Format(${ticker})`);
                return;
            }
            // Filter out Commodities / Crypto that might be misidentified as tickers
            const BLOCKED_ASSETS = ['XAG', 'XAU', 'BTC', 'ETH', 'USDT', 'LTC', 'XRP', 'DOGE', 'SOL', 'ADA'];
            if (BLOCKED_ASSETS.includes(ticker)) {
                console.log(`[AutoPilot] 🛑 Signal Blocked: Asset not tradable via Stock API(${ticker})`);
                return;
            }
        }

        // [Constitution Article 4] Circuit Breaker Check
        if (this.circuitBreaker.triggered) {
            console.warn(`[AutoPilot] 🛑 Signal Blocked: Circuit Breaker Active(${this.circuitBreaker.reason})`);
            return;
        }

        /**
         * ❄️ Winter Survival Tactics (Inverse/Hedge)
         * If Market is Bearish, we prioritize Inverse ETFs.
         */
        if (this.currentMarketRegime.includes('BEAR')) {
            // Check if this is a Hedge Signal
            const isHedge = trigger.stockName.includes('인버스') || trigger.stockName.includes('SQQQ') || trigger.stockName.includes('SOXS');

            if (isHedge) {
                console.log(`[AutoPilot] ❄️ Winter Protocol: Boosting Hedge Signal for ${trigger.stockName}(+30 Confidence)`);
                trigger.score = (trigger.score || 50) + 30; // Boost Score
            } else {
                console.log(`[AutoPilot] ❄️ Winter Protocol: Penalizing Long Signal for ${trigger.stockName}(-20 Confidence)`);
                trigger.score = (trigger.score || 50) - 20; // Penalize Long
            }
        } else if (this.currentMarketRegime === 'SIDEWAYS') {
            // Box Trading Mode: Boost Rebound Signals
            // If trigger type is 'SUPPORT_REBOUND' (Support Line Bounce), give bonus
            if (trigger.type === 'SUPPORT_REBOUND') {
                console.log(`[AutoPilot] 📦 Box Theory: Boosting Rebound Signal for ${trigger.stockName}(+15 Confidence)`);
                trigger.score = (trigger.score || 50) + 15;
            }
        }


        try {
            const currentExposure = (account.totalAsset - account.cash) / account.totalAsset;

            // [Constitution Article 1: Hunger Logic]
            // "Hunger = Volatility". If Cash > 90%, we don't lower standards for garbage.
            // We target "Wild" stocks (High Volatility + High Liquidity).

            let requiredConfidence = 60;
            let isHungryMode = false;

            if (currentExposure < 0.1) { // Hungry (Cash > 90%)
                // Hunger Logic v2: The "Wild Beast" Protocol
                const volatility = trigger.volatility || 0;
                const rvol = trigger.rvol || 0;
                const isProfitable = (trigger.operatingIncome || 1) > 0; // Financial Filter (Default safe if unknown)

                // High Volatility (>3%) + High Liquidity (RVOL > 2.0) + Not Junk
                if (volatility > 3.0 && rvol > 2.0 && isProfitable) {
                    console.log(`[AutoPilot] 🥣 Hunger Logic Activated: Targeting Volatility!(Vol: ${volatility.toFixed(2)} %, RVOL: ${rvol.toFixed(2)})`);
                    requiredConfidence = 50; // Entry barrier lowered for High Volatility
                    isHungryMode = true;
                }
            }

            const confidence = trigger.score || 0;

            if (confidence < requiredConfidence) {
                console.log(`[AutoPilot] ⚠️ Signal REJECTED: ${trigger.stockName} (Confidence: ${confidence}% <${requiredConfidence} %)`);
                return; // Don't execute low-confidence trades
            }

            // [CRITICAL FIX] Ensure valid price before trading
            if (!trigger.currentPrice || trigger.currentPrice <= 0) {
                console.log(`[AutoPilot] ⚠️ Price missing for ${stockName}(${ticker}).Attempting fetch...`);
                // Use swapped ticker for fetch
                const freshData = await _fetchLatestPrice(ticker, stockName, this.marketTarget);
                if (freshData && freshData.price > 0) {
                    trigger.currentPrice = freshData.price;
                    trigger.changeRate = freshData.changeRate; // Update context as well
                    console.log(`[AutoPilot] ✅ Price repaired: ${trigger.currentPrice} `);
                } else {
                    console.error(`[AutoPilot] 🛑 Trade Aborted: Invalid Price(${trigger.currentPrice}) for ${stockName}`);
                    return;
                }
            }

            // AI Strategy Selection
            const optimalStrategy = this.determineStrategy(trigger.type, this.currentMarketRegime);
            console.log(`[AutoPilot] 🧠 Strategy Selected: ${optimalStrategy} (Trigger: ${trigger.type}, Regime: ${this.currentMarketRegime})`);

            // [Constitution Article 2: Pyramiding]
            // Principle: "Never average down. Only Scale Up."
            // Initial Entry: ALWAYS 5% (Scout) unless it's a "Sure Thing" (Tier 1 Source).

            const totalEquity = account.totalAsset;
            let targetRatio = 0.05; // Default Stage 1: Scout (5%)
            let bettingType = 'SCOUT';

            // Exception: If Intelligence Source is Tier 1 (Official), we can start larger?
            // Constitution says Scout 5%. We stick to 5%.

            if (isHungryMode) {
                bettingType = 'HUNGER_SCOUT';
                // Hunger bets are also 5%. We don't bet the farm on wild dogs.
            }

            // [ADJUSTMENT] Realism Cap (User Feedback)
            // Limit max bet to 10M KRW / $10k USD per trade to avoid "Explosive" fear in virtual mode
            const HARD_CAP = this.marketTarget === 'KR' ? 10000000 : 10000;
            let targetAmount = Math.min(totalEquity * targetRatio, HARD_CAP);

            // [Constitution Addendum] Core-Satellite Budget Check
            // Ask LongTermService if we have budget for Satellite trades
            // We approximate current satellite exposure as (TotalAsset - Cash) for now, 
            // assuming all current positions are Satellite (AutoPilot managed).
            // In future, we might distinguish Core vs Satellite in position data.
            const currentSatelliteExposure = account.totalAsset - account.cash;
            const satelliteBudget = longTermPortfolioService.getSatelliteBudget(totalEquity, currentSatelliteExposure);

            if (satelliteBudget <= 0 && !isHungryMode) {
                console.warn(`[AutoPilot] 🚫 Satellite Budget Exceeded(Max 30 %).Rejecting new entry for ${stockName}.`);
                return;
            } else if (satelliteBudget < targetAmount) {
                console.log(`[AutoPilot] 📉 Capping Position Size to Remaining Budget: ${targetAmount} -> ${satelliteBudget} `);
                targetAmount = satelliteBudget;
            }

            // Convert to Shares
            let quantity = Math.floor(targetAmount / trigger.currentPrice);

            // 3. Liquidity Constraint: Never buy more than 1% of current volume
            if (trigger.volume && trigger.volume > 0) {
                const maxLiquidQty = Math.floor(trigger.volume * 0.01);
                if (quantity > maxLiquidQty) {
                    console.log(`[AutoPilot] 🛡️ Liquidity Safety Triggered: Capping ${quantity} -> ${maxLiquidQty} shares(${stockName})`);
                    quantity = maxLiquidQty;
                    bettingType += ' (LIQ_SAFE)';
                }
            }

            // Minimum 1 share
            quantity = Math.max(1, quantity);

            // Generate clear, accurate rationale with Strategy Source Prefix
            let rationale = '';
            // Determine source label (e.g. "GAP_STRATEGY" -> "갭상승 전략")
            let sourceLabel = trigger.type || 'SIGNAL';
            if (sourceLabel === 'GAP_STRATEGY') sourceLabel = '갭상승 스캐너';
            else if (sourceLabel === 'CONVICTION') sourceLabel = '확신 스캐너';
            else if (sourceLabel === 'CLOSING_BELL') sourceLabel = '종가배팅 스캐너';
            else if (sourceLabel === 'VOLATILITY_BREAKOUT') sourceLabel = '변동성 돌파';
            else if (sourceLabel === 'PLAYBOOK_EXECUTION') sourceLabel = '알파 플레이북';

            if (trigger.details && trigger.details.trim().length > 0) {
                rationale = `[${sourceLabel}] ${trigger.details} `; // Prefix source
            } else {
                rationale = `[${sourceLabel}] AI 신호 포착`;
            }

            const success = await virtualTradingService.buy(
                ticker, // Use swapped ticker (ETF)
                stockName, // Use swapped name (ETF)
                trigger.currentPrice,
                quantity,
                `${rationale} [${bettingType}]`,
                undefined, // Stop Loss (handled by position monitor)
                optimalStrategy // Dynamic Strategy
            );

            if (!success) {
                console.warn(`[AutoPilot] Failed to execute BUY for ${stockName}(Insufficient funds or error)`);
                return;
            }

            // Send Telegram notification with clear rationale
            // Format numbers nicely to avoid NaN/Infinity display
            const safeAmount = isFinite(trigger.currentPrice * quantity) ? (trigger.currentPrice * quantity) : 0;

            // [Localization] Validating Stock Name
            let displayStockName = stockName;
            if (/^\d{6}$/.test(displayStockName)) {
                // If name is ticker, try to find real name
                // Ideally fetch via dataService, but for now, rely on what we have or generic
                // Or let the Telegram Service handle it? 
                // Better to handle here.
            }

            await telegramService.sendTradeReport({
                action: 'BUY', // [FIX] Passed '매수' but service expects 'BUY'
                ticker: ticker,
                stockName: displayStockName,
                quantity: quantity,
                price: trigger.currentPrice,
                amount: safeAmount,
                reason: `[${optimalStrategy}] ${rationale} | 배팅: ${bettingType} | 확신도: ${confidence}% `,
                confidence: confidence
            });

            console.log(`[AutoPilot] ✅ Trade executed and notification sent for ${stockName}`);
        } catch (error) {
            console.error(`[AutoPilot] Failed to execute signal for ${trigger.stockName}: `, error);
        }
    }

    private async monitorPositions() {
        const account = virtualTradingService.getAccount();
        if (account.positions.length === 0) return;

        console.log(`[AutoPilot] 🧐 Monitoring ${account.positions.length} positions with TRINITY SWITCHING 2.0...`);

        // Create a copy to avoid modification issues during iteration (though for-of is usually safe)
        const positions = [...account.positions];

        for (const position of positions) {
            await this.managePosition(position, account);
        }
    }

    /**
     * TRINITY SWITCHING 2.0: Core Logic
     */
    private async managePosition(position: any, account: any) {
        try {
            // 1. Fetch Latest Data
            let positionMarket: MarketTarget = this.marketTarget;
            if (position.ticker === 'KOSPI' || position.ticker === 'KOSDAQ' || /^[0-9]{6}$/.test(position.ticker)) {
                positionMarket = 'KR';
            } else if (/^[A-Za-z]+$/.test(position.ticker)) {
                positionMarket = 'US';
            }

            const priceData = await _fetchLatestPrice(position.ticker, position.stockName, positionMarket);
            if (!priceData || priceData.price <= 0) {
                console.warn(`[AutoPilot] ⚠️ Invalid Price Data for ${position.stockName}: ${priceData?.price}. Skipping monitor cycle.`);
                return;
            }

            const currentPrice = priceData.price;
            const profitRate = ((currentPrice - position.avgPrice) / position.avgPrice) * 100;

            // Update Position Context (Current Price)
            position.currentPrice = currentPrice;

            // 2. Route to Specific Logic based on Strategy Phase
            // If strategy is undefined, default to DAY
            const strategy = position.strategy || 'DAY';

            if (strategy === 'DAY') {
                await this.runDayLogic(position, profitRate, priceData, account);
            } else if (strategy === 'SWING') {
                await this.runSwingLogic(position, profitRate, priceData, account);
            } else if (strategy === 'LONG') {
                await this.runLongLogic(position, profitRate, priceData, account);
            }

            // 3. Constitution Fail-Safe (Global Safety Net)
            // If we are losing -5% in a Bull Market, something is wrong.
            // Let individual logic handle extensions, but this is the hard floor.
            if (this.currentMarketRegime.includes('BULL') && profitRate < -5.0) {
                if (strategy === 'DAY') { // Day Trade shouldn't lose 5% in Bull
                    console.warn(`[AutoPilot] 🚨 Fail - Safe Triggered! Day trade ${position.stockName} losing - 5 % in Bull market.`);
                    await this.executeSell(position, currentPrice, position.quantity, `🛡️ Fail - Safe: Bull Market but - 5 % Loss`);
                    // Trigger Circuit Breaker for a short period if this happens often?
                    this.circuitBreaker.triggered = true;
                    this.circuitBreaker.triggerTime = Date.now();
                    this.circuitBreaker.reason = `Logic Failure: Day trade losing - 5 % in Bull Market`;
                    console.error(`[AutoPilot] 🧨 CIRCUIT BREAKER TRIPPED.HALTING ALL BUYS FOR 60 MIN.`);
                }
            }

        } catch (error) {
            console.error(`[AutoPilot] Error managing position ${position.stockName}: `, error);
        }
    }

    /**
     * Phase 1: DAY (Sniper Mode)
     * Objective: Survival & Quick Cash
     */
    private async runDayLogic(position: any, profitRate: number, priceData: any, account: any) {
        const currentPrice = priceData.price;

        // A. Promotion (Evolution)
        if (profitRate > 5.0 && this.currentMarketRegime.includes('BULL')) {
            console.log(`[AutoPilot] 🧘 Promoting ${position.stockName}: DAY -> SWING`);
            position.strategy = 'SWING';
            await this.logThought({
                ticker: position.ticker, action: 'ANALYSIS', strategy: 'TRINITY_SWITCH',
                message: `전략 승격(DAY ➔ SWING): 수익률 + ${profitRate.toFixed(2)}% 안착.추세 추종 모드로 전환.`,
                confidence: 100
            });
            return; // Logic will pick up as Swing next cycle
        }

        // B. Partial Profit Taking (Securing the Bag)
        // Rule: At +3%, sell 30%
        if (profitRate > 3.0 && (!position.harvestLevel || position.harvestLevel < 1)) {
            await this.partialSell(position, 0.3, `💰[DAY] 밥값 챙기기(+${profitRate.toFixed(2)} %)`);
            position.harvestLevel = 1; // Mark as harvested level 1
            // TODO: Move Stop Loss to Breakeven (need support in Position interface, strictly virtual for now)
        }

        // C. Stop Loss (Tight)
        const stopLoss = -3.0;
        if (profitRate <= stopLoss) {
            await this.executeSell(position, currentPrice, position.quantity, `📉[DAY] 칼손절(${profitRate.toFixed(2)} %)`);
        }

        // D. Time-Cut (Optional: 60 mins check) - Skipped for MVP correctness
    }

    /**
     * Phase 2: SWING (Trend Rider)
     * Objective: Ride the wave
     */
    private async runSwingLogic(position: any, profitRate: number, priceData: any, account: any) {
        const currentPrice = priceData.price;

        // A. Promotion (Evolution)
        if (profitRate > 20.0 && this.currentMarketRegime === 'SUPER_BULL') {
            console.log(`[AutoPilot] 🧘 Promoting ${position.stockName}: SWING -> LONG`);
            position.strategy = 'LONG';
            await this.logThought({
                ticker: position.ticker, action: 'ANALYSIS', strategy: 'TRINITY_SWITCH',
                message: `전략 승격(SWING ➔ LONG): 수익률 + ${profitRate.toFixed(2)}% 폭발.슈퍼 트렌드로 전환.`,
                confidence: 100
            });
            return;
        }

        // B. Profit Taking (Climax)
        // Rule: Volume > 300% (3.0 RVOL) AND Price > 15% (Intraday spike) -> Sell Half
        const rvol = priceData.rvol || 0;
        const changeRate = priceData.changeRate || 0;

        if (rvol > 3.0 && changeRate > 15.0 && (!position.harvestLevel || position.harvestLevel < 2)) {
            await this.partialSell(position, 0.5, `🥂[SWING] 클라이맥스 익절(+${changeRate} %)`);
            position.harvestLevel = 2;
        }

        // C. Trailing Stop (MA 20 proxy)
        // Ideal: Price < MA20. Using static proxy: -7% from Avg (giving room) or -5% from Peak (if tracked)
        // For now: Hard stop at -5% from ENTRY (since we promoted at +5%, this locks some profit/breakeven range effectively?)
        // Actually, if we promoted at +5%, and price drops to -5%, we gave back 10%. 
        // Let's use Breakeven Stop: If Profit < 0.5% (slide back to entry), cut it.
        // But we need breathing room for volatility.
        // Let's set Stop Loss at -5% (Standard Swing Stop).
        if (profitRate <= -5.0) {
            await this.executeSell(position, currentPrice, position.quantity, `📉[SWING] 추세 이탈 손절(${profitRate.toFixed(2)} %)`);
        }

        // Pyramiding Logic (Only in Swing/Bull)
        // ... (Existing pyramiding logic can be integrated here, simplified for now)
        if (profitRate > 10.0 && this.currentMarketRegime.includes('BULL') && (!position.pyramidCount || position.pyramidCount < 2)) {
            await this.executePyramiding(position, currentPrice, account);
        }
    }

    /**
     * Phase 3: LONG (Owner)
     * Objective: Multi-bagger
     */
    private async runLongLogic(position: any, profitRate: number, priceData: any, account: any) {
        // A. Exit Logic (Fundamental / Structural)
        // 1. Regime Change: If Market becomes BEAR, reduce exposure.
        if (this.currentMarketRegime === 'BEAR' || this.currentMarketRegime === 'CRASH') {
            await this.partialSell(position, 0.5, `🐻[LONG] 시장 붕괴 감지(Bear Market) - 비중 축소`);
            // Don't sell all yet, Long means Long.
        }

        // 2. Structural Stop: -20% from Entry (Deep Value failure)
        if (profitRate <= -20.0) {
            const currentPrice = priceData.price;
            await this.executeSell(position, currentPrice, position.quantity, `🛑[LONG] 가치 훼손(손실 - 20 %)`);
        }
        // No profit taking on price alone for LONG strategy.
    }

    // --- Helpers ---

    private async partialSell(position: any, ratio: number, reason: string) {
        const info = virtualTradingService.getAccount().positions.find(p => p.ticker === position.ticker);
        if (!info) return;

        const sellQty = Math.floor(info.quantity * ratio);
        if (sellQty < 1) return;

        await this.executeSell(position, position.currentPrice, sellQty, reason);
        console.log(`[AutoPilot] 🍰 Partial Sell: ${sellQty} shares of ${position.stockName} `);
    }

    private async executeSell(position: any, price: number, quantity: number, reason: string) {
        const success = virtualTradingService.sell(position.ticker, price, quantity, reason);
        if (success) {
            const amount = price * quantity;
            // [Localization] SELL -> 매도
            await telegramService.sendTradeReport({
                action: 'SELL',
                ticker: position.ticker,
                stockName: position.stockName,
                quantity: quantity,
                price: price,
                amount: amount,
                reason: reason,
                confidence: 100
            });
        }
    }

    private async executePyramiding(position: any, currentPrice: number, account: any) {
        // Simple 10% add
        const addAmount = Math.min(account.totalAsset * 0.10, account.cash);
        const addQty = Math.floor(addAmount / currentPrice);

        if (addQty > 0) {
            await virtualTradingService.buy(
                position.ticker,
                position.stockName,
                currentPrice,
                addQty,
                `🏗️[SWING] 불타기(Pyramiding)`,
                undefined,
                position.strategy
            );
            position.pyramidCount = (position.pyramidCount || 0) + 1;

            // [Localization] BUY -> 매수
            await telegramService.sendTradeReport({
                action: 'BUY',
                ticker: position.ticker,
                stockName: position.stockName,
                quantity: addQty,
                price: currentPrice,
                amount: currentPrice * addQty,
                reason: `🏗️[SWING] 불타기(Avg Up) | 추세 강화`,
                confidence: 90
            });
        }
    }
    private isExtendedSniperWindow(trigger: any): boolean {
        const now = new Date();
        const kstNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
        const currentMinutes = kstNow.getHours() * 60 + kstNow.getMinutes();

        // [Logic] Only allow Extended Hours for High Conviction Snipes
        if (!trigger.score || trigger.score < 90) return false;

        // KR Extended: 08:30~09:00 (Pre) & 15:30~16:00 (Post)
        if (this.marketTarget === 'KR') {
            // Pre-market: 08:30 ~ 09:00 (Safe Zone)
            if (currentMinutes >= 8 * 60 + 30 && currentMinutes < 9 * 60) return true;
            // Post-market: 15:30 ~ 16:00
            if (currentMinutes >= 15 * 60 + 30 && currentMinutes < 16 * 60) return true;
        }
        // US Extended: 22:30 ~ 23:30 (Pre) & 06:00 ~ 07:00 (Post) - Winter Time
        else if (this.marketTarget === 'US') {
            const usPreStart = 22 * 60 + 30; // 22:30
            const usPreEnd = 23 * 60 + 30;   // 23:30
            const usPostStart = 6 * 60;      // 06:00
            const usPostEnd = 7 * 60;        // 07:00

            if (currentMinutes >= usPreStart && currentMinutes < usPreEnd) return true;
            if (currentMinutes >= usPostStart && currentMinutes < usPostEnd) return true;
        }

        return false;
    }
}

export const autoPilotService = new AutoPilotService();
