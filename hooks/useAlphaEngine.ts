// copy-of-sepa-ai/hooks/useAlphaEngine.ts
import { useState, useCallback, useEffect, useRef } from 'react';
import type { StrategyPlaybook, MarketTarget, Signal, InvestmentPersona, UserWatchlistItem, WatchlistHistoryItem, AlphaEngineSources, UserStrategy, MarketHealth, ActiveSignal, MarketRegimeAnalysis, AutopilotStatus } from '../types';
import { processWatchlistItemForPlaybook, fetchActiveSignals, clearPlaybookFromDB, generatePlaybooksFromCandidates } from '../services/gemini/alphaEngineService';
import { isMarketOpen } from '../services/utils/dateUtils';
import { supabase } from '../services/supabaseClient';
// FIX: Corrected typo from REALTIME_DEBOunce_MS to REALTIME_DEBOUNCE_MS.
import { USE_REALTIME_ALPHA, REALTIME_DEBOUNCE_MS, REALTIME_WINDOW_MS, USE_EVOLUTION_LAYER, SUPABASE_URL, SUPABASE_ANON_KEY } from '../config';
// import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { _fetchLatestPrice } from '../services/dataService';


interface RealtimeSignal {
    id: string;
    ticker: string;
    stock_name: string;
    source: string;
    rationale: string;
    weight: number;
    created_at: string;
    receivedAt: number; // Client-side timestamp
}

interface SignalGroup {
    ticker: string;
    stockName: string;
    signals: RealtimeSignal[];
    lastSignalAt: number;
}

interface AlphaEngineMarketState {
    strategyPlaybooks: StrategyPlaybook[] | null;
    isPlaybookLoading: boolean;
    playbookError: string | null;
    playbookGeneratedAt: string | null;
    changeSummary: string | null;
    reviewLog: { stockName: string; decision: string; reason: string; }[];
    activeSignals: Signal[] | null;
    isMonitoring: boolean;
    marketStatusMessage: string;
    processingTicker: string | null;
    autopilotStatus: AutopilotStatus;
}

const initialMarketState: AlphaEngineMarketState = {
    strategyPlaybooks: null,
    isPlaybookLoading: false,
    playbookError: null,
    playbookGeneratedAt: null,
    changeSummary: null,
    reviewLog: [],
    activeSignals: [],
    isMonitoring: false,
    marketStatusMessage: '감시 대기 중',
    processingTicker: null,
    autopilotStatus: {
        isEnabled: true,
        lastRun: null,
        nextRun: null,
        reason: null,
    }
};

