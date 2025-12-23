import { runValuePivotScan, runPowerPlayScan, runTurnaroundScan, runEagleEyeScanner, runVolumeSpikeScanner } from '../ScannerTools';
import { scanForGenomeMomentum, scanForGapStocks } from '../gemini/screenerService';
import { supabase } from '../supabaseClient';
import type { MarketTarget } from '../../types';

class QuantScreenerScheduler {
    private isRunning: boolean = false;
    private intervalId: NodeJS.Timeout | null = null;
    private readonly INTERVAL_MS = 60 * 60 * 1000; // 60 Minutes

    public start() {
        if (this.isRunning) return;
        this.isRunning = true;
        console.log('[QuantScheduler] 🕵️ Service started (Smart Schedule: Market Hours Only)');

        // Run immediately on start if market is open
        this.runCycle();

        // Schedule periodic run
        this.intervalId = setInterval(() => {
            this.runCycle();
        }, this.INTERVAL_MS);
    }

    public stop() {
        this.isRunning = false;
        if (this.intervalId) clearInterval(this.intervalId);
        console.log('[QuantScheduler] Service stopped');
    }

    private async runCycle() {
        if (!this.isRunning) return;

        // 1. Check KR Market (09:00 ~ 15:30)
        if (this.isMarketOpen('KR')) {
            console.log('[QuantScheduler] 🇰🇷 KR Market Open. Initiating Scans...');
            await this.executeScans('KR');
        }

        // 2. Check US Market (22:30 ~ 05:00)
        if (this.isMarketOpen('US')) {
            console.log('[QuantScheduler] 🇺🇸 US Market Open. Initiating Scans...');
            await this.executeScans('US');
        }
    }

    private isMarketOpen(market: MarketTarget): boolean {
        const now = new Date();
        const kstNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
        const day = kstNow.getDay(); // 0=Sun, 6=Sat
        const hour = kstNow.getHours();
        const minute = kstNow.getMinutes();
        const currentMinutes = hour * 60 + minute;

        // Weekend Check
        if (day === 0 || day === 6) return false;

        if (market === 'KR') {
            // 09:00 (540) ~ 15:30 (930)
            return currentMinutes >= 540 && currentMinutes <= 930;
        } else {
            // US: 22:30 (1350) ~ 05:00 (300) next day
            // Simplified: Run if > 22:30 OR < 05:00
            return currentMinutes >= 1350 || currentMinutes <= 300;
        }
    }

    private async executeScans(market: MarketTarget) {
        try {
            // Execute all Scanners (Basic + Conviction + HoF)
            console.log(`[QuantScheduler] 🚀 Running AI Scanners for ${market}...`);

            // 1. Basic Quant Scans
            const [genome, value, power, turnaround] = await Promise.all([
                scanForGenomeMomentum(market).catch(e => { console.error('Genome Error:', e); return []; }),
                runValuePivotScan(market).catch(e => { console.error('Value Error:', e); return []; }),
                runPowerPlayScan(market).catch(e => { console.error('Power Error:', e); return []; }),
                runTurnaroundScan(market).catch(e => { console.error('Turnaround Error:', e); return []; })
            ]);

            // 2. High Conviction Scan (Truth Layer + Multi-Engine)
            const conviction = await this.scanForHighConviction(market);

            // 3. Hall of Fame (Tier S Strategies)
            const hofResults = await this.scanForHallOfFame(market);

            const allResults = [
                ...this.mapToPlaybook(genome, market, 'GENOME_HUNTER'),
                ...this.mapToPlaybook(value, market, 'SUPER_VALUE'),
                ...this.mapToPlaybook(power, market, 'POWER_PLAY'),
                ...this.mapToPlaybook(turnaround, market, 'TURNAROUND'),
                ...conviction, // Already formatted
                ...hofResults  // Already formatted
            ];

            if (allResults.length === 0) {
                console.log(`[QuantScheduler] No candidates found in this cycle for ${market}.`);
                return;
            }


            // Save to Supabase
            if (supabase) {
                console.log(`[QuantScheduler] 💾 Saving ${allResults.length} candidates to Playbook...`);
                // Using upsert to avoid duplicates
                const { error } = await supabase.from('alpha_engine_playbooks').upsert(allResults as any, { onConflict: 'ticker, market, strategy_name' });
                if (error) console.error('[QuantScheduler] DB Save Error:', error);
                else console.log(`[QuantScheduler] ✅ Playbook updated successfully.`);

                // [NEW] Sync with Sniper Trigger Service (Auto-Targeting)
                // Filter for High Conviction candidates to actively monitor
                const sniperCandidates = allResults.filter(r => (r.key_factors[2]?.includes('Score: 8') || r.key_factors[2]?.includes('Score: 9') || (r.pattern_name && r.pattern_name.includes('Conviction'))));

                if (sniperCandidates.length > 0) {
                    const { sniperTriggerService } = await import('../SniperTriggerService');
                    console.log(`[QuantScheduler] 🎯 Forwarding ${sniperCandidates.length} High-Conviction targets to Sniper...`);

                    sniperCandidates.forEach(candidate => {
                        sniperTriggerService.addToWatchlist(
                            candidate.ticker,
                            candidate.stock_name,
                            `Quant: ${candidate.pattern_name}`,
                            85, // Initial Score for Sniper
                            'WATCHING'
                        );
                    });
                }
            } else {
                console.warn('[QuantScheduler] Supabase client missing. Cannot save.');
            }

        } catch (error) {
            console.error(`[QuantScheduler] Critical Error in Scan Cycle (${market}):`, error);
        }
    }

