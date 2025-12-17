import { useState, useCallback, useEffect } from 'react';
import type { TenbaggerAnalysis, MarketTarget, TenbaggerDBRow } from '../types';
import { fetchTenbaggerAnalysis, fetchTenbaggerStatusCheck } from '../services/gemini/tenbaggerService';
import { supabase } from '../services/supabaseClient';

interface TenbaggerMarketState {
    data: TenbaggerAnalysis | null;
    isLoading: boolean;
    error: string | null;
    isChecking: boolean;
}

const initialMarketState: TenbaggerMarketState = {
    data: null,
    isLoading: false,
    error: null,
    isChecking: false,
};

const isTenbaggerDataValid = (data: any): data is TenbaggerAnalysis => {
    if (!data || typeof data !== 'object') return false;
    if (!Array.isArray(data.stocks) || typeof data.managerCommentary !== 'string' || !Array.isArray(data.changeLog)) {
        return false;
    }
    for (const stock of data.stocks) {
        if (!stock || typeof stock.ticker !== 'string' || typeof stock.stockName !== 'string' || typeof stock.performanceSinceAdded !== 'number') {
            return false;
        }
    }
    return true;
};

export const useTenbagger = (marketTarget: MarketTarget) => {
    const [marketStates, setMarketStates] = useState<{ KR: TenbaggerMarketState, US: TenbaggerMarketState }>({
        KR: { ...initialMarketState },
        US: { ...initialMarketState },
    });

    useEffect(() => {
        const fetchFromDB = async () => {
            if (!supabase) return;
            const { data, error } = await supabase
                .from('tenbagger_reports')
                .select('*')
                .eq('market', marketTarget)
                .maybeSingle();

            if (error) {
                console.error("Error fetching tenbagger data:", error);
            } else if (data) {
                const typedData = data as any;
                if (typedData && isTenbaggerDataValid(typedData.report_data)) {
                    setMarketStates(prev => ({...prev, [marketTarget]: {...prev[marketTarget], data: typedData.report_data as TenbaggerAnalysis}}));
                }
            }
        };
        fetchFromDB();
    }, [marketTarget]);


    const updateMarketData = useCallback(async (target: MarketTarget, newData: TenbaggerAnalysis) => {
        setMarketStates(prev => ({
            ...prev,
            [target]: { ...prev[target], data: newData, error: null }
        }));
        if (supabase) {
            // FIX: Cast payload to `any` to avoid Supabase client type inference issues.
            const { error } = await supabase.from('tenbagger_reports').upsert([{ market: target, report_data: newData, updated_at: new Date().toISOString() }] as any);
            if (error) {
                console.error("Error saving tenbagger data:", error);
                setMarketStates(prev => ({ ...prev, [target]: { ...prev[target], error: `텐배거 클럽 저장 실패: ${error.message}. 데이터베이스 RLS 정책에서 'authenticated' 역할에 INSERT/UPDATE 권한이 있는지 확인하세요.` } }));
            }
        }
    }, []);

    const handleFetchTenbaggerAnalysis = useCallback(async () => {
        setMarketStates(prev => ({ ...prev, [marketTarget]: { ...prev[marketTarget], isLoading: true, error: null } }));
        try {
            const data = await fetchTenbaggerAnalysis(marketTarget);
            if (!isTenbaggerDataValid(data)) {
                throw new Error("AI로부터 받은 데이터 형식이 올바르지 않습니다. 잠시 후 다시 시도해주세요.");
            }
            await updateMarketData(marketTarget, data);
        } catch (err: any) {
            setMarketStates(prev => ({ ...prev, [marketTarget]: { ...prev[marketTarget], error: err instanceof Error ? err.message : '텐배거 후보 선정 중 알 수 없는 오류가 발생했습니다.' } }));
        } finally {
            setMarketStates(prev => ({ ...prev, [marketTarget]: { ...prev[marketTarget], isLoading: false } }));
        }
    }, [marketTarget, updateMarketData]);

    const handleCheckTenbaggerStatus = useCallback(async () => {
        const currentData = marketStates[marketTarget].data;
        if (!currentData) return;
        setMarketStates(prev => ({ ...prev, [marketTarget]: { ...prev[marketTarget], isChecking: true, error: null } }));
        try {
            const data = await fetchTenbaggerStatusCheck(currentData, marketTarget);
             if (!isTenbaggerDataValid(data)) {
                throw new Error("AI로부터 받은 데이터 형식이 올바르지 않습니다. 잠시 후 다시 시도해주세요.");
            }
            await updateMarketData(marketTarget, data);
        } catch (err: any) {
            setMarketStates(prev => ({ ...prev, [marketTarget]: { ...prev[marketTarget], error: err instanceof Error ? err.message : '텐배거 상태 점검 중 알 수 없는 오류가 발생했습니다.' } }));
        } finally {
            setMarketStates(prev => ({ ...prev, [marketTarget]: { ...prev[marketTarget], isChecking: false } }));
        }
    }, [marketStates, marketTarget, updateMarketData]);
    
    const clearTenbaggerError = useCallback(() => {
        setMarketStates(prev => ({ ...prev, [marketTarget]: { ...prev[marketTarget], error: null } }));
    }, [marketTarget]);
    
    const currentMarketState = marketStates[marketTarget];
    
    // FIX: Rename properties to match TenbaggerDashboardProps
    return {
        data: currentMarketState.data,
        isLoading: currentMarketState.isLoading,
        error: currentMarketState.error,
        isChecking: currentMarketState.isChecking,
        onFetch: handleFetchTenbaggerAnalysis,
        onCheckStatus: handleCheckTenbaggerStatus,
        onClearError: clearTenbaggerError,
    };
}