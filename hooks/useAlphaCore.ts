// copy-of-sepa-ai/hooks/useAlphaCore.ts
import { useState, useCallback, useEffect } from 'react';
import type { AlphaCoreResult, MarketTarget } from '../types';
import { runAlphaCoreScan } from '../services/gemini/screenerService';
import { supabase } from '../services/supabaseClient';

export const useAlphaCore = (marketTarget: MarketTarget) => {
    const [result, setResult] = useState<AlphaCoreResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isScanTriggered, setIsScanTriggered] = useState(false);
    const [previousSignals, setPreviousSignals] = useState<any[]>([]);

    // Load previous signals AND latest result from Supabase on mount
    useEffect(() => {
        const loadPreviousData = async () => {
            if (!supabase) return;

            try {
                // Load previous signals
                const { data: signals, error: fetchError } = await supabase
                    .from('alpha_core_signals')
                    .select('*')
                    .eq('market', marketTarget)
                    .eq('is_active', true)
                    .order('created_at', { ascending: false })
                    .limit(10);

                if (!fetchError && signals) {
                    setPreviousSignals(signals);
                    console.log(`[useAlphaCore] ✅ Loaded ${signals.length} previous signals from Supabase`);

                    // Auto-load the most recent result to display
                    if (signals.length > 0) {
                        const latest = signals[0];
                        const reconstructedResult: AlphaCoreResult = {
                            date: latest.date,
                            market: latest.market,
                            final_pick: {
                                ticker: latest.ticker,
                                name: latest.stock_name,
                                scores: latest.scores as any,
                                actionSignal: latest.action_signal,
                                signalStrength: latest.signal_strength,
                                actionReason: latest.action_reason,
                                rationale: latest.rationale
                            },
                            pr_route: { used: false, steps: [] }, // Not stored in DB
                            alpha_decay_flag: false // Not stored in DB
                        };
                        setResult(reconstructedResult);
                        console.log('[useAlphaCore] ✅ Auto-loaded latest result from DB');
                    }
                }
            } catch (err) {
                console.error('[useAlphaCore] Error loading previous data:', err);
            }
        };

        loadPreviousData();
    }, [marketTarget]);

    const runScan = useCallback(() => {
        // This function just triggers the effect. It's fast and non-blocking.
        setIsScanTriggered(true);
    }, []);

    useEffect(() => {
        // This effect runs when the scan is triggered.
        if (!isScanTriggered) {
            return;
        }

        const executeScan = async () => {
            setIsLoading(true);
            setError(null);
            setResult(null);

            try {
                // STEP 1: Fetch pre-calculated quant data from DB
                if (!supabase) throw new Error("Supabase is not connected.");

                // FIX: Cast RPC call to 'any' to resolve 'never' type error.
                const { data: quantMetrics, error: rpcError } = await (supabase.rpc as any)('rpc_get_daily_quant_metrics', {
                    p_market: marketTarget,
                });

                if (rpcError) {
                    if (rpcError.message.includes('function rpc_get_daily_quant_metrics(text) does not exist')) {
                        throw new Error("데이터베이스 설정 오류: 'rpc_get_daily_quant_metrics' 함수가 없습니다. README의 SQL 스크립트를 실행하여 데이터베이스를 업데이트하세요.");
                    }
                    throw rpcError;
                }

                if (!quantMetrics || quantMetrics.length === 0) {
                    throw new Error("오늘의 퀀트 데이터가 없습니다. '운영' 탭으로 이동하여 [오늘의 퀀트 데이터 생성] 버튼을 먼저 실행해주세요.");
                }

                // STEP 2: Call Gemini with the pre-calculated data
                const scanResult = await runAlphaCoreScan(marketTarget, quantMetrics);
                setResult(scanResult);

                // STEP 3: Save signal to Supabase for persistence
                if (scanResult.final_pick && supabase) {
                    try {
                        const { error: insertError } = await supabase
                            .from('alpha_core_signals')
                            .insert({
                                date: scanResult.date,
                                market: scanResult.market,
                                ticker: scanResult.final_pick.ticker,
                                stock_name: scanResult.final_pick.name,
                                adjusted_score: scanResult.final_pick.scores.adjusted_score,
                                action_signal: scanResult.final_pick.actionSignal,
                                signal_strength: scanResult.final_pick.signalStrength,
                                action_reason: scanResult.final_pick.actionReason,
                                scores: scanResult.final_pick.scores,
                                rationale: scanResult.final_pick.rationale,
                                is_active: true
                            });

                        if (insertError) {
                            console.error('[useAlphaCore] Failed to save signal to Supabase:', insertError);
                        } else {
                            console.log('[useAlphaCore] ✅ Signal saved to Supabase:', scanResult.final_pick.ticker);
                        }
                    } catch (saveError) {
                        console.error('[useAlphaCore] Error saving signal:', saveError);
                    }
                }

            } catch (e) {
                setError(e instanceof Error ? e.message : '알파 코어 스캔 중 알 수 없는 오류가 발생했습니다.');
            } finally {
                setIsLoading(false);
                setIsScanTriggered(false); // Reset the trigger
            }
        };

        executeScan();
    }, [isScanTriggered, marketTarget]);

    return {
        result,
        isLoading,
        error,
        runScan,
        previousSignals, // NEW: Return previous signals
    };
};
