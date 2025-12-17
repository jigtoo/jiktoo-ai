// services/SniperTriggerService.ts
import { _fetchLatestPrice, fetchCandles } from './dataService';
import { MarketTarget } from '../types';
import { telegramService } from './telegramService';
import { sympathyService } from './SympathyService';
import { TechnicalAnalysis } from './strategy/TechnicalAnalysis';
import { supabase } from './supabaseClient';

export interface SniperTrigger {
    ticker: string;
    stockName: string;
    type: 'VOLUME_SPIKE' | 'VOLATILITY_BREAKOUT' | 'HUNTER_BREAKOUT';
    score: number;
    details: string;
    currentPrice: number;
    changeRate: number;
    volume: number;
}

export type SniperStatus = 'WATCHING' | 'SNIPER_READY' | 'EXECUTED';

export interface SniperCandidate {
    ticker: string;
    stockName: string;
    status: SniperStatus;
    score: number;
    strategyName: string; // Source strategy (e.g. "Golden Cross")
    addedAt: number;
    expiry: number;
}

// Map for tracking candidates across the waterfall
// Key: Ticker
type CandidateMap = Map<string, SniperCandidate>;

class SniperTriggerService {
    // Stage 2 & 3 Candidates
    private candidates: CandidateMap = new Map();

    // History for UI
    private lastTriggers: SniperTrigger[] = [];
    private lastScanTime: Date | null = null;

    // WS for Stage 3 (Real-time)
    private ws: WebSocket | null = null;
    private onTriggerCallback: ((trigger: SniperTrigger) => void) | null = null;

    constructor() {
        if (typeof window !== 'undefined' && (window as any).__sniperTriggerService) {
            const old = (window as any).__sniperTriggerService;
            this.candidates = old.candidates || new Map();
            this.lastTriggers = old.lastTriggers || [];
            console.log('[Sniper] Restored state (HMR)');
        }
        if (typeof window !== 'undefined') (window as any).__sniperTriggerService = this;
    }

    public setOnTriggerCallback(callback: (trigger: SniperTrigger) => void) {
        this.onTriggerCallback = callback;
    }

    /**
     * [Stage 1 -> Stage 2 Entry]
     * Called by AutonomousScheduler/Hunter when a daily/weekly setup is found
     */
    public addToWatchlist(ticker: string, stockName: string, strategyName: string, score: number, initialStatus: SniperStatus = 'WATCHING') {
        if (this.candidates.has(ticker)) return;

        console.log(`[Sniper] 🔭 Added to Hunter Watchlist: ${stockName} (${ticker}) - Source: ${strategyName} [${initialStatus}]`);
        this.candidates.set(ticker, {
            ticker,
            stockName,
            status: initialStatus,
            score,
            strategyName,
            addedAt: Date.now(),
            expiry: Date.now() + (24 * 60 * 60 * 1000) // Watch for 24 hours
        });
    }

    /**
     * [Main Interval Loop]
     * Scans all candidates to promote them (Hunter -> Sniper -> Execute)
     */
    public async scanForTriggers(
        marketTarget: MarketTarget
    ): Promise<SniperTrigger[]> {

        const triggers: SniperTrigger[] = [];
        const now = Date.now();

        // 1. Process Candidates
        for (const [ticker, candidate] of this.candidates) {

            // Expiry Check
            if (now > candidate.expiry) {
                console.log(`[Sniper] ⏳ Expiring candidate: ${candidate.stockName} (${ticker})`);
                this.candidates.delete(ticker);

                // [Persistence] Update DB to 'NotActionable' (Expired)
                if (typeof supabase !== 'undefined') {
                    (supabase as any).from('user_analysis_history')
                        .update({ status: 'NotActionable' }) // Mark as expired
                        .eq('ticker', ticker)
                        .eq('status', 'Watchlist') // Only expire if still watching
                        .then(({ error }: any) => {
                            if (error) console.error(`[Sniper] Failed to expire DB record for ${ticker}:`, error);
                        });
                }
                continue;
            }

            try {
                // [Stage 2: Hunter] Check 60m Setup (If still WATCHING)
                if (candidate.status === 'WATCHING') {
                    const isReady = await this.checkHunterSetup(ticker);
                    if (isReady) {
                        candidate.status = 'SNIPER_READY';
                        console.log(`[Sniper] 🏹 ${candidate.stockName}: Ready for 1m Breakout (Hunter Passed)`);

                        // Notify User "Target Acquired"
                        telegramService.sendMessage({
                            title: `[Hunter] 🔭 조준 완료: ${candidate.stockName}`,
                            body: `- 60분봉 셋업 확인됨\n- 1분봉 돌파 대기중...`
                        });
                    }
                }

                // [Stage 3: Sniper] Check 1m Trigger (If SNIPER_READY)
                if (candidate.status === 'SNIPER_READY') {
                    const trigger = await this.checkSniperTrigger(candidate, marketTarget);
                    if (trigger) {
                        candidate.status = 'EXECUTED'; // One-shot
                        triggers.push(trigger);
                        this.candidates.delete(ticker); // Task Done

                        // Send Alert
                        telegramService.sendSniperTrigger(trigger).catch(console.error);

                        // Sympathy Trigger
                        sympathyService.onTrigger(trigger).catch(console.error);

                        // Trigger AutoPilot Callback
                        if (this.onTriggerCallback) {
                            this.onTriggerCallback(trigger);
                        }
                    }
                }

            } catch (e) {
                console.warn(`[Sniper] Scan failed for ${candidate.stockName}:`, e);
            }
        }

        this.lastTriggers = [...this.lastTriggers, ...triggers].slice(-50);
        this.lastScanTime = new Date();
        return triggers;
    }

