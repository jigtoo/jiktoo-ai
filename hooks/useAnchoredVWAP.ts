// hooks/useAnchoredVWAP.ts
/**
 * Anchored VWAP Hook
 * 주요 이벤트 기준 기관 평단가 추적
 */

import { useState, useCallback, useEffect } from 'react';
import type { AnchoredVWAP, MarketTarget } from '../types';
import { calculateAnchoredVWAP } from '../services/anchoredVWAP';
import { supabase } from '../services/supabaseClient';

interface UseAnchoredVWAP {
    vwaps: AnchoredVWAP[] | null;
    isLoading: boolean;
    error: string | null;
    previousVWAPs: AnchoredVWAP[];
    runCalculation: (tickers: string[]) => Promise<void>;
}

export const useAnchoredVWAP = (marketTarget: MarketTarget): UseAnchoredVWAP => {
    const [vwaps, setVWAPs] = useState<AnchoredVWAP[] | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [previousVWAPs, setPreviousVWAPs] = useState<AnchoredVWAP[]>([]);

    // 이전 VWAP 데이터 로드
    const loadPreviousVWAPs = useCallback(async () => {
        if (!supabase) return;

        try {
            const { data, error: fetchError } = await supabase
                .from('anchored_vwap')
                .select('*')
                .eq('market', marketTarget)
                .order('created_at', { ascending: false })
                .limit(20); // 최근 20개

            if (!fetchError && data) {
                const parsedVWAPs: AnchoredVWAP[] = data.map(row => ({
                    ticker: row.ticker,
                    stockName: row.stock_name,
                    anchorDate: row.anchor_date,
                    anchorEvent: row.anchor_event,
                    anchorPrice: parseFloat(row.anchor_price),
                    vwapPrice: parseFloat(row.vwap_price),
                    currentPrice: parseFloat(row.current_price),
                    distancePercent: parseFloat(row.distance_percent),
                    isSupport: row.is_support,
                    strength: row.strength,
                    priceAction: row.price_action,
                    confidence: row.confidence
                }));

                setPreviousVWAPs(parsedVWAPs);
                console.log(`[Anchored VWAP] ✅ 이전 데이터 ${parsedVWAPs.length}개 로드 완료`);
            }
        } catch (err) {
            console.error('[Anchored VWAP] 이전 데이터 로드 실패:', err);
        }
    }, [marketTarget]);

    // VWAP 계산 실행
    const runCalculation = useCallback(async (tickers: string[]) => {
        if (tickers.length === 0) {
            console.warn('[Anchored VWAP] 종목 목록이 비어있습니다.');
            return;
        }

        setIsLoading(true);
        setError(null);
        setVWAPs(null);

        try {
            console.log(`[Anchored VWAP] 계산 시작: ${tickers.length}개 종목`);

            // Gemini로 Anchored VWAP 계산
            const calculatedVWAPs = await calculateAnchoredVWAP(marketTarget, tickers);
            setVWAPs(calculatedVWAPs);

            // Supabase에 저장
            if (calculatedVWAPs.length > 0 && supabase) {
                const today = new Date().toISOString().split('T')[0];

                const rows = calculatedVWAPs.map(vwap => ({
                    date: today,
                    market: marketTarget,
                    ticker: vwap.ticker,
                    stock_name: vwap.stockName,
                    anchor_date: vwap.anchorDate,
                    anchor_event: vwap.anchorEvent,
                    anchor_price: vwap.anchorPrice,
                    vwap_price: vwap.vwapPrice,
                    current_price: vwap.currentPrice,
                    distance_percent: vwap.distancePercent,
                    is_support: vwap.isSupport,
                    strength: vwap.strength,
                    price_action: vwap.priceAction,
                    confidence: vwap.confidence
                }));

                const { error: insertError } = await supabase
                    .from('anchored_vwap')
                    .insert(rows);

                if (insertError) {
                    console.error('[Anchored VWAP] Supabase 저장 실패:', insertError);
                } else {
                    console.log(`[Anchored VWAP] ✅ ${calculatedVWAPs.length}개 데이터 저장 완료`);
                }
            }

            console.log(`[Anchored VWAP] ✅ 계산 완료: ${calculatedVWAPs.length}개 VWAP 생성`);

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Anchored VWAP 계산 중 오류 발생';
            setError(errorMessage);
            console.error('[Anchored VWAP] 오류:', err);
        } finally {
            setIsLoading(false);
        }
    }, [marketTarget]);

    // 초기 로드
    useEffect(() => {
        loadPreviousVWAPs();
    }, [loadPreviousVWAPs]);

    return {
        vwaps,
        isLoading,
        error,
        previousVWAPs,
        runCalculation
    };
};
