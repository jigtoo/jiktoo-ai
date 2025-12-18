// copy-of-sepa-ai/hooks/useAlphaLink.ts
import { useState, useCallback, useEffect, useRef } from 'react';
import type { MarketTarget, StrategyPlaybook, RealtimeSignal, UserWatchlistItem, BFLSignal, DetectedMaterial, ChartPatternResult, SupplyEagleSignal } from '../types';
import { supabase } from '../services/supabaseClient';
import { USE_REALTIME_ALPHA, REALTIME_DEBOUNCE_MS, REALTIME_WINDOW_MS } from '../config';
import { generatePlaybooksForWatchlist } from '../services/gemini/alphaEngineService';
import { scannerHub } from '../services/discovery/ScannerHubService'; // [Architecture 2.0] Discovery Engine
import { generateAndSave as generateOracleBriefing } from '../services/gemini/marketLogicService';
// FIX: Add missing import for RealtimePostgresChangesPayload
// import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

// Type received from Supabase
interface RealtimeSignalDB extends Omit<RealtimeSignal, 'stockName'> {
    stock_name: string | null;
    id: string;
    detected_at: string;
}

interface SignalGroup {
    ticker: string;
    stockName: string;
    signals: RealtimeSignal[];
    lastSignalAt: number;
}

export const useAlphaLink = (
    marketTarget: MarketTarget,
    watchlistItems: UserWatchlistItem[],
    bflSignals: BFLSignal[] | null,
    materialSignals: DetectedMaterial[] | null,
    patternSignals: ChartPatternResult[] | null,
    supplyEagleSignals: SupplyEagleSignal[] | null,
    aiQuantSignals: any[] | null, // NEW: Signals from AIQuantScreener
) => {
    const [playbooks, setPlaybooks] = useState<StrategyPlaybook[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const signalBuffer = useRef<Map<string, SignalGroup>>(new Map());
    const processingTimer = useRef<number | null>(null);
    const [isGlobalScanning, setIsGlobalScanning] = useState(false);

    // Load existing playbooks from DB on mount
    const storageKey = `jiktoo_playbooks_v3_${marketTarget}`; // Version bumped to clear stale mock data

    // Load existing playbooks from DB on mount
    useEffect(() => {
        const loadPlaybooks = async () => {
            try {
                // 1. Try LocalStorage first (Fastest) - Market Specific Key
                const localData = localStorage.getItem(storageKey);

                if (localData) {
                    const parsed = JSON.parse(localData);
                    console.log(`[AlphaLink] Loaded from LocalStorage (${marketTarget}):`, parsed.length);
                    // Filter out any potentially stale playbooks that might have snuck in (optional, but safe)
                    setPlaybooks(parsed);
                } else {
                    // If no local data for this market, start empty to avoid showing wrong market data
                    setPlaybooks([]);
                }

                // 2. Try Supabase (Source of Truth)
                if (!supabase) {
                    console.warn('[AlphaLink] Supabase client not initialized. Cannot load from DB.');
                    return;
                }

                const { data, error } = await supabase
                    .from('alpha_engine_playbooks')
                    .select('*')
                    .eq('market', marketTarget) // Filter by market!
                    .order('created_at', { ascending: false })
                    .limit(20);

                if (error) {
                    console.warn('[AlphaLink] Supabase load failed (using local data if available):', error.message);
                    return;
                }

                if (data) {
                    console.log(`[AlphaLink] ✅ Loaded ${data.length} playbooks from Supabase (${marketTarget})`);

                    // Map Supabase data to StrategyPlaybook type
                    const dbPlaybooks: StrategyPlaybook[] = (data as any[]).map(row => ({
                        id: row.id,
                        stockName: row.stock_name,
                        ticker: row.ticker,
                        strategyName: row.strategy_name,
                        strategySummary: row.strategy_summary,
                        aiConfidence: row.ai_confidence,
                        keyLevels: row.key_levels,
                        strategyType: row.strategy_type,
                        analysisChecklist: row.analysis_checklist || [],
                        isUserRecommended: row.is_user_recommended,
                        addedAt: row.created_at,
                        source: row.source,
                        sources: row.sources
                    }));

                    // Merge with external signals (BFL, Material, Pattern) if they exist but aren't in DB yet
                    // This ensures "Closing Price Betting" signals appear even if not yet fully processed into playbooks by the backend
                    const mergedPlaybooks = [...dbPlaybooks];

                    // Helper to check existence
                    const exists = (ticker: string) => mergedPlaybooks.some(p => p.ticker === ticker);

                    // Merge BFL Signals
                    if (bflSignals) {
                        bflSignals.forEach(sig => {
                            if (!exists(sig.ticker)) {
                                mergedPlaybooks.push({
                                    id: `bfl-${sig.ticker}-${Date.now()}`,
                                    stockName: sig.stockName,
                                    ticker: sig.ticker,
                                    strategyName: '기타',
                                    strategySummary: `[종가배팅] ${sig.rationale}`,
                                    aiConfidence: sig.aiConfidence,
                                    keyLevels: {
                                        entry: sig.currentPrice.replace(/[^0-9.]/g, ''),
                                        target: (parseFloat(sig.currentPrice.replace(/[^0-9.]/g, '')) * 1.05).toFixed(0),
                                        stopLoss: (parseFloat(sig.currentPrice.replace(/[^0-9.]/g, '')) * 0.98).toFixed(0)
                                    },
                                    strategyType: 'SwingTrade',
                                    analysisChecklist: sig.keyMetrics.map(m => ({
                                        criterion: m.name,
                                        isMet: m.isPass,
                                        details: m.value
                                    })),
                                    isUserRecommended: false,
                                    addedAt: new Date().toISOString(),
                                    source: 'gemini'
                                });
                            }
                        });
                    }

                    // Merge Supply Eagle Signals
                    if (supplyEagleSignals) {
                        supplyEagleSignals.forEach(sig => {
                            if (!exists(sig.ticker)) {
                                mergedPlaybooks.push({
                                    id: `eagle-${sig.ticker}-${Date.now()}`,
                                    stockName: sig.stockName || sig.ticker,
                                    ticker: sig.ticker,
                                    strategyName: '기타',
                                    strategySummary: `[수급포착] ${sig.rationale || '기관/외국인 수급 포착'}`,
                                    aiConfidence: sig.aiConfidence || 50,
                                    keyLevels: {
                                        entry: sig.currentPrice ? sig.currentPrice.replace(/[^0-9.]/g, '') : '0',
                                        target: sig.currentPrice ? (parseFloat(sig.currentPrice.replace(/[^0-9.]/g, '')) * 1.1).toFixed(0) : '0',
                                        stopLoss: sig.currentPrice ? (parseFloat(sig.currentPrice.replace(/[^0-9.]/g, '')) * 0.95).toFixed(0) : '0'
                                    },
                                    strategyType: 'SwingTrade',
                                    analysisChecklist: [
                                        { criterion: '매집 기간', isMet: true, details: sig.accumulationPeriod },
                                        { criterion: '주체', isMet: true, details: sig.buyerType },
                                        { criterion: '상태', isMet: true, details: sig.status }
                                    ],
                                    isUserRecommended: false,
                                    addedAt: new Date().toISOString(),
                                    source: 'gemini'
                                });
                            }
                        });
                    }

                    setPlaybooks(mergedPlaybooks);
                    // Sync back to local storage
                    localStorage.setItem(storageKey, JSON.stringify(mergedPlaybooks));
                }
            } catch (err) {
                console.error('[AlphaLink] Load error:', err);
            } finally {
                setIsLoading(false);
            }
        };

        loadPlaybooks();
    }, [marketTarget, bflSignals, supplyEagleSignals]); // Re-run if marketTarget or signals change

    // Save playbooks to Supabase and LocalStorage
    const savePlaybooksToDB = async (newPlaybooks: StrategyPlaybook[]) => {
        try {
            // CRITICAL FIX: Don't save empty arrays - this would clear existing playbooks!
            if (newPlaybooks.length === 0) {
                console.warn('[AlphaLink] Skipping save - empty playbook array. Existing playbooks preserved.');
                return;
            }

            // 1. Save to LocalStorage immediately (Fastest & Fallback)
            localStorage.setItem(storageKey, JSON.stringify(newPlaybooks));
            console.log('[AlphaLink] Saved to LocalStorage:', storageKey);

            if (!supabase) return;

            // 2. Prepare records for Supabase
            const records = newPlaybooks.map(p => ({
                id: p.id, // Ensure ID is included for upsert
                market: marketTarget,
                ticker: p.ticker,
                stock_name: p.stockName,
                strategy_name: p.strategyName,
                strategy_summary: p.strategySummary,
                ai_confidence: p.aiConfidence,
                key_levels: p.keyLevels,
                strategy_type: p.strategyType,
                analysis_checklist: p.analysisChecklist,
                is_user_recommended: p.isUserRecommended,
                source: p.source,
                sources: p.sources,
                created_at: p.addedAt || new Date().toISOString(),
                updated_at: new Date().toISOString() // Add updated_at
            }));

            console.log('[AlphaLink] Attempting to save', records.length, 'playbooks to Supabase...');

            const { error } = await supabase
                .from('alpha_engine_playbooks')
                .upsert(records, {
                    onConflict: 'id',
                    ignoreDuplicates: false // Ensure updates happen
                });

            if (error) {
                console.error('[AlphaLink] Supabase save failed (data is safe in LocalStorage):', error);
                console.error('[AlphaLink] Error details:', JSON.stringify(error, null, 2));
            } else {
                console.log('[AlphaLink] ✅ Saved to Supabase successfully');
            }
        } catch (err) {
            console.error('[AlphaLink] Save error:', err);
        }
    };

    const processSignalBuffer = useCallback(async () => {
        const now = Date.now();
        const readyToProcess = new Map<string, SignalGroup>();

        // Find signals that have had a resonance event and are ready to be processed
        for (const [ticker, group] of signalBuffer.current.entries()) {
            const sources = new Set(group.signals.map(s => s.source));
            const isReady = (now - group.lastSignalAt) > REALTIME_DEBOUNCE_MS;

            if (sources.size > 1 && isReady) {
                readyToProcess.set(ticker, group);
                signalBuffer.current.delete(ticker); // Remove from buffer
            }
        }

        if (readyToProcess.size > 0) {
            setIsLoading(true);
            try {
                // FIX: Replaced `generatePlaybookFromResonance` with `generatePlaybooksForWatchlist`
                // and flattened the result, as `generatePlaybooksForWatchlist` returns an array of playbooks.
                const newPlaybooksArrays = await Promise.all(
                    Array.from(readyToProcess.values()).map(group =>
                        generatePlaybooksForWatchlist(
                            [{
                                ticker: group.ticker,
                                stockName: group.stockName,
                                // Combine rationales from all signals in the group
                                rationale: group.signals.map(s => `[${s.source}] ${s.rationale}`).join(' / '),
                            }],
                            marketTarget
                        )
                    )
                );
                const newPlaybooks = newPlaybooksArrays.flat(); // Flatten the array of arrays

                // Save to DB
                await savePlaybooksToDB(newPlaybooks);

                setPlaybooks(prev => {
                    const updatedPlaybooks = [...prev];
                    newPlaybooks.forEach(newBook => {
                        const existingIndex = updatedPlaybooks.findIndex(p => p.ticker === newBook.ticker);
                        if (existingIndex > -1) {
                            updatedPlaybooks[existingIndex] = newBook;
                        } else {
                            updatedPlaybooks.push(newBook);
                        }
                    });
                    return updatedPlaybooks.sort((a, b) => (b.aiConfidence || 0) - (a.aiConfidence || 0));
                });

            } catch (e) {
                setError(e instanceof Error ? e.message : 'Failed to generate playbooks from resonance');
            } finally {
                setIsLoading(false);
            }
        }

        // Clean up old signals from buffer that never resonated
        for (const [ticker, group] of signalBuffer.current.entries()) {
            if (now - group.lastSignalAt > REALTIME_WINDOW_MS) {
                signalBuffer.current.delete(ticker);
            }
        }
    }, [marketTarget]);

    useEffect(() => {
        if (!USE_REALTIME_ALPHA || !supabase) return;

        // FIX: Replaced RealtimeChannel with any
        let channel: any;

        const setupSubscription = () => {
            channel = supabase!.channel('realtime_signals')
                // FIX: Remove generic from `.on` and type the payload in the callback instead.
                .on(
                    'postgres_changes',
                    { event: 'INSERT', schema: 'public', table: 'realtime_signals' },
                    // FIX: Replaced RealtimePostgresChangesPayload with any
                    (payload: any) => {
                        const newSignal: RealtimeSignalDB = payload.new;

                        const group = signalBuffer.current.get(newSignal.ticker) || {
                            ticker: newSignal.ticker,
                            stockName: newSignal.stock_name || 'Unknown',
                            signals: [],
                            lastSignalAt: Date.now(),
                        };

                        group.signals.push({
                            source: newSignal.source as RealtimeSignal['source'],
                            ticker: newSignal.ticker,
                            stockName: newSignal.stock_name,
                            rationale: newSignal.rationale,
                            weight: newSignal.weight,
                        });
                        group.lastSignalAt = Date.now();

                        signalBuffer.current.set(newSignal.ticker, group);
                    }
                )
                .subscribe();
        };

        setupSubscription();

        // Set up the processor interval
        processingTimer.current = window.setInterval(processSignalBuffer, REALTIME_DEBOUNCE_MS);

        return () => {
            if (channel && supabase) supabase.removeChannel(channel);
            if (processingTimer.current) clearInterval(processingTimer.current);
        };
    }, [processSignalBuffer]);

    const forceGlobalScan = useCallback(async () => {
        console.log('[AlphaLink] forceGlobalScan called. isGlobalScanning:', isGlobalScanning);

        if (isGlobalScanning) {
            console.warn('[AlphaLink] Already scanning, skipping...');
            return;
        }

        setIsGlobalScanning(true);
        setError(null);
        try {
            const candidates: { ticker: string; stockName: string; rationale: string; }[] = [];

            // Helper function to check if ticker matches market
            const isMarketMatch = (ticker: string): boolean => {
                if (marketTarget === 'KR') {
                    // KR tickers end with .KS, .KQ OR are 6-digit numbers
                    return ticker.endsWith('.KS') || ticker.endsWith('.KQ') || /^\d{6}$/.test(ticker);
                } else {
                    // US tickers don't have suffix (and are not 6 digits usually)
                    return !ticker.includes('.') && !/^\d{6}$/.test(ticker);
                }
            };

            // [Quality Filter] Filter watchlist by quality before adding to candidates
            const MIN_QUALITY_SCORE = 70; // Only quality stocks get playbooks
            const qualifiedWatchlist: typeof watchlistItems = [];

            for (const item of watchlistItems.filter(item => isMarketMatch(item.ticker))) {
                try {
                    // Fetch real-time price data for quality check
                    const priceData = await scannerTools.fetchStockPrice(item.ticker, marketTarget);

                    let qualityScore = 50; // Base score

                    if (priceData) {
                        // Check 1: Volume (50K+ shares daily)
                        const volume = parseInt(priceData.volume?.replace(/,/g, '') || '0');
                        if (volume >= 50000) qualityScore += 20;

                        // Check 2: Not crashing (> -10% weekly)
                        const changeRate = parseFloat(priceData.changeRate?.replace('%', '') || '0');
                        if (changeRate > -10) {
                            qualityScore += 20;
                        } else {
                            qualityScore -= 30; // Heavy penalty for crashing stocks
                        }

                        // Check 3: Positive momentum
                        if (changeRate > 0) qualityScore += 10;
                    }

                    if (qualityScore >= MIN_QUALITY_SCORE) {
                        qualifiedWatchlist.push(item);
                    } else {
                        console.log(`[AlphaLink] ⚠️ Watchlist filtered: ${item.stockName} (Quality: ${qualityScore} < ${MIN_QUALITY_SCORE})`);
                    }
                } catch (error) {
                    // If price data fails, include by default (benefit of doubt)
                    console.warn(`[AlphaLink] Price check failed for ${item.stockName}, including by default`);
                    qualifiedWatchlist.push(item);
                }
            }

            console.log(`[AlphaLink] Watchlist quality filter: ${watchlistItems.length} -> ${qualifiedWatchlist.length} qualified stocks`);

            qualifiedWatchlist.forEach(item => candidates.push({ ...item, rationale: '사용자 관심종목 (검증됨)' }));

            (bflSignals || [])
                .filter(signal => isMarketMatch(signal.ticker))
                .forEach(signal => candidates.push({ ticker: signal.ticker, stockName: signal.stockName, rationale: `종가배팅: ${signal.rationale}` }));

            (materialSignals || []).forEach(material =>
                material.relatedStocks
                    .filter(stock => isMarketMatch(stock.ticker))
                    .forEach(stock => candidates.push({ ...stock, rationale: `재료 레이더: ${material.title}` }))
            );

            (patternSignals || [])
                .filter(pattern => isMarketMatch(pattern.symbol))
                .forEach(pattern => {
                    const passedHit = pattern.strategy_hits.find(h => h.passed);
                    if (passedHit) candidates.push({ ticker: pattern.symbol, stockName: pattern.stockName, rationale: `패턴 스크리너: ${passedHit.name}` });
                });

            (supplyEagleSignals || [])
                .filter(eagle => isMarketMatch(eagle.ticker))
                .forEach(eagle => candidates.push({ ticker: eagle.ticker, stockName: eagle.stockName, rationale: `수급 독수리: ${eagle.rationale}` }));

            // NEW: AI Quant Screener Signals
            (aiQuantSignals || [])
                .filter(signal => isMarketMatch(signal.ticker))
                .forEach(signal => candidates.push({
                    ticker: signal.ticker,
                    stockName: signal.stockName,
                    rationale: `AI 퀀트: ${signal.rationale} (점수: ${signal.aiScore || 80})`
                }));

            const uniqueCandidates = Array.from(new Map(candidates.map(item => [item.ticker, item])).values());

            console.log('[AlphaLink] Collected candidates:', {
                total: candidates.length,
                unique: uniqueCandidates.length,
                watchlistItems: watchlistItems.length,
                bflSignals: bflSignals?.length || 0,
                materialSignals: materialSignals?.length || 0,
                patternSignals: patternSignals?.length || 0,
                supplyEagleSignals: supplyEagleSignals?.length || 0,
                marketTarget,
                candidates: uniqueCandidates.map(c => `${c.stockName}(${c.ticker})`)
            });

            // [Total Mobilization: Time-Based Active Scan]
            const now = new Date();
            const hour = now.getHours();
            const minute = now.getMinutes();
            const isMorningBriefingTime = hour === 8 && minute >= 30 && minute < 60; // 08:30 ~ 08:59
            const isCloseBettingTime = hour === 15 && minute >= 0 && minute <= 20; // 15:00 ~ 15:20

            console.log(`[AlphaLink] Conviction Scanner Activated. Time: ${hour}:${minute}`);

            // 1. Oracle Briefing (08:30 ~ 09:00)
            if (isMorningBriefingTime) {
                console.log('[AlphaLink] 🌅 Morning Briefing Time detected. Executing Oracle Briefing...');
                try {
                    // Assuming generateOracleBriefing is available in scope or imported
                    await generateOracleBriefing(marketTarget);
                    alert('모닝 브리핑(Oracle Briefing)이 생성되었습니다. 메인 화면을 확인하세요.');
                } catch (e) {
                    console.error('[AlphaLink] Oracle Briefing failed:', e);
                }
            }

            // 2. Active Scanners (Eagle Eye, Volume Spike, HOF) - Centralized via Hub
            console.log('[AlphaLink] 🦅 Executing Discovery Engine Scan (Hub)...');
            try {
                // [Architecture 2.0] Use Scanner Hub
                const hubResults = await scannerHub.runFullScan(marketTarget);

                hubResults.forEach(r => candidates.push({
                    ticker: r.ticker,
                    stockName: r.stockName,
                    rationale: `[${r.sourceScanner}] ${r.reason}`
                }));

            } catch (scanErr) {
                console.error('[AlphaLink] Active Scan failed:', scanErr);
            }

            // 3. Close Betting (15:00 ~ 15:20)
            if (isCloseBettingTime) {
                console.log('[AlphaLink] 🌇 Close Betting Window. BFL Scanner should be active.');
                // Note: BFL Scanner is typically triggered by its own hook/scheduler.
                // Here we ensure we capture any signals it has produced.
                if (bflSignals && bflSignals.length > 0) {
                    console.log(`[AlphaLink] Capturing ${bflSignals.length} BFL signals.`);
                } else {
                    console.warn('[AlphaLink] No BFL signals found yet. Ensure BFL Scanner is running.');
                }
            }

            // Re-deduplicate
            const freshCandidates = Array.from(new Map(candidates.map(item => [item.ticker, item])).values());

            if (freshCandidates.length > 0) {
                console.log(`[AlphaLink] Total candidates found: ${freshCandidates.length}`);
                uniqueCandidates.push(...freshCandidates);
            }

            if (uniqueCandidates.length === 0) {
                console.warn('[AlphaLink] No candidates found even after active scan. Keeping existing playbooks.');
                alert('현재 시장에서 포착된 특이 종목이 없습니다.\n\n[제안]\n1. 잠시 후 다시 시도해보세요.\n2. 관심종목에 종목을 추가하여 분석 범위를 넓혀보세요.\n\n기존 플레이북은 유지됩니다.');
                return;
            }

            console.log('[AlphaLink] Generating playbooks for', uniqueCandidates.length, 'candidates...');
            console.log('[AlphaLink] Candidate details:', uniqueCandidates);
            const newPlaybooks = await generatePlaybooksForWatchlist(uniqueCandidates, marketTarget);
            console.log('[AlphaLink] Generated', newPlaybooks.length, 'playbooks');
            console.log('[AlphaLink] Playbook details:', newPlaybooks);

            // CRITICAL FIX: Only save and update if we actually generated playbooks
            if (newPlaybooks.length === 0) {
                console.warn('[AlphaLink] Gemini returned 0 playbooks. This may indicate an API issue or filtering. Keeping existing playbooks.');
                alert('⚠️ AI가 플레이북을 생성하지 못했습니다.\n\n가능한 원인:\n1. Gemini API 응답 문제\n2. 종목이 전략 기준을 충족하지 못함\n\n기존 플레이북은 유지됩니다.');
                return;
            }

            // NEW: Manually map sources from candidates to newPlaybooks
            // Since generatePlaybooksForWatchlist might not preserve 'sourceScanner' in a structured way (only in text),
            // we patch it here to ensure UI tags appear.
            const enhancedPlaybooks = newPlaybooks.map(pb => {
                const candidate = uniqueCandidates.find(c => c.ticker === pb.ticker);
                if (candidate) {
                    // Extract source from rationale if formatted as "[Source] ..."
                    const match = candidate.rationale.match(/^\[(.*?)\]/);
                    if (match) {
                        const sourceTag = match[1];
                        // If Playbook doesn't have sources or is empty, add this
                        if (!pb.sources || pb.sources.length === 0) {
                            pb.sources = [sourceTag];
                        } else if (!pb.sources.includes(sourceTag)) {
                            pb.sources.push(sourceTag);
                        }
                    }
                }
                return pb;
            });

            // Save to DB
            await savePlaybooksToDB(enhancedPlaybooks);

            setPlaybooks(prev => {
                const updatedPlaybooks = [...prev];
                enhancedPlaybooks.forEach(newBook => {
                    const existingIndex = updatedPlaybooks.findIndex(p => p.ticker === newBook.ticker);
                    if (existingIndex > -1) {
                        updatedPlaybooks[existingIndex] = newBook;
                    } else {
                        updatedPlaybooks.push(newBook);
                    }
                });
                return updatedPlaybooks.sort((a, b) => (b.aiConfidence || 0) - (a.aiConfidence || 0));
            });

        } catch (e) {
            console.error('[AlphaLink] forceGlobalScan error:', e);
            const errorMessage = e instanceof Error ? e.message : '전체 재분석 중 오류가 발생했습니다.';
            setError(errorMessage);
            alert(`전체 신호 재분석 실패:\n${errorMessage}`);
        } finally {
            setIsGlobalScanning(false);
            console.log('[AlphaLink] forceGlobalScan completed. isGlobalScanning set to false');
        }
    }, [isGlobalScanning, watchlistItems, bflSignals, materialSignals, patternSignals, supplyEagleSignals, aiQuantSignals, marketTarget]);



    // REMOVED: loadSampleData (User requested removal of mock data)
    const loadSampleData = useCallback(() => {
        alert('샘플 데이터 기능이 비활성화되었습니다. 실제 데이터만 표시됩니다.');
    }, []);

    return {
        playbooks,
        isLoading,
        error,
        forceGlobalScan,
        isGlobalScanning,
        loadSampleData,
    };
};