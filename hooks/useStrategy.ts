
import { useState, useCallback, useEffect } from 'react';
import type { StrategicOutlook, MarketTarget } from '../types';
import { fetchStrategicOutlook } from '../services/gemini/strategyService';
import { supabase } from '../services/supabaseClient';


interface StrategyMarketState {
    outlook: StrategicOutlook | null;
    isLoading: boolean;
    error: string | null;
}

const initialMarketState: StrategyMarketState = {
    outlook: null,
    isLoading: false,
    error: null,
};

export const useStrategy = (marketTarget: MarketTarget) => {
    const [marketStates, setMarketStates] = useState<{ KR: StrategyMarketState, US: StrategyMarketState }>({
        KR: { ...initialMarketState },
        US: { ...initialMarketState },
    });

    useEffect(() => {
        const fetchFromDB = async () => {
            if (!supabase) return;
            setMarketStates(prev => ({ ...prev, [marketTarget]: { ...prev[marketTarget], isLoading: true }}));
            const { data, error } = await supabase
                .from('strategy_reports')
                .select('report_data')
                .eq('market', marketTarget)
                .maybeSingle();

            if (error) {
                console.error("Error fetching strategy report from DB:", error);
                setMarketStates(prev => ({ ...prev, [marketTarget]: { ...prev[marketTarget], error: error.message, isLoading: false }}));
            } else if (data) {
                const typedData = data as any;
                setMarketStates(prev => ({
                    ...prev,
                    [marketTarget]: {
                        ...prev[marketTarget],
                        outlook: typedData.report_data as StrategicOutlook,
                        isLoading: false
                    }
                }));
            } else {
                setMarketStates(prev => ({ ...prev, [marketTarget]: { ...prev[marketTarget], isLoading: false }}));
            }
        };
        fetchFromDB();
    }, [marketTarget]);

    const handleFetchStrategy = useCallback(async () => {
        setMarketStates(prev => ({ ...prev, [marketTarget]: { ...prev[marketTarget], isLoading: true, error: null } }));
        try {
            const data = await fetchStrategicOutlook(marketTarget);
            setMarketStates(prev => ({ ...prev, [marketTarget]: { ...prev[marketTarget], outlook: data } }));
            
            if (supabase) {
                const { error: dbError } = await supabase.from('strategy_reports').upsert([{ 
                    market: marketTarget, 
                    report_data: data, 
                    updated_at: new Date().toISOString() 
                }] as any);
                if (dbError) throw dbError;
            }

        } catch(err: any) {
            setMarketStates(prev => ({ ...prev, [marketTarget]: { ...prev[marketTarget], error: err instanceof Error ? err.message : '전략 전망을 생성하지 못했습니다.' } }));
        } finally {
            setMarketStates(prev => ({ ...prev, [marketTarget]: { ...prev[marketTarget], isLoading: false } }));
        }
    }, [marketTarget]);
    
    const currentMarketState = marketStates[marketTarget];
    
    // FIX: Rename properties to match StrategicOutlookDashboardProps
    return {
        outlook: currentMarketState.outlook,
        isLoading: currentMarketState.isLoading,
        error: currentMarketState.error,
        onFetch: handleFetchStrategy,
    };
};
