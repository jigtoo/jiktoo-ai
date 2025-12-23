import { useState } from 'react';
import type { MarketTarget } from '../types';
import {
    runValuePivotScan,
    runPowerPlayScan,
    runTurnaroundScan,
    runVolumeDryUpScan,
    runHiddenStrengthScan
} from '../services/ScannerTools';
import { scanForGenomeMomentum } from '../services/gemini/screenerService';
import { STRATEGY_PRESETS } from '../services/strategy/StrategyPresets';
import { evaluateStrategyLatest } from '../services/strategy/BacktestEngine';
import { fetchDailyCandles } from '../services/dataService';
import { safetyGuard } from '../services/execution/SafetyGuard';
import { supabase } from '../services/supabaseClient';
import { scannerHub } from '../services/discovery/ScannerHubService';
import { useEffect } from 'react';
import { dynamicWatchlistService } from '../services/discovery/DynamicWatchlistService';

/**
 * [Dynamic Watchlist] Fetch from database instead of hardcoded list
 */
async function getUniverseForMarket(market: MarketTarget): Promise<Array<{ ticker: string, name: string, marketType?: string }>> {
    try {
        const watchlist = await dynamicWatchlistService.getWatchlist(market);
        return watchlist.map(s => ({
            ticker: s.ticker,
            name: s.stock_name,
            marketType: market === 'KR' ? (s.ticker.length === 6 ? 'KOSPI' : 'KOSDAQ') : undefined
        }));
    } catch (err) {
        console.warn(`[AIQuantScreener] Failed to fetch dynamic watchlist for ${market}, using fallback`);
        return getFallbackUniverse(market);
    }
}

/**
 * Fallback universe (minimal set) if dynamic watchlist fails
 */
function getFallbackUniverse(market: MarketTarget): Array<{ ticker: string, name: string, marketType?: string }> {
    console.warn(`[AIQuantScreener] Dynamic watchlist failed for ${market}. Returning empty universe.`);
    return []; // No hardcoded stocks - rely on dynamic data only
}

