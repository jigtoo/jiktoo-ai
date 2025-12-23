import { BehaviorSubject, Subject } from 'rxjs';
import { MarketTarget, ScannerResult } from '../../types';
import {
    scannerTools,
    runValuePivotScan,
    runPowerPlayScan,
    runTurnaroundScan,
    runVolumeDryUpScan,
    runHiddenStrengthScan,
    runHallOfFameScan,
    ScannerCandidate
} from '../ScannerTools';
import { hallOfFameService } from './HallOfFameService';
import { supabase } from '../supabaseClient';
import { sanitizeJsonString } from '../utils/jsonUtils';
import { dynamicWatchlistService } from './DynamicWatchlistService';
import { fetchDailyCandles } from '../dataService';

/**
 * [Architecture 2.0] Discovery Engine - ScannerHubService
 * 
 * The Central Control Tower for all scanners.
 * Aggregates signals from:
 * 1. Eagle Eye (Supply)
 * 2. Volume Spike (Momentum)
 * 3. Hall of Fame (Pattern)
 * 4. Megatrend (Themes) - [NEW]
 * 5. Tenbagger (Long-term) - [NEW]
 * 6. User Watchlist (Manual) - [NEW]
 */

export type ScanEventType = 'SCAN_START' | 'SCAN_COMPLETE' | 'SCAN_ERROR';
export interface ScanEvent {
    type: ScanEventType;
    market: MarketTarget;
    count?: number;
    error?: any;
}

interface ScannerSignal extends ScannerResult {
    timestamp: number;
    sourceScanner: string;
}

class ScannerHubService {
    private signals$ = new BehaviorSubject<ScannerSignal[]>([]);
    public readonly event$ = new Subject<ScanEvent>(); // Public Event Stream

    constructor() {
        console.log('[ScannerHub] 🏰 Discovery Engine Initialized.');
    }

    /**
     * Run All Scanners and Aggregate Results
     */
    public async runFullScan(marketTarget: MarketTarget = 'KR') {
        console.log(`[ScannerHub] 🚀 Launching Full Discovery Scan for ${marketTarget}...`);
        this.event$.next({ type: 'SCAN_START', market: marketTarget });

        try {
            // Sequential Execution - One scanner at a time for stability
            console.log('[ScannerHub] 📊 Starting sequential scan...');

            const allSignals: ScannerSignal[] = [];

            // 1. Technical Scanners (Sequential with delays)
            try {
                console.log('[ScannerHub] Running EagleEye...');
                const eagleResults = await scannerTools.runEagleEyeScanner(marketTarget);
                allSignals.push(...eagleResults.map(r => ({ ...r, timestamp: Date.now(), sourceScanner: 'EagleEye' })));
                await this.delay(1000); // 1s delay between scanners
            } catch (e) {
                console.warn('[ScannerHub] EagleEye failed:', e);
            }

            try {
                console.log('[ScannerHub] Running VolumeSpike...');
                const volumeResults = await scannerTools.runVolumeSpikeScanner(marketTarget);
                allSignals.push(...volumeResults.map(r => ({ ...r, timestamp: Date.now(), sourceScanner: 'VolumeSpike' })));
                await this.delay(1000);
            } catch (e) {
                console.warn('[ScannerHub] VolumeSpike failed:', e);
            }

            try {
                console.log('[ScannerHub] Running Hall of Fame...');
                const hofResults = await hallOfFameService.runHallOfFameScan(marketTarget);
                allSignals.push(...hofResults.map(r => ({ ...r, timestamp: Date.now(), sourceScanner: 'HallOfFame' })));
                await this.delay(1000);
            } catch (e) {
                console.warn('[ScannerHub] Hall of Fame failed:', e);
            }

            // 2. DB-based Scanners (Sequential)
            try {
                console.log('[ScannerHub] Fetching Megatrend...');
                const megatrendResults = await this.fetchMegatrendSignals(marketTarget);
                allSignals.push(...megatrendResults.map(r => ({ ...r, timestamp: Date.now(), sourceScanner: 'Megatrend' })));
                await this.delay(500);
            } catch (e) {
                console.warn('[ScannerHub] Megatrend failed:', e);
            }

            try {
                console.log('[ScannerHub] Fetching Tenbagger...');
                const tenbaggerResults = await this.fetchTenbaggerSignals(marketTarget);
                allSignals.push(...tenbaggerResults.map(r => ({ ...r, timestamp: Date.now(), sourceScanner: 'Tenbagger' })));
                await this.delay(500);
            } catch (e) {
                console.warn('[ScannerHub] Tenbagger failed:', e);
            }

            try {
                console.log('[ScannerHub] Fetching User Watchlist...');
                const watchlistResults = await this.fetchUserWatchlistSignals(marketTarget);
                allSignals.push(...watchlistResults.map(r => ({ ...r, timestamp: Date.now(), sourceScanner: 'UserWatchlist' })));
                await this.delay(500);
            } catch (e) {
                console.warn('[ScannerHub] Watchlist failed:', e);
            }

            try {
                console.log('[ScannerHub] Fetching Inverse Signals...');
                const inverseResults = await this.fetchInverseSignals(marketTarget);
                allSignals.push(...inverseResults.map(r => ({ ...r, timestamp: Date.now(), sourceScanner: 'InverseStrategy' })));
            } catch (e) {
                console.warn('[ScannerHub] Inverse failed:', e);
            }

            console.log(`[ScannerHub] ✅ Sequential Scan Complete. Total signals: ${allSignals.length}`);

            // Broadcast
            this.signals$.next(allSignals);
            this.event$.next({ type: 'SCAN_COMPLETE', market: marketTarget, count: allSignals.length });

            return allSignals;
        } catch (error) {
            console.error('[ScannerHub] Full Scan Error:', error);
            this.event$.next({ type: 'SCAN_ERROR', market: marketTarget, error });
            return [];
        }
    }