export const useAlphaEngine = (
    marketTarget: MarketTarget,
    persona: InvestmentPersona,
    sources: AlphaEngineSources,
    isReadyForAnalysis: boolean,
    activeUserStrategies: UserStrategy[],
    marketRegime: MarketRegimeAnalysis | null,
    marketHealth: MarketHealth | null,
) => {
    const [marketStates, setMarketStates] = useState<{ KR: AlphaEngineMarketState, US: AlphaEngineMarketState }>({
        KR: { ...initialMarketState },
        US: { ...initialMarketState },
    });

    const [countdown, setCountdown] = useState(0);
    const [isCheckingSignals, setIsCheckingSignals] = useState(false);
    const sentryTimerRef = useRef<number | null>(null);
    const selfEvolutionTimerRef = useRef<number | null>(null);
    const hourlyCheckTimerRef = useRef<number | null>(null);


    // [α-Link Phase 2] Real-time state
    const signalBuffer = useRef<RealtimeSignal[]>([]);
    const debounceTimer = useRef<number | null>(null);
    const [scannerWeights, setScannerWeights] = useState<Map<string, number>>(new Map());


    const currentMarketState = marketStates[marketTarget];
    const { isPlaybookLoading } = currentMarketState;

    const updatePlaybookInDB = useCallback(async (target: MarketTarget, newPlaybooks: StrategyPlaybook[]) => {
        if (!supabase) return;
        try {
            // [Stability] 1. Delete ALL old playbooks for this market to prevent "ghost" entries
            const { error: deleteError } = await supabase
                .from('alpha_engine_playbooks')
                .delete()
                .eq('market', target);

            if (deleteError) {
                console.error("[AlphaEngine] Failed to clear old playbooks:", deleteError.message);
                // Proceed anyway, as upsert might handle ID conflicts, but best effort clean is attempted.
            }

            // 2. Flatten playbooks to DB rows
            const records = newPlaybooks.map(p => ({
                id: p.id,
                market: target,
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
                created_at: new Date().toISOString() // Use created_at as consistent timestamp
            }));

            // 3. Insert new records
            const { error } = await supabase
                .from('alpha_engine_playbooks')
                .insert(records as any); // Use insert since we cleared table for this market

            if (error) console.error("Failed to save playbook to DB:", error.message);

        } catch (dbError) {
            console.error("Failed to save playbook to DB:", dbError);
        }
    }, []);

    const runPlaybookGeneration = useCallback(async (isForced: boolean = false, source: string = 'manual', reason: string = '') => {
        if (!supabase) return;
        const currentState = marketStates[marketTarget];
        if (currentState.isPlaybookLoading && !isForced) return;

        console.log(`[AlphaEngine] Run triggered: ${source} - ${reason}`);

        setMarketStates(prev => ({
            ...prev,
            [marketTarget]: { ...prev[marketTarget], isPlaybookLoading: true, marketStatusMessage: `Analyzing... (${reason})` }
        }));

        try {
            // 1. Fetch candidates from watchlist
            const { data: watchlistData } = await supabase.from('user_watchlist').select('*');

            let candidates: UserWatchlistItem[] = [];
            if (watchlistData) {
                candidates = watchlistData.map(item => ({
                    ticker: item.ticker,
                    stockName: item.stock_name,
                    addedAt: item.created_at,
                    tags: item.tags || [],
                    notes: item.notes
                }));
            }

            if (candidates.length === 0) {
                console.log("[AlphaEngine] No candidates found in watchlist.");
                setMarketStates(prev => ({ ...prev, [marketTarget]: { ...prev[marketTarget], isPlaybookLoading: false, marketStatusMessage: "대기 중 (후보 종목 없음)" } }));
                return;
            } else {
                console.log(`[AlphaEngine] Candidates for Playbook: ${candidates.length}`, candidates.map(c => c.ticker));
            }

            // 2. Generate Playbooks
            const { playbooks, summary } = await generatePlaybooksFromCandidates(
                candidates,
                persona,
                marketTarget,
                activeUserStrategies,
                marketRegime
            );

            // 3. Save to DB
            await updatePlaybookInDB(marketTarget, playbooks);

            // 4. Update Local State
            setMarketStates(prev => ({
                ...prev,
                [marketTarget]: {
                    ...prev[marketTarget],
                    strategyPlaybooks: playbooks,
                    playbookGeneratedAt: new Date().toISOString(),
                    marketStatusMessage: "분석 완료",
                    changeSummary: summary // Store the summary
                }
            }));

        } catch (error) {
            console.error("[AlphaEngine] Generation failed:", error);
            setMarketStates(prev => ({ ...prev, [marketTarget]: { ...prev[marketTarget], playbookError: String(error) } }));
        } finally {
            setMarketStates(prev => ({ ...prev, [marketTarget]: { ...prev[marketTarget], isPlaybookLoading: false } }));
        }

    }, [marketTarget, marketStates, persona, activeUserStrategies, marketRegime, updatePlaybookInDB]); // Updated dependencies

    const onRunEngine = runPlaybookGeneration;

    // DB Fetch on mount
    useEffect(() => {
        if (!supabase) return;

        const fetchFromDB = async () => {
            setMarketStates(prev => ({ ...prev, [marketTarget]: { ...prev[marketTarget], isPlaybookLoading: true } }));

            // Fetch ALL rows for this market (flattened structure)
            const { data, error } = await supabase
                .from('alpha_engine_playbooks')
                .select('*')
                .eq('market', marketTarget)
                .order('created_at', { ascending: false }); // Get latest using created_at

            if (data) {
                // Map DB rows back to StrategyPlaybook objects
                const loadedPlaybooks: StrategyPlaybook[] = (data as any[]).map(row => ({
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
                    addedAt: row.created_at, // Map created_at to addedAt
                    source: row.source,
                    sources: row.sources
                }));

                const sortedPlaybooks = loadedPlaybooks.sort((a, b) => (b.aiConfidence || 0) - (a.aiConfidence || 0));

                // Use the most recent created_at as the generation time
                const latestTime = data.length > 0 ? data[0].created_at : null;

                setMarketStates(prev => ({
                    ...prev,
                    [marketTarget]: {
                        ...prev[marketTarget],
                        strategyPlaybooks: sortedPlaybooks,
                        playbookGeneratedAt: latestTime,
                    }
                }));
            }
            if (error) {
                setMarketStates(prev => ({ ...prev, [marketTarget]: { ...prev[marketTarget], playbookError: error.message } }));
            }
            setMarketStates(prev => ({ ...prev, [marketTarget]: { ...prev[marketTarget], isPlaybookLoading: false } }));
        };

        const loadStatusFromStorage = () => {
            // ... existing logic ...
            const savedStatus = localStorage.getItem(`autopilotStatus_${marketTarget}`);
            if (savedStatus) {
                setMarketStates(prev => ({ ...prev, [marketTarget]: { ...prev[marketTarget], autopilotStatus: JSON.parse(savedStatus) } }));
            }
        }

        fetchFromDB();
        loadStatusFromStorage();
    }, [marketTarget]);

    // Sentry Logic
    useEffect(() => {
        if (sentryTimerRef.current) clearInterval(sentryTimerRef.current);
        const SENTRY_INTERVAL_SECONDS = 30;

        const performSentryCheck = () => {
            setMarketStates(currentStates => {
                const playbooks = currentStates[marketTarget].strategyPlaybooks;
                const marketState = isMarketOpen(marketTarget);

                if (!marketState.isOpen) {
                    setIsCheckingSignals(false);
                    return { ...currentStates, [marketTarget]: { ...currentStates[marketTarget], isMonitoring: false, marketStatusMessage: marketState.message } };
                }
                if (!playbooks || playbooks.length === 0) {
                    setIsCheckingSignals(false);
                    return { ...currentStates, [marketTarget]: { ...currentStates[marketTarget], isMonitoring: true, marketStatusMessage: "플레이북 없음" } };
                }

                setIsCheckingSignals(true);
                setCountdown(SENTRY_INTERVAL_SECONDS);

                fetchActiveSignals(playbooks, marketTarget, persona, false)
                    .then(signals => setMarketStates(prev => ({ ...prev, [marketTarget]: { ...prev[marketTarget], activeSignals: signals } })))
                    .catch(e => console.error("[AlphaEngine Sentry] Error:", e.message))
                    .finally(() => setIsCheckingSignals(false));

                return { ...currentStates, [marketTarget]: { ...currentStates[marketTarget], isMonitoring: true, marketStatusMessage: marketState.message } };
            });
        };

        performSentryCheck();
        sentryTimerRef.current = window.setInterval(performSentryCheck, SENTRY_INTERVAL_SECONDS * 1000);
        const countdownInterval = setInterval(() => setCountdown(prev => (prev > 0 ? prev - 1 : 0)), 1000);

        return () => {
            if (sentryTimerRef.current) clearInterval(sentryTimerRef.current);
            clearInterval(countdownInterval);
        };
    }, [marketTarget, persona]);


    // Self-Evolution Cycle (Autonomous Learning System)
    useEffect(() => {
        // Cleanup previous timers
        if (selfEvolutionTimerRef.current) clearTimeout(selfEvolutionTimerRef.current);
        if (hourlyCheckTimerRef.current) clearInterval(hourlyCheckTimerRef.current);

        const calculateNextCheckpoint = (market: MarketTarget): { nextRun: Date | null, timeout: number } => {
            const timeZone = market === 'KR' ? 'Asia/Seoul' : 'America/New_York';
            const checkpoints = market === 'KR'
                ? [{ hour: 10, minute: 30 }, { hour: 14, minute: 0 }]
                : [{ hour: 10, minute: 30 }, { hour: 15, minute: 0 }];

            const now = new Date();
            const marketTimeStr = now.toLocaleString('en-US', { timeZone });
            const marketNow = new Date(marketTimeStr);
            const marketDay = marketNow.getDay();

            // Skip weekends
            if ((market === 'KR' || market === 'US') && (marketDay === 0 || marketDay === 6)) {
                return { nextRun: null, timeout: -1 };
            }

            // Find next checkpoint today
            let nextRun: Date | null = null;
            for (const cp of checkpoints) {
                const next = new Date(marketNow);
                next.setHours(cp.hour, cp.minute, 0, 0);
                if (next > marketNow) {
                    nextRun = next;
                    break;
                }
            }

            // If no more checkpoints today, schedule for tomorrow's first checkpoint
            if (!nextRun) {
                const tomorrow = new Date(marketNow);
                tomorrow.setDate(tomorrow.getDate() + 1);
                if (tomorrow.getDay() === 6) tomorrow.setDate(tomorrow.getDate() + 2); // Skip Saturday
                if (tomorrow.getDay() === 0) tomorrow.setDate(tomorrow.getDate() + 1); // Skip Sunday
                tomorrow.setHours(checkpoints[0].hour, checkpoints[0].minute, 0, 0);
                nextRun = tomorrow;
            }

            const timeout = nextRun.getTime() - marketNow.getTime();
            return { nextRun, timeout };
        };

        const setupNextCheckpoint = () => {
            const { nextRun, timeout } = calculateNextCheckpoint(marketTarget);

            if (nextRun && timeout > 0) {
                console.log(`[AlphaEngine Self-Evolution] Next checkpoint: ${nextRun.toISOString()}`);

                selfEvolutionTimerRef.current = window.setTimeout(() => {
                    const currentState = marketStates[marketTarget];
                    if (currentState.autopilotStatus.isEnabled && !isPlaybookLoading) {
                        console.log(`[AlphaEngine Self-Evolution] 🤖 Automatic scan triggered for ${marketTarget}`);
                        onRunEngine(true, 'autopilot', '장중 정기 점검');
                    }
                    setupNextCheckpoint(); // Recursively schedule next checkpoint
                }, timeout);
            }
        };

        const checkAndTriggerHourly = () => {
            const { autopilotStatus } = marketStates[marketTarget];
            if (!autopilotStatus.isEnabled || isPlaybookLoading) return;

            const now = new Date();
            const lastRunDate = autopilotStatus.lastRun ? new Date(autopilotStatus.lastRun) : null;

            // Weekly Deep Scan (Sunday evening after 6 PM)
            if (now.getDay() === 0 && now.getHours() >= 18) {
                const weeklyScanKey = `lastWeeklyScan_${marketTarget}`;
                const lastWeeklyScanStr = localStorage.getItem(weeklyScanKey);
                const lastWeeklyScan = lastWeeklyScanStr ? new Date(lastWeeklyScanStr) : null;
                const todayStr = now.toDateString();

                // 오늘 이미 실행했는지 확인
                if (lastWeeklyScan && lastWeeklyScan.toDateString() === todayStr) {
                    // 이미 실행함
                } else {
                    const weeksSinceLastRun = lastRunDate
                        ? (now.getTime() - lastRunDate.getTime()) / (7 * 24 * 60 * 60 * 1000)
                        : 999;

                    if (weeksSinceLastRun >= 1) {
                        console.log("[AlphaEngine Self-Evolution] 📚 Weekly deep scan triggered");
                        localStorage.setItem(weeklyScanKey, now.toISOString()); // 실행 기록 저장
                        onRunEngine(true, 'autopilot', '주간 정기 스캔');
                        return;
                    }
                }
            }

            // Sector Rotation Detection
            if (marketHealth && marketHealth.leadingSectors && marketHealth.leadingSectors.length > 0) {
                const storageKey = `previousSectors_${marketTarget}`;
                const storedData = localStorage.getItem(storageKey);
                const todayStr = new Date().toISOString().split('T')[0];

                if (storedData) {
                    try {
                        const { date: prevDate, sectors: prevSectors } = JSON.parse(storedData);
                        if (prevDate !== todayStr) {
                            const currentSectors = new Set(marketHealth.leadingSectors);
                            const prevSectorsSet = new Set(prevSectors);
                            const intersection = new Set([...currentSectors].filter(x => prevSectorsSet.has(x)));
                            const overlap = prevSectorsSet.size > 0 ? intersection.size / prevSectorsSet.size : 1;

                            if (overlap < 0.5) {
                                console.log("[AlphaEngine Self-Evolution] 🔄 Sector rotation detected! Triggering rescan...");
                                onRunEngine(true, 'autopilot', '주도 섹터 변경 감지');
                                localStorage.setItem(storageKey, JSON.stringify({ date: todayStr, sectors: marketHealth.leadingSectors }));
                                return;
                            }
                        }
                    } catch (e) {
                        console.error("[AlphaEngine Self-Evolution] Error parsing sector data:", e);
                    }
                } else {
                    localStorage.setItem(storageKey, JSON.stringify({ date: todayStr, sectors: marketHealth.leadingSectors }));
                }
            }
        };

        // Initialize autonomous learning system
        setupNextCheckpoint();
        hourlyCheckTimerRef.current = window.setInterval(checkAndTriggerHourly, 60 * 60 * 1000); // Every hour
        checkAndTriggerHourly(); // Run immediately once

        // Cleanup on unmount or dependencies change
        return () => {
            if (selfEvolutionTimerRef.current) clearTimeout(selfEvolutionTimerRef.current);
            if (hourlyCheckTimerRef.current) clearInterval(hourlyCheckTimerRef.current);
        };

    }, [marketTarget, isPlaybookLoading, onRunEngine, marketHealth]);

    return {
        ...currentMarketState,
        onRunEngine,
        countdown,
        isCheckingSignals,
    };
};