export const useAIQuantScreener = (marketTarget: MarketTarget) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [results, setResults] = useState<any[]>([]);
    const [activeRecipe, setActiveRecipe] = useState<string | null>(null);

    // Initial Load from DB
    useEffect(() => {
        const loadCachedResults = async () => {
            try {
                // Fetch results younger than 24 hours
                const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

                const { data, error: fetchError } = await supabase!
                    .from('ai_quant_screener_results')
                    .select('*')
                    .eq('market_target', marketTarget)
                    .gt('created_at', twentyFourHoursAgo)
                    .order('created_at', { ascending: false });

                if (data && data.length > 0) {
                    console.log(`[useAIQuantScreener] Loaded ${data.length} cached results.`);

                    const mappedCached = data.map((item: any) => ({
                        ticker: item.ticker,
                        stockName: item.stock_name,
                        referencePrice: item.price,
                        rationale: item.rationale || item.technical_signal,
                        market: marketTarget === 'KR' ? 'KOSPI' : 'NASDAQ',
                        aiScore: item.ai_score,
                        priceTimestamp: new Date(item.created_at).toLocaleTimeString(),
                        tradingStatus: 'Active'
                    }));

                    // Deduplicate
                    const uniqueTickers = new Set();
                    const uniqueResults: any[] = [];
                    for (const r of mappedCached) {
                        if (!uniqueTickers.has(r.ticker)) {
                            uniqueTickers.add(r.ticker);
                            uniqueResults.push(r);
                        }
                    }

                    setResults(uniqueResults);
                }
            } catch (err) {
                console.error('[useAIQuantScreener] Cache load failed:', err);
            }
        };

        loadCachedResults();

        // [NEW] Subscribe to ScannerHub events for realtime updates
        const subscription = scannerHub.event$.subscribe(event => {
            if (event.type === 'SCAN_COMPLETE' && event.market === marketTarget) {
                console.log('[useAIQuantScreener] 🔄 Scan Complete Event received. Refreshing UI...');
                loadCachedResults();
            }
        });

        return () => subscription.unsubscribe();
    }, [marketTarget]);

    // Helper to map results
    const mapToDashboard = (rawResults: any[], market: MarketTarget) => {
        return rawResults.map((r: any) => {
            let finalStockName = r.stockName || r.ticker;
            // Stock name will be fetched from dynamic watchlist or API

            const sourceTag = r.matchType ? `[${r.matchType}] ` : '';
            const baseRationale = r.technicalSignal || r.rationale || r.matchedPattern || '';
            const finalRationale = baseRationale.startsWith('[') ? baseRationale : `${sourceTag}${baseRationale}`;

            // [Fix] Badge Logic: Use detected market or fallback
            const marketLabel = r.market || (market === 'KR' ? 'KOSPI' : 'NASDAQ');

            return {
                ticker: r.ticker,
                stockName: finalStockName,
                referencePrice: typeof r.price === 'string' ? r.price : r.price?.toLocaleString(),
                rationale: finalRationale,
                market: marketLabel,
                aiScore: r.aiConfidence || 80,
                priceTimestamp: 'Just now',
                tradingStatus: 'Active'
            };
        });
    };

    // Helper: Prepare candidates with REAL DATA
    const prepareCandidates = async (market: MarketTarget): Promise<any[]> => {
        const universe = await getUniverseForMarket(market);
        console.log(`[Data Injection] Fetching real data for ${universe.length} items in ${market}...`);

        const validCandidates: any[] = [];
        const BATCH_SIZE = 5; // Prevent Rate Limits (429/500)

        for (let i = 0; i < universe.length; i += BATCH_SIZE) {
            const batch = universe.slice(i, i + BATCH_SIZE);
            console.log(`[Data Injection] Processing batch ${i / BATCH_SIZE + 1}/${Math.ceil(universe.length / BATCH_SIZE)}...`);

            const batchResults = await Promise.all(batch.map(async (item) => {
                try {
                    const candles = await fetchDailyCandles(item.ticker, market, 20);
                    if (!candles || candles.length === 0) return null;
                    const lastCandle = candles[candles.length - 1];
                    return {
                        ticker: item.ticker,
                        stockName: item.name,
                        currentPrice: lastCandle.close,
                        marketCap: 0,
                        market: (item as any).marketType || (market === 'US' ? 'NASDAQ' : undefined),
                        recentCandles: candles.map(c => ({
                            date: c.date,
                            close: c.close,
                            volume: c.volume
                        }))
                    };
                } catch (e) {
                    console.warn(`[Data Injection] Failed to fetch data for ${item.ticker}:`, e);
                    return null;
                }
            }));

            validCandidates.push(...batchResults.filter(c => c !== null));
            await new Promise(resolve => setTimeout(resolve, 1000)); // 1s delay between batches
        }

        // Batching complete. validCandidates is populated.
        console.log(`[Data Injection] Successfully prepared ${validCandidates.length} data-verified candidates.`);
        return validCandidates;
    };

    const handleScan = async (type: 'value' | 'power' | 'turnaround' | 'genome' | 'hof' | 'dryup' | 'hidden' | 'all') => {
        setIsLoading(true);
        setError(null);
        setActiveRecipe(type);
        setResults([]);

        try {
            // STEP 1: PREPARE REAL DATA (Data Injection)
            // Genome and HoF rely on their own logic/fetching, but others need injection.
            let candidates: any[] = [];
            if (['value', 'power', 'turnaround', 'dryup', 'hidden', 'all'].includes(type)) {
                candidates = await prepareCandidates(marketTarget);
            }

            let scanResults: any[] = [];

            if (type === 'all') {
                // Sequential Execution for 'Run All' with Deduplication
                const updateResultsUnique = (newItems: any[]) => {
                    setResults(prev => {
                        const existingTickers = new Set(prev.map(p => p.ticker));
                        const uniqueNew = newItems.filter(item => !existingTickers.has(item.ticker));
                        return [...prev, ...uniqueNew];
                    });
                };

                try {
                    // Pass REAL DATA candidates to scanners
                    console.log('Running Value Pivot (Data-Driven)...');
                    const valueResults = await runValuePivotScan(marketTarget, candidates);
                    updateResultsUnique(mapToDashboard(valueResults, marketTarget));
                    await saveScanResults(mapToDashboard(valueResults, marketTarget), 'value');

                    console.log('Running Power Play (Data-Driven)...');
                    const powerResults = await runPowerPlayScan(marketTarget, candidates);
                    updateResultsUnique(mapToDashboard(powerResults, marketTarget));
                    await saveScanResults(mapToDashboard(powerResults, marketTarget), 'power');

                    console.log('Running Turnaround (Data-Driven)...');
                    const turnResults = await runTurnaroundScan(marketTarget, candidates);
                    updateResultsUnique(mapToDashboard(turnResults, marketTarget));
                    await saveScanResults(mapToDashboard(turnResults, marketTarget), 'turnaround');

                    console.log('Running Volume Dry-Up (Data-Driven)...');
                    const dryUpResults = await runVolumeDryUpScan(marketTarget, candidates);
                    updateResultsUnique(mapToDashboard(dryUpResults, marketTarget));
                    await saveScanResults(mapToDashboard(dryUpResults, marketTarget), 'dryup');

                    console.log('Running Hidden Strength (Data-Driven)...');
                    const hiddenStrengthResults = await runHiddenStrengthScan(marketTarget, candidates);
                    updateResultsUnique(mapToDashboard(hiddenStrengthResults, marketTarget));
                    await saveScanResults(mapToDashboard(hiddenStrengthResults, marketTarget), 'hidden');

                    console.log('Running Genome Hunter...');
                    const genomeSignals = await scanForGenomeMomentum(marketTarget);
                    const genomeResults = genomeSignals.map(s => ({
                        ticker: s.ticker,
                        stockName: s.stockName,
                        price: s.currentPrice,
                        matchType: 'Genome',
                        rationale: s.matchedPattern,
                        aiConfidence: s.aiConfidence
                    }));
                    updateResultsUnique(mapToDashboard(genomeResults, marketTarget));
                    await saveScanResults(mapToDashboard(genomeResults, marketTarget), 'genome');

                    console.log('Running Hall of Fame Strategies (Wide Scan)...');
                    const hofResults = await runHallOfFameScan(marketTarget);
                    updateResultsUnique(mapToDashboard(hofResults, marketTarget));
                    await saveScanResults(mapToDashboard(hofResults, marketTarget), 'hof');

                } catch (e) {
                    console.error('Sequential scan error:', e);
                }
                setIsLoading(false); // Done
                return;
            }

            if (type === 'value') {
                scanResults = await runValuePivotScan(marketTarget, candidates);
            } else if (type === 'power') {
                scanResults = await runPowerPlayScan(marketTarget, candidates);
            } else if (type === 'turnaround') {
                scanResults = await runTurnaroundScan(marketTarget, candidates);
            } else if (type === 'genome') {
                const signals = await scanForGenomeMomentum(marketTarget);
                scanResults = signals.map(s => ({
                    ticker: s.ticker,
                    stockName: s.stockName,
                    price: s.currentPrice,
                    matchType: 'Genome',
                    rationale: s.matchedPattern,
                    aiConfidence: s.aiConfidence
                }));
            } else if (type === 'hof') {
                scanResults = await runHallOfFameScan(marketTarget);
            }

            const mappedResults = mapToDashboard(scanResults, marketTarget);
            setResults(mappedResults);

            // Save to DB
            await saveScanResults(mappedResults, type);

        } catch (err) {
            setError('스캔 중 오류가 발생했습니다. 다시 시도해주세요.');
            console.error(err);
        } finally {
            if (type !== 'all') setIsLoading(false);
        }
    };

    // Helper to save to DB (Quant Results AND Alpha-Link Playbook)
    const saveScanResults = async (items: any[], strategyType: string) => {
        try {
            // 1. Save to Screener Results (Cache)
            const dbRecords = items.map(item => ({
                id: `${marketTarget}_${item.ticker}_${strategyType}`,
                market_target: marketTarget,
                ticker: item.ticker,
                stock_name: item.stockName,
                price: item.referencePrice,
                rationale: item.rationale,
                ai_score: item.aiScore,
                technical_signal: item.rationale, // Mapping rationale to technical_signal
                strategy_type: strategyType,
                created_at: new Date().toISOString()
            }));

            await supabase!
                .from('ai_quant_screener_results')
                .upsert(dbRecords as any, { onConflict: 'id' });

            // 2. [NEW] Save High-Conviction items to Alpha-Link Playbook (Relaxed: Score >= 60)
            // [USER REQUEST] Include ALL captured items to Alpha-Link Playbook for comprehensive monitoring
            const highConviction = items; // items.filter(i => i.aiScore >= 60 || ...); -> REMOVED FILTER

            if (highConviction.length > 0) {
                console.log(`[UseQuantScreener] Promoting ${highConviction.length} items to Alpha-Link Playbook...`);
                // Use a heuristic for 'pattern' name
                const pattern = strategyType === 'genome' ? 'Genome Pattern' : (strategyType === 'hof' ? 'Hall of Fame' : 'AI Discovery');

                const playbookRecords = highConviction.map(item => ({
                    market: marketTarget,
                    ticker: item.ticker,
                    stock_name: item.stockName,
                    strategy_name: `AI Screener (${strategyType})`,
                    pattern_name: item.rationale?.substring(0, 50) || pattern,
                    key_factors: [
                        item.rationale || 'AI Selected',
                        `Score: ${item.aiScore}`,
                        `Price: ${item.referencePrice}`
                    ],
                    ai_confidence: item.aiScore >= 80 ? 80 : (item.aiScore >= 60 ? 60 : 50), // Map score to confidence
                    example_chart: '',
                    created_at: new Date().toISOString()
                }));

                await supabase!
                    .from('alpha_engine_playbooks')
                    .upsert(playbookRecords as any);
            }
        } catch (e) {
            console.error('Save error:', e);
        }
    };

    // NEW: Hall of Fame Strategy Scanner (Algorithm)
    const runHallOfFameScan = async (market: MarketTarget): Promise<any[]> => {
        console.log('[Hall of Fame] Starting Wide Scan...');
        const results: any[] = [];

        // Wide Universe from dynamic watchlist
        const universe = await getUniverseForMarket(market);

        // Test each ticker against all Hall of Fame strategies
        for (const item of universe) {
            const { ticker, name } = item;

            try {
                // Fetch historical data (100 days for optimization)
                const candles = await fetchDailyCandles(ticker, market, 100);

                if (!candles || candles.length < 50) {
                    // console.log(`[Hall of Fame] Insufficient data for ${ticker}`);
                    continue;
                }

                // [Safety Protocol] Check for Toxic Assets
                const currentPrice = candles[candles.length - 1].close;
                const toxicity = safetyGuard.isToxicAsset(name, currentPrice);
                if (toxicity.isToxic) {
                    console.warn(`[SafetyGuard] 🛡️ Filtered Toxic Asset: ${name} (${ticker}) - ${toxicity.reason}`);
                    continue;
                }

                // Convert OHLCV to Bar format
                const bars = candles.map(c => ({
                    t: new Date(c.date).getTime(),
                    o: c.open,
                    h: c.high,
                    l: c.low,
                    c: c.close,
                    v: c.volume
                }));

                // Test against each Hall of Fame strategy
                for (const preset of STRATEGY_PRESETS) {
                    try {
                        const isMatch = evaluateStrategyLatest(preset.logic, bars);

                        // Debug log for matches only to reduce noise
                        if (isMatch) {
                            console.log(`[Hall of Fame] ✅ ${ticker} (${name}) matches ${preset.name}`);

                            results.push({
                                ticker,
                                stockName: name, // Use real name
                                matchType: 'Hall of Fame',
                                price: currentPrice,
                                rationale: `[${preset.author}] ${preset.name}`,
                                aiConfidence: 85,
                                technicalSignal: preset.description
                            });
                            break; // One match per ticker is enough
                        }
                    } catch (strategyError) {
                        // console.error(`[Hall of Fame] Strategy ${preset.name} ERROR for ${ticker}:`, strategyError);
                    }
                }
            } catch (error) {
                console.warn(`[Hall of Fame] Error scanning ${ticker}:`, error);
            }
        }

        console.log(`[Hall of Fame] Wide Scan Complete. Found ${results.length} matches.`);
        return results;
    };

    return {
        results,
        isLoading,
        error,
        handleScan,
        activeRecipe
    };
};