    public getSignals() {
        return this.signals$.asObservable();
    }

    /**
     * [NEW] AI Quant Scan - Separate from main scan
     * Runs AI scanners and saves to DB for Sniper monitoring
     */
    public async runAIQuantScan(marketTarget: MarketTarget = 'KR') {
        console.log(`[ScannerHub] 🤖 Starting AI Quant Scan for ${marketTarget}...`);
        this.event$.next({ type: 'SCAN_START', market: marketTarget });

        try {
            // 1. Prepare Candidates (with timeout)
            console.log('[ScannerHub] Preparing candidates...');
            const candidates = await this.prepareCandidates(marketTarget);

            if (candidates.length === 0) {
                console.warn('[ScannerHub] No candidates available for AI scan');
                return [];
            }

            console.log(`[ScannerHub] Got ${candidates.length} candidates. Running AI scanners...`);

            // 2. Run AI Scanners Sequentially
            const allResults: ScannerResult[] = [];

            try {
                console.log('[ScannerHub] Running Value-Pivot...');
                const valuePivot = await runValuePivotScan(marketTarget, candidates);
                allResults.push(...valuePivot);
                await this.delay(2000);
            } catch (e) {
                console.warn('[ScannerHub] Value-Pivot failed:', e);
            }

            try {
                console.log('[ScannerHub] Running Power-Play...');
                const powerPlay = await runPowerPlayScan(marketTarget, candidates);
                allResults.push(...powerPlay);
                await this.delay(2000);
            } catch (e) {
                console.warn('[ScannerHub] Power-Play failed:', e);
            }

            try {
                console.log('[ScannerHub] Running Turnaround...');
                const turnaround = await runTurnaroundScan(marketTarget, candidates);
                allResults.push(...turnaround);
                await this.delay(2000);
            } catch (e) {
                console.warn('[ScannerHub] Turnaround failed:', e);
            }

            try {
                console.log('[ScannerHub] Running Volume-DryUp...');
                const volumeDryUp = await runVolumeDryUpScan(marketTarget, candidates);
                allResults.push(...volumeDryUp);
                await this.delay(2000);
            } catch (e) {
                console.warn('[ScannerHub] Volume-DryUp failed:', e);
            }

            try {
                console.log('[ScannerHub] Running Hidden-Strength...');
                const hiddenStrength = await runHiddenStrengthScan(marketTarget, candidates);
                allResults.push(...hiddenStrength);
            } catch (e) {
                console.warn('[ScannerHub] Hidden-Strength failed:', e);
            }

            try {
                console.log('[ScannerHub] Running Hall-of-Fame...');
                const hallOfFame = await runHallOfFameScan(marketTarget, candidates);
                allResults.push(...hallOfFame);
            } catch (e) {
                console.warn('[ScannerHub] Hall-of-Fame failed:', e);
            }

            console.log(`[ScannerHub] ✅ AI Quant Scan Complete. Found ${allResults.length} signals`);

            // 3. Save to DB
            const signalsWithTimestamp = allResults.map(r => ({
                ...r,
                timestamp: Date.now(),
                sourceScanner: r.matchType || 'AI-Quant'
            }));

            await this.saveToAIQuantScreenerDB(signalsWithTimestamp, marketTarget);

            // 4. Broadcast event
            this.event$.next({ type: 'SCAN_COMPLETE', market: marketTarget, count: allResults.length });

            return allResults;
        } catch (error) {
            console.error('[ScannerHub] AI Quant Scan Error:', error);
            this.event$.next({ type: 'SCAN_ERROR', market: marketTarget, error });
            return [];
        }
    }

