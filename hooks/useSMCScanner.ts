// hooks/useSMCScanner.ts
/**
 * SMC (스마트 머니 개념) 스캐너 Hook
 * 기관 투자자의 발자국 추적: FVG, 유동성 스윕, 주문 블록
 */

import { useState, useCallback, useEffect } from 'react';
import type { SMCSignal, MarketTarget } from '../types';
import { scanForSMCSignals } from '../services/gemini/smcScanner';
import { supabase } from '../services/supabaseClient';

interface UseSMCScanner {
    signals: SMCSignal[] | null;
    isLoading: boolean;
    error: string | null;
    previousSignals: SMCSignal[];
    runScan: (watchlist: string[]) => Promise<void>;
}

export const useSMCScanner = (marketTarget: MarketTarget): UseSMCScanner => {
    const [signals, setSignals] = useState<SMCSignal[] | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [previousSignals, setPreviousSignals] = useState<SMCSignal[]>([]);

    // 이전 신호 로드 (앱 시작 시)
    const loadPreviousSignals = useCallback(async () => {
        if (!supabase) return;

        try {
            const { data, error: fetchError } = await supabase
                .from('smc_signals')
                .select('*')
                .eq('market', marketTarget)
                .eq('is_active', true)
                .order('created_at', { ascending: false })
                .limit(10);

            if (!fetchError && data) {
                // JSONB 필드를 파싱하여 SMCSignal 형태로 변환
                const parsedSignals: SMCSignal[] = data.map(row => ({
                    ticker: row.ticker,
                    stockName: row.stock_name,
                    market: row.market as MarketTarget,
                    fvg: row.fvg,
                    liquiditySweep: row.liquidity_sweep,
                    orderBlock: row.order_block,
                    confidence: row.confidence,
                    rationale: row.rationale,
                    entryPrice: parseFloat(row.entry_price),
                    targetPrice: parseFloat(row.target_price),
                    stopLoss: parseFloat(row.stop_loss),
                    riskRewardRatio: parseFloat(row.risk_reward_ratio),
                    timestamp: row.signal_timestamp
                }));

                setPreviousSignals(parsedSignals);
                console.log(`[SMC Scanner] ✅ 이전 신호 ${parsedSignals.length}개 로드 완료`);
            }
        } catch (err) {
            console.error('[SMC Scanner] 이전 신호 로드 실패:', err);
        }
    }, [marketTarget]);

    // 스캔 실행
    const runScan = useCallback(async (watchlist: string[]) => {
        setIsLoading(true);
        setError(null);
        setSignals(null);

        try {
            console.log(`[SMC Scanner] 스캔 시작: ${watchlist.length}개 종목`);

            // Gemini로 SMC 신호 스캔
            const scannedSignals = await scanForSMCSignals(marketTarget, watchlist);

            // [NEW] Enrich with Panic Sell Recovery Analysis
            const { analyzePanicSellRecovery } = await import('../services/volumeAnalysis');

            const enrichedSignals = await Promise.all(
                scannedSignals.map(async (signal) => {
                    try {
                        const panicAnalysis = await analyzePanicSellRecovery(signal.ticker, marketTarget);

                        // Add panic sell recovery data if detected
                        if (panicAnalysis.volumeClimax.isClimax || panicAnalysis.capitulationRecovery.isRecovering) {
                            return {
                                ...signal,
                                panicSellRecovery: {
                                    hasVolumeClimax: panicAnalysis.volumeClimax.isClimax,
                                    isRecovering: panicAnalysis.capitulationRecovery.isRecovering,
                                    volumeRatio: panicAnalysis.volumeClimax.volumeRatio,
                                    recoveryStrength: panicAnalysis.capitulationRecovery.strength,
                                    daysFromBottom: panicAnalysis.capitulationRecovery.daysFromBottom
                                },
                                // Boost confidence if both SMC and Panic Recovery detected
                                confidence: panicAnalysis.capitulationRecovery.isRecovering
                                    ? Math.min(100, signal.confidence + 20)
                                    : signal.confidence
                            };
                        }
                        return signal;
                    } catch (err) {
                        console.warn(`[SMC Scanner] Volume analysis failed for ${signal.ticker}:`, err);
                        return signal; // Return original signal if analysis fails
                    }
                })
            );

            setSignals(enrichedSignals);

            // Supabase에 저장
            if (enrichedSignals.length > 0 && supabase) {
                const today = new Date().toISOString().split('T')[0];

                const rows = enrichedSignals.map(signal => ({
                    date: today,
                    market: signal.market,
                    ticker: signal.ticker,
                    stock_name: signal.stockName,
                    fvg: signal.fvg,
                    liquidity_sweep: signal.liquiditySweep,
                    order_block: signal.orderBlock,
                    confidence: signal.confidence,
                    rationale: signal.rationale,
                    entry_price: signal.entryPrice,
                    target_price: signal.targetPrice,
                    stop_loss: signal.stopLoss,
                    risk_reward_ratio: signal.riskRewardRatio,
                    signal_timestamp: signal.timestamp,
                    is_active: true,
                    // [NEW] Store panic sell recovery data
                    panic_sell_recovery: signal.panicSellRecovery || null
                }));

                const { error: insertError } = await supabase
                    .from('smc_signals')
                    .insert(rows);

                if (insertError) {
                    console.error('[SMC Scanner] Supabase 저장 실패:', insertError);
                } else {
                    console.log(`[SMC Scanner] ✅ ${enrichedSignals.length}개 신호 저장 완료`);
                }
            }

            console.log(`[SMC Scanner] ✅ 스캔 완료: ${enrichedSignals.length}개 신호 발견`);

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'SMC 스캔 중 오류 발생';
            setError(errorMessage);
            console.error('[SMC Scanner] 오류:', err);
        } finally {
            setIsLoading(false);
        }
    }, [marketTarget]);

    // 초기 로드
    useEffect(() => {
        loadPreviousSignals();
    }, [loadPreviousSignals]);

    return {
        signals,
        isLoading,
        error,
        previousSignals,
        runScan
    };
};