    private mapToPlaybook(results: any[], market: MarketTarget, scanType: string) {
        return results.map(item => ({
            market: market,
            ticker: item.ticker,
            stock_name: item.stockName || item.ticker,
            strategy_name: 'QUANT_SCREENER',
            pattern_name: scanType,
            success_rate: 0,
            avg_gain: 0,
            example_chart: null,
            key_factors: [
                item.rationale || item.reason || item.matchedPattern || 'AI Selected',
                `Price: ${item.currentPrice || item.price || 0}`,
                `AI Score: ${item.aiConfidence || 80}`
            ],
            is_candidate: true,
            status: 'WATCHING',
            scan_type: 'QUANT',
            created_at: new Date().toISOString(),
            entry_plan: {
                trigger_price: item.pivotPrice || item.breakoutLevel || item.currentPrice || 0,
                condition: scanType === 'POWER_PLAY' ? 'BREAKOUT' : 'PULLBACK'
            }
        }));
    }

    // --- NEW: High Conviction Logic ---
    private async scanForHighConviction(market: MarketTarget) {
        try {
            console.log(`[QuantScheduler] 🌟 Running High Conviction Scan for ${market}...`);
            const [gapStocks, eagleEye, volumeSpike] = await Promise.all([
                scanForGapStocks(market).catch(e => []),
                runEagleEyeScanner(market).catch(e => []),
                runVolumeSpikeScanner(market).catch(e => [])
            ]);

            const results: any[] = [];

            // Gap Stocks (Truth Layer Verified)
            gapStocks.forEach(g => {
                results.push({
                    market,
                    ticker: g.ticker,
                    stock_name: g.stockName,
                    strategy_name: 'CONVICTION_SCANNER',
                    pattern_name: 'GAP_HUNTER_VERIFIED',
                    key_factors: [`Gap: ${g.gapPercent}%`, `News: ${g.news}`, `Score: ${g.aiConfidence}`],
                    is_candidate: true,
                    status: 'WATCHING',
                    scan_type: 'CONVICTION',
                    created_at: new Date().toISOString()
                });
            });

            // Eagle Eye & Volume Spike
            [...eagleEye, ...volumeSpike].forEach(item => {
                results.push({
                    market,
                    ticker: item.ticker,
                    stock_name: item.stockName,
                    strategy_name: 'CONVICTION_SCANNER',
                    pattern_name: item.matchType || 'MOMENTUM_ALERT',
                    key_factors: [item.reason as string, `Price: ${item.price}`],
                    is_candidate: true,
                    status: 'WATCHING',
                    scan_type: 'CONVICTION',
                    created_at: new Date().toISOString()
                });
            });

            return results;

        } catch (error) {
            console.error('[QuantScheduler] Conviction Scan Error:', error);
            return [];
        }
    }

    // --- NEW: Hall of Fame Logic ---
    private async scanForHallOfFame(market: MarketTarget) {
        if (!supabase) return [];
        try {
            console.log(`[QuantScheduler] 🏆 Scanning Hall of Fame Strategies for ${market}...`);

            // 1. Fetch Tier S/A Strategies
            const { data: rawStrategies } = await supabase
                .from('strategies')
                .select('*')
                .eq('market', market)
                .in('tier', ['S', 'A'])
                .eq('is_active', true)
                .limit(3);

            const strategies = rawStrategies as any[];

            if (!strategies || strategies.length === 0) return [];

            const results: any[] = [];

            // 2. Run Scan for each HoF Strategy (using Genome)
            for (const strat of strategies) {
                // In a real scenario, we would pass 'strat' to a specialized scanner.
                // For now, we reuse scanForGenomeMomentum but would ideally customize prompt based on strat.logic
                const candidates = await scanForGenomeMomentum(market).catch(e => []);

                candidates.forEach(c => {
                    results.push({
                        market,
                        ticker: c.ticker,
                        stock_name: c.stockName,
                        strategy_name: strat.name, // "Golden Cross Alpha" etc.
                        pattern_name: 'HALL_OF_FAME',
                        key_factors: [`[HoF Tier ${strat.tier}] ${strat.name}`, c.matchedPattern, `Score: ${c.aiConfidence}`],
                        is_candidate: true,
                        status: 'WATCHING',
                        scan_type: 'HOF',
                        created_at: new Date().toISOString()
                    });
                });
            }

            return results;

        } catch (error) {
            console.error('[QuantScheduler] HoF Scan Error:', error);
            return [];
        }
    }
}

export const quantScreenerScheduler = new QuantScreenerScheduler();