    // Prepare candidates for AI Scanners
    private async prepareCandidates(market: MarketTarget): Promise<ScannerCandidate[]> {
        try {
            // 1. Get Dynamic Watchlist
            const watchlist = await dynamicWatchlistService.getWatchlist(market);
            if (!watchlist || watchlist.length === 0) return [];

            // 2. Limit to avoid timeouts (Smart Selection: Hot + Random)
            // Previously: const targets = watchlist.slice(0, 30);

            // Filter by Tiers
            const hotStocks = watchlist.filter(s => s.tier === 'hot');
            const otherStocks = watchlist.filter(s => s.tier !== 'hot');

            // Select up to 15 Hot stocks + Randomly fill the rest to reach 30
            const selectedSet = new Set<string>();
            const limit = 30;
            const finalTargets: typeof watchlist = [];

            // Add Hot stocks first (up to limit)
            for (const stock of hotStocks) {
                if (finalTargets.length >= limit) break;
                finalTargets.push(stock);
                selectedSet.add(stock.ticker);
            }

            // Fill remainder with random selection from others
            if (finalTargets.length < limit) {
                // Shuffle others
                const shuffledOthers = otherStocks.sort(() => 0.5 - Math.random());
                for (const stock of shuffledOthers) {
                    if (finalTargets.length >= limit) break;
                    if (!selectedSet.has(stock.ticker)) {
                        finalTargets.push(stock);
                        selectedSet.add(stock.ticker);
                    }
                }
            }

            // Shuffle the final list to avoid always analyzing in same order
            const targets = finalTargets.sort(() => 0.5 - Math.random());

            console.log(`[ScannerHub] Selected ${targets.length} candidates (Hot: ${hotStocks.length}, Random: ${targets.length - Math.min(hotStocks.length, limit)})`);

            // 3. Fetch Candles
            const candidates = await Promise.all(targets.map(async (t) => {
                const candles = await fetchDailyCandles(t.ticker, market); // 20 days default
                if (!candles || candles.length < 10) return null;
                return {
                    ticker: t.ticker,
                    stockName: t.stock_name,
                    currentPrice: candles[candles.length - 1].close,
                    recentCandles: candles
                } as ScannerCandidate;
            }));

            return candidates.filter(c => c !== null) as ScannerCandidate[];
        } catch (e) {
            console.error('[ScannerHub] Failed to prepare candidates:', e);
            return [];
        }
    }

    // Save Results to DB
    private async saveToAIQuantScreenerDB(results: ScannerSignal[], market: MarketTarget) {
        if (!supabase || results.length === 0) return;

        console.log(`[ScannerHub] Saving ${results.length} results to ai_quant_screener_results...`);

        // Filter out empty technical signals
        const validResults = results.filter(r => r.technicalSignal || r.reason);

        const rows = validResults.map(r => ({
            id: crypto.randomUUID(),
            ticker: r.ticker,
            stock_name: r.stockName,
            technical_signal: r.technicalSignal || r.reason, // Use reason if technicalSignal is missing
            rationale: r.reason,
            ai_score: r.volumeStrength || 80,
            market_target: market,
            strategy_name: r.sourceScanner, // e.g., 'Hidden-Strength'
            created_at: new Date().toISOString()
        }));

        const { error } = await supabase
            .from('ai_quant_screener_results')
            .upsert(rows);

        if (error) console.error('[ScannerHub] Failed to save screener results:', error);
    }

    // ------------------------------------------------------------------
    // [NEW] Additional Data Fetchers
    // ------------------------------------------------------------------