    /**
     * [Hunter Logic] 60-Minute Chart Analysis
     * Returns TRUE if setup is good (e.g., Pullback or Consolidation)
     */
    private async checkHunterSetup(ticker: string): Promise<boolean> {
        // Fetch last 50 candles (60m)
        const candles = await fetchCandles(ticker, '60', 50);
        if (candles.length < 20) return false;

        const closes = candles.map(c => c.close);

        // Logic: Price is above SMA 20 (Trend) AND RSI is below 50 (Pullback/Resting)
        // This is a "Dip Buying" setup
        const sma20 = TechnicalAnalysis.SMA(closes, 20);
        const rsi = TechnicalAnalysis.RSI(closes, 14);

        const lastClose = closes[closes.length - 1];
        const lastsma = sma20[sma20.length - 1];
        const lastRsi = rsi[rsi.length - 1];

        // Setup Condition: Trend Up + Not Overheated
        return lastClose > lastsma && lastRsi < 60;
    }

    /**
     * [Sniper Logic] 1-Minute Chart/Quote Analysis
     * Returns Trigger if Breakout occurs
     */
    private async checkSniperTrigger(candidate: SniperCandidate, marketTarget: MarketTarget): Promise<SniperTrigger | null> {
        // Fetch Real-time Snapshot
        const data = await _fetchLatestPrice(candidate.ticker, candidate.stockName, marketTarget);
        if (!data || data.volume === 0) return null;

        // Logic: Volume Spike (> 500k) AND Price Up (> 1%)
        const isVolumeSpike = data.volume > 500000;
        const isBreakout = data.changeRate > 1.0;

        if (isVolumeSpike && isBreakout) {
            console.log(`[Sniper] 🔫 FIRE: ${candidate.stockName}`);
            return {
                ticker: candidate.ticker,
                stockName: candidate.stockName,
                type: 'HUNTER_BREAKOUT',
                score: 100,
                details: `[Sniper] 60분 조준 후 1분 돌파 성공!\n(Vol: ${data.volume}, +${data.changeRate}%)`,
                currentPrice: data.price,
                changeRate: data.changeRate,
                volume: data.volume
            };
        }
        return null;
    }

    // --- Helpers ---
    public getLastTriggers() {
        return { triggers: this.lastTriggers, scanTime: this.lastScanTime };
    }

    public getCandidates(): SniperCandidate[] {
        return Array.from(this.candidates.values());
    }

    // WebSocket logic for real-time monitoring (Stage 3 optimization)
    // For now, we rely on the scan loop, but WS can be re-enabled for instant 1m pushes
    public startRealtimeMonitoring() {
        // Reserved for WebSocket optimization
        // (Previously included WS code here, keeping placeholder to keep file clean)
    }

    /**
     * [Verification] Manual Trigger for System Check
     */
    public async forceTestTrigger() {
        console.log('[Sniper] 🧪 Force Triggering Test Signal...');

        const testTrigger: SniperTrigger = {
            ticker: '005930', // Samsung Electronics (Example)
            stockName: '삼성전자 (시스템 점검)',
            type: 'HUNTER_BREAKOUT',
            score: 99,
            details: '시스템 점검용 강제 트리거 테스트 (Simulation)',
            currentPrice: 72500,
            changeRate: 3.5,
            volume: 1234567
        };

        // 1. Send Telegram
        await telegramService.sendSniperTrigger(testTrigger);

        // 2. Trigger AutoPilot
        if (this.onTriggerCallback) {
            this.onTriggerCallback(testTrigger);
        }

        return true;
    }
}

export const sniperTriggerService = new SniperTriggerService();
