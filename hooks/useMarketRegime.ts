// hooks/useMarketRegime.ts
import { useState, useEffect, useCallback } from 'react';
import type { MarketTarget, MarketRegime, MarketRegimeAnalysis } from '../types';
import { supabase } from '../services/supabaseClient';
import { getMarketSessionState } from '../services/utils/dateUtils';

const REFRESH_INTERVAL_MINUTES = 5;

const initialRegime: MarketRegimeAnalysis = {
    regime: '데이터 없음',
    summary: '시장 레짐 데이터를 불러오는 중...',
};

export const useMarketRegime = (marketTarget: MarketTarget) => {
    const [regime, setRegime] = useState<MarketRegimeAnalysis>(initialRegime);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchRegime = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            if (!supabase) {
                throw new Error("Supabase is not connected.");
            }

            // The marketHealth view already contains the regime analysis.
            const { data, error: dbError } = await supabase
                .from('v_market_health_latest')
                .select('notes')
                .single();

            if (dbError) throw dbError;

            // FIX: Cast `data` to `any` to resolve Supabase type inference issue.
            if (data && (data as any).notes) {
                // FIX: Cast `data` to `any` to access the 'notes' property.
                const notes = JSON.parse((data as any).notes);
                if (notes.regimeAnalysis && notes.regimeAnalysis.regime) {
                    setRegime({
                        regime: notes.regimeAnalysis.regime as MarketRegime,
                        summary: notes.regimeAnalysis.adaptationAdvice || 'No summary available.',
                    });
                } else {
                    setRegime({ regime: '불확실', summary: 'AI가 시장 레짐을 판단하지 못했습니다.' });
                }
            } else {
                setRegime({ regime: '데이터 없음', summary: '최신 시장 건강 데이터가 없습니다.' });
            }
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : '시장 레짐 분석에 실패했습니다.';
            setError(errorMessage);
            setRegime({ regime: '불확실', summary: errorMessage });
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchRegime();
        const intervalId = setInterval(() => {
            // Update every 5 minutes regardless of market session
            // This ensures we show the latest data even after market close
            fetchRegime();
        }, REFRESH_INTERVAL_MINUTES * 60 * 1000);

        return () => clearInterval(intervalId);
    }, [fetchRegime, marketTarget]);

    return {
        regime,
        isLoading,
        error,
    };
};