    // Helper: Timeout Wrapper
    private async withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallbackValue: T, description: string): Promise<T> {
        return Promise.race([
            promise,
            new Promise<T>((resolve) =>
                setTimeout(() => {
                    console.warn(`[ScannerHub] ⚠️ ${description} timed out after ${timeoutMs}ms.`);
                    resolve(fallbackValue);
                }, timeoutMs)
            )
        ]);
    }

    // Helper: Delay for rate limiting
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    private async fetchMegatrendSignals(market: MarketTarget): Promise<ScannerResult[]> {
        try {
            if (!supabase) return [];

            // Get latest analysis
            const { data } = await supabase
                .from('megatrend_analysis')
                .select('*')
                .eq('market_target', market)
                .order('analyzed_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (!data || !data.trends || !Array.isArray(data.trends)) return [];

            const signals: ScannerResult[] = [];
            const trends = (data as any).trends as any[];

            for (const trend of trends) {
                if (trend.topStocks && Array.isArray(trend.topStocks)) {
                    for (const stockString of trend.topStocks) {
                        const ticker = this.extractTicker(stockString as string);
                        if (ticker) {
                            signals.push({
                                ticker,
                                stockName: stockString.replace(/\(.*?\)/g, '').trim(), // Remove ticker from name
                                matchType: 'Megatrend',
                                price: 0, // Unknown here, will be filled by AlphaEngine
                                changeRate: 0,
                                volumeStrength: trend.confidence || 80,
                                reason: `[Theme] ${trend.title}`,
                                technicalSignal: 'Included in Theme'
                            });
                        }
                    }
                }
            }
            return signals;
        } catch (e) {
            console.error('[ScannerHub] Failed to fetch Megatrends:', e);
            return [];
        }
    }

    private async fetchTenbaggerSignals(market: MarketTarget): Promise<ScannerResult[]> {
        try {
            if (!supabase) return [];

            const { data } = await supabase
                .from('tenbagger_reports')
                .select('*')
                .eq('market', market)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (!data || !data.report_data) return [];

            const report = (data as any).report_data as any;
            if (!report.stocks || !Array.isArray(report.stocks)) return [];

            return report.stocks.map((s: any) => ({
                ticker: s.ticker,
                stockName: s.stockName,
                matchType: 'Tenbagger',
                price: s.currentPrice || 0,
                changeRate: 0,
                volumeStrength: 90, // High priority
                reason: `[Long-Term] ${s.investmentLogic}`,
                technicalSignal: 'Tenbagger Candidate'
            }));

        } catch (e) {
            console.error('[ScannerHub] Failed to fetch Tenbaggers:', e);
            return [];
        }
    }

    private async fetchUserWatchlistSignals(market: MarketTarget): Promise<ScannerResult[]> {
        try {
            if (!supabase) return [];

            // Direct DB access for speed (bypassing RPC strictness if possible, otherwise use RPC)
            // Using RPC as table structure might be complex or RLS applied
            const { data, error } = await supabase.rpc('rpc_get_user_watchlist', { p_market: market });

            if (error || !data || data.length === 0) return [];

            const items = (data[0] as any).items || [];

            return items.map((item: any) => ({
                ticker: item.ticker,
                stockName: item.stockName,
                matchType: 'UserWatchlist',
                price: 0,
                changeRate: 0,
                volumeStrength: 100, // Highest priority
                reason: `User Watchlist Item`,
                technicalSignal: 'User Selected'
            }));

        } catch (e) {
            console.error('[ScannerHub] Failed to fetch Watchlist:', e);
            return [];
        }
    }

    private async fetchInverseSignals(market: MarketTarget): Promise<ScannerResult[]> {
        // Static lists of key Inverse ETFs for "Bad Market" hedging
        const inverseCandidates = market === 'KR'
            ? [
                { ticker: '252670', name: 'KODEX 200선물인버스2X', reason: '[Hedging] Market Downturn Protection (2X Inverse)' },
                { ticker: '114800', name: 'KODEX 인버스', reason: '[Hedging] KOSPI 200 Short' },
                { ticker: '251340', name: 'KODEX 코스닥150선물인버스', reason: '[Hedging] KOSDAQ 150 Short' }
            ]
            : [
                { ticker: 'SQQQ', name: 'ProShares UltraPro Short QQQ (3x)', reason: '[Hedging] Nasdaq 100 Short (3x)' },
                { ticker: 'SOXS', name: 'Direxion Semi Bear (3x)', reason: '[Hedging] Semiconductor Short (3x)' },
                { ticker: 'SPXU', name: 'ProShares UltraPro Short S&P500 (3x)', reason: '[Hedging] S&P 500 Short (3x)' }
            ];

        return inverseCandidates.map(c => ({
            ticker: c.ticker,
            stockName: c.name,
            matchType: 'InverseStrategy',
            price: 0,
            changeRate: 0,
            volumeStrength: 100, // Always active for hedging
            reason: c.reason,
            technicalSignal: 'Inverse/Hedge Candidate'
        }));
    }

    private extractTicker(str: string): string | null {
        // Matches "Name (005930)" -> 005930
        const match = str.match(/\((.*?)\)/);
        if (match && match[1]) {
            return match[1].trim();
        }
        // Matches "005930" (only digits, 6 chars) or "AAPL" (letters, 2-5 chars)
        // Adjust regex for KR/US mix.
        // Assuming if no parens, the whole string might be ticker or name.
        // Let's be strict: if it looks like a ticker, take it.
        if (/^[0-9]{6}$/.test(str)) return str; // KR Ticker
        if (/^[A-Z]{1,5}$/.test(str)) return str; // US Ticker

        return null;
    }
}

export const scannerHub = new ScannerHubService();
