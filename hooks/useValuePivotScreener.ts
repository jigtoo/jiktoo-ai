// hooks/useValuePivotScreener.ts
import { useState, useCallback, useEffect } from 'react';
import type { MarketTarget, UserWatchlistItem, ValuePivotScreenerResult } from '../types';
import { runStructuralGrowthScan } from '../services/gemini/screenerService';
import { supabase } from '../services/supabaseClient';

const FEATURE_DISABLED_ERROR = "스크리너 기록 기능이 비활성화되었습니다. Supabase 연결을 확인해주세요.";

export const useValuePivotScreener = (marketTarget: MarketTarget, watchlistItems: UserWatchlistItem[]) => {
    const [results, setResults] = useState<ValuePivotScreenerResult[] | null>(null);
    const [isHistoryLoading, setIsHistoryLoading] = useState(true);
    const [isScanning, setIsScanning] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const updateHistoryInDB = useCallback(async (newResults: ValuePivotScreenerResult[], target: MarketTarget) => {
        if (!supabase) {
            console.warn(FEATURE_DISABLED_ERROR);
            return;
        }
        try {
            // FIX: Cast RPC call to 'any' to resolve 'never' type error.
            const { error } = await (supabase.rpc as any)('rpc_upsert_value_pivot_history', {
                p_market: target,
                p_results: newResults,
            });
            if (error) throw error;
        } catch (dbError) {
             const message = dbError instanceof Error ? dbError.message : '스크리너 기록 저장에 실패했습니다.';
            setError(message);
        }
    }, []);
    
    useEffect(() => {
        const fetchHistory = async () => {
            if (!supabase) {
                setError(FEATURE_DISABLED_ERROR);
                setIsHistoryLoading(false);
                return;
            }
            setIsHistoryLoading(true);
            setError(null);
            try {
                // FIX: Cast RPC call to 'any' to resolve 'never' type error.
                const { data, error } = await (supabase.rpc as any)('rpc_get_value_pivot_history', {
                    p_market: marketTarget,
                });

                if (error) {
                     if (error.message.includes('function public.rpc_get_value_pivot_history(p_market => text) does not exist')) {
                         throw new Error("데이터베이스 설정 오류: 'rpc_get_value_pivot_history' 함수가 없습니다. README의 SQL 스크립트를 실행하여 데이터베이스를 업데이트하세요.");
                    }
                    throw error;
                }
                
                if (data && data.length > 0) {
                    setResults((data[0] as any).results as ValuePivotScreenerResult[] || null);
                } else {
                    setResults(null); // No history found
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : '과거 스크리너 기록을 불러오지 못했습니다.');
            } finally {
                setIsHistoryLoading(false);
            }
        };

        fetchHistory();
    }, [marketTarget]);


    const runScan = useCallback(async (mode: 'full' | 'watchlist') => {
        setIsScanning(true);
        setError(null);

        const candidates = mode === 'watchlist' ? watchlistItems : undefined;

        if (mode === 'watchlist' && (!candidates || candidates.length === 0)) {
            setError("관심종목이 비어있어 필터링을 실행할 수 없습니다. '탐색' 탭에서 관심종목을 먼저 추가해주세요.");
            setIsScanning(false);
            return;
        }

        try {
            const data = await runStructuralGrowthScan(marketTarget, candidates);
            setResults(data);
            await updateHistoryInDB(data, marketTarget);
        } catch (err) {
            setError(err instanceof Error ? err.message : '가치-피벗 스크리닝 중 오류가 발생했습니다.');
        } finally {
            setIsScanning(false);
        }
    }, [marketTarget, watchlistItems, updateHistoryInDB]);

    return {
        results,
        isLoading: isHistoryLoading || isScanning,
        error,
        runScan,
    };
};
