// hooks/useVolatilityBreakout.ts
/**
 * 변동성 돌파 스캐너 Hook
 * 래리 윌리엄스 전략 + VIX 기반 Dynamic K
 */

import { useState, useCallback, useEffect } from 'react';
import type { VolatilityBreakout, MarketTarget } from '../types';
import { scanForVolatilityBreakouts, shouldTradeToday } from '../services/gemini/volatilityBreakout';
import { supabase } from '../services/supabaseClient';

interface UseVolatilityBreakout {
    breakouts: VolatilityBreakout[] | null;
    isLoading: boolean;
    error: string | null;
    previousBreakouts: VolatilityBreakout[];
    canTradeToday: boolean;
    runScan: (watchlist: string[]) => Promise<void>;
}

export const useVolatilityBreakout = (marketTarget: MarketTarget): UseVolatilityBreakout => {
    const [breakouts, setBreakouts] = useState<VolatilityBreakout[] | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [previousBreakouts, setPreviousBreakouts] = useState<VolatilityBreakout[]>([]);
    const [canTradeToday, setCanTradeToday] = useState(true);

    // 이전 돌파 신호 로드
    const loadPreviousBreakouts = useCallback(async () => {
        if (!supabase) return;

        try {
            const { data, error: fetchError } = await supabase
                .from('volatility_breakouts')
                .select('*')
                .eq('market', marketTarget)
                .eq('is_active', true)
                .order('created_at', { ascending: false })
                .limit(10);

            if (!fetchError && data) {
                const parsedBreakouts: VolatilityBreakout[] = data.map(row => ({
                    ticker: row.ticker,
                    stockName: row.stock_name,
                    market: row.market as MarketTarget,
                    date: row.date,
                    kValue: parseFloat(row.k_value),
                    vixLevel: parseFloat(row.vix_level),
                    previousDayRange: parseFloat(row.previous_day_range),
                    openPrice: parseFloat(row.open_price),
                    breakoutPrice: parseFloat(row.breakout_price),
                    currentPrice: parseFloat(row.current_price),
                    targetPrice: parseFloat(row.target_price),
                    stopLoss: parseFloat(row.stop_loss),
                    confidence: row.confidence,
                    rationale: row.rationale,
                    marketCondition: row.market_condition
                }));

                setPreviousBreakouts(parsedBreakouts);
                console.log(`[변동성 돌파] ✅ 이전 신호 ${parsedBreakouts.length}개 로드 완료`);
            }
        } catch (err) {
            console.error('[변동성 돌파] 이전 신호 로드 실패:', err);
        }
    }, [marketTarget]);

    // 스캔 실행
    const runScan = useCallback(async (watchlist: string[]) => {
        setIsLoading(true);
        setError(null);
        setBreakouts(null);

        try {
            console.log(`[변동성 돌파] 스캔 시작: ${watchlist.length}개 종목`);

            // Gemini로 변동성 돌파 스캔
            const scannedBreakouts = await scanForVolatilityBreakouts(marketTarget, watchlist);
            setBreakouts(scannedBreakouts);

            // VIX 레벨 확인 (첫 번째 신호에서 추출)
            if (scannedBreakouts.length > 0) {
                const vixLevel = scannedBreakouts[0].vixLevel;
                setCanTradeToday(shouldTradeToday(vixLevel));

                if (!shouldTradeToday(vixLevel)) {
                    console.warn(`[변동성 돌파] ⚠️ VIX ${vixLevel} - 극단적 변동성으로 매매 중단 권장`);
                }
            }

            // Supabase에 저장
            if (scannedBreakouts.length > 0 && supabase) {
                const rows = scannedBreakouts.map(breakout => ({
                    date: breakout.date,
                    market: breakout.market,
                    ticker: breakout.ticker,
                    stock_name: breakout.stockName,
                    k_value: breakout.kValue,
                    vix_level: breakout.vixLevel,
                    market_condition: breakout.marketCondition,
                    previous_day_range: breakout.previousDayRange,
                    open_price: breakout.openPrice,
                    breakout_price: breakout.breakoutPrice,
                    current_price: breakout.currentPrice,
                    target_price: breakout.targetPrice,
                    stop_loss: breakout.stopLoss,
                    confidence: breakout.confidence,
                    rationale: breakout.rationale,
                    is_active: true
                }));

                const { error: insertError } = await supabase
                    .from('volatility_breakouts')
                    .insert(rows);

                if (insertError) {
                    console.error('[변동성 돌파] Supabase 저장 실패:', insertError);
                } else {
                    console.log(`[변동성 돌파] ✅ ${scannedBreakouts.length}개 신호 저장 완료`);
                }
            }

            console.log(`[변동성 돌파] ✅ 스캔 완료: ${scannedBreakouts.length}개 신호 발견`);

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : '변동성 돌파 스캔 중 오류 발생';
            setError(errorMessage);
            console.error('[변동성 돌파] 오류:', err);
        } finally {
            setIsLoading(false);
        }
    }, [marketTarget]);

    // 초기 로드
    useEffect(() => {
        loadPreviousBreakouts();
    }, [loadPreviousBreakouts]);

    return {
        breakouts,
        isLoading,
        error,
        previousBreakouts,
        canTradeToday,
        runScan
    };
};
