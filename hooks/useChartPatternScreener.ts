// hooks/useChartPatternScreener.ts
import { useState, useCallback, useEffect } from 'react';
import type { ChartPatternResult, MarketTarget, ScreenerTimeframe, ChartPatternScreenerDBRow } from '../types';
import { runChartPatternScreener } from '../services/gemini/screenerService';
import { supabase } from '../services/supabaseClient';
import { postSignal } from '../lib/postSignal';

const initialMarketState = {
    results: null as ChartPatternResult[] | null,
    isLoading: false,
    error: null as string | null,
    timeframe: 'Daily' as ScreenerTimeframe,
};

type ScreenerMarketState = typeof initialMarketState;

export const useChartPatternScreener = (marketTarget: MarketTarget) => {
    const [marketStates, setMarketStates] = useState<{ KR: ScreenerMarketState, US: ScreenerMarketState }>({
        KR: { ...initialMarketState },
        US: { ...initialMarketState, timeframe: 'Weekly' }, // US market default
    });

    useEffect(() => {
        const fetchFromDB = async () => {
            if (!supabase) return;
            const { data, error } = await supabase
                .from('chart_pattern_screener_results')
                .select('*')
                .eq('market', marketTarget)
                .maybeSingle();

            if (error) {
                console.error("Error fetching chart pattern scanner data:", error);
            } else if (data) {
                const typedData = data as any;
                setMarketStates(prev => ({ ...prev, [marketTarget]: { ...prev[marketTarget], results: typedData.results as ChartPatternResult[] } }));
            }
        };
        fetchFromDB();
    }, [marketTarget]);

    const runScan = useCallback(async () => {
        let current_timeframe: ScreenerTimeframe;

        setMarketStates(prev => {
            current_timeframe = prev[marketTarget].timeframe; // Get latest timeframe from state
            return { ...prev, [marketTarget]: { ...prev[marketTarget], isLoading: true, error: null } };
        });

        try {
            // @ts-ignore - current_timeframe is guaranteed to be assigned
            const data = await runChartPatternScreener(marketTarget, current_timeframe);

            // [α-Link] Publish signals
            data.forEach(result => {
                const passedHit = result.strategy_hits.find(h => h.passed);
                if (passedHit) {
                    postSignal({
                        source: 'pattern',
                        ticker: result.symbol,
                        stockName: result.stockName,
                        rationale: passedHit.name,
                        weight: (result.scores.final || 0) / 100.0, // Normalize to 0-1
                    });
                }
            });

            if (supabase) {
                await supabase.from('chart_pattern_screener_results').upsert([{
                    market: marketTarget,
                    results: data,
                    updated_at: new Date().toISOString(),
                }] as any);
            }

            setMarketStates(prev => ({ ...prev, [marketTarget]: { ...prev[marketTarget], results: data } }));

        } catch (err: any) {
            setMarketStates(prev => ({ ...prev, [marketTarget]: { ...prev[marketTarget], error: err instanceof Error ? err.message : '패턴 스크리닝 중 오류가 발생했습니다.' } }));
        } finally {
            setMarketStates(prev => ({ ...prev, [marketTarget]: { ...prev[marketTarget], isLoading: false } }));
        }
    }, [marketTarget]);

    const setTimeframe = (timeframe: ScreenerTimeframe) => {
        console.log('[ChartPatternScreener] Setting timeframe to:', timeframe);
        setMarketStates(prev => ({
            ...prev,
            [marketTarget]: { ...prev[marketTarget], timeframe: timeframe, },
        }));
    };

    const currentMarketState = marketStates[marketTarget];

    return {
        results: currentMarketState.results,
        isLoading: currentMarketState.isLoading,
        error: currentMarketState.error,
        runScan,
        timeframe: currentMarketState.timeframe,
        setTimeframe,
    };
};