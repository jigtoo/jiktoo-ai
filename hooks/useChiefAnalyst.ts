// hooks/useChiefAnalyst.ts
import { useState, useCallback, useEffect, useRef } from 'react';
import type { ChiefAnalystBriefing, MarketTarget, MarketHealth, DashboardStock, AnomalyItem, DetectedMaterial, CoinStockSignal, ChartPatternResult } from '../types';
import { fetchChiefAnalystBriefing } from '../services/gemini/marketService';
import { _fetchLatestPrice } from '../services/dataService';
import { supabase } from '../services/supabaseClient';

// To prevent excessive API calls, we'll only trigger this analysis once per day per market.
const getStorageKey = (market: MarketTarget) => `jigtoo_chief_analyst_briefing_v1_${market}_${new Date().toISOString().split('T')[0]}`;

export const useChiefAnalyst = (
    marketTarget: MarketTarget,
    marketHealth: MarketHealth | null,
    dashboardStocks: DashboardStock[] | null,
    anomalies: AnomalyItem[] | null,
    materials: DetectedMaterial[] | null,
    coinStocks: CoinStockSignal[] | null,
    patterns: ChartPatternResult[] | null
) => {
    const [briefing, setBriefing] = useState<ChiefAnalystBriefing | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const lastFetchDate = useRef<Record<MarketTarget, string>>({ KR: '', US: '' });

    // Clear briefing state when market changes to provide immediate UI feedback.
    useEffect(() => {
        setBriefing(null);
        setError(null);
        setIsLoading(false);
    }, [marketTarget]);
    
    useEffect(() => {
        const executeFetch = async () => {
            const today = new Date().toISOString().split('T')[0];

            // 1. Prevent re-fetching if we already have today's data for this market in this session.
            if (lastFetchDate.current[marketTarget] === today) {
                return;
            }

            // 2. Only run if we have at least some data to analyze.
            const hasSufficientData = marketHealth || dashboardStocks || anomalies || materials || coinStocks || patterns;
            if (!hasSufficientData) {
                setBriefing(null); // Clear any stale data if dependencies are gone
                return;
            }
            
            // 3. Check localStorage for a valid cache for today.
            const storageKey = getStorageKey(marketTarget);
            try {
                const cachedBriefing = localStorage.getItem(storageKey);
                if (cachedBriefing) {
                    setBriefing(JSON.parse(cachedBriefing));
                    lastFetchDate.current[marketTarget] = today; // Mark as "fetched" for this session
                    return;
                }
            } catch (e) {
                console.error("Failed to parse cached briefing", e);
                localStorage.removeItem(storageKey); // Clear corrupted cache
            }

            // 4. If no valid cache, fetch new data from the API.
            setIsLoading(true);
            setError(null);
            try {
                const result = await fetchChiefAnalystBriefing(
                    marketTarget,
                    marketHealth,
                    dashboardStocks,
                    anomalies,
                    materials,
                    coinStocks,
                    patterns
                );

                if (result && result.topConvictionPicks && supabase) {
                    for (const pick of result.topConvictionPicks) {
                        try {
                            const { price } = await _fetchLatestPrice(pick.ticker, pick.stockName, marketTarget);
                            
                            const newPredictionForDB = {
                                market: marketTarget,
                                prediction_type: 'TopConvictionPick',
                                prediction_data: {
                                    ticker: pick.ticker,
                                    stockName: pick.stockName,
                                    rationale: pick.rationale,
                                },
                                is_reviewed: false,
                                price_at_prediction: price
                            };

                            // FIX: Cast payload to `any` to avoid Supabase client type inference issues.
                            const { error: insertError } = await supabase
                                .from('ai_predictions')
                                .insert([newPredictionForDB] as any);
                            
                            if (insertError) {
                                console.error(`[ChiefAnalyst] Error logging AI prediction for ${pick.ticker}:`, insertError.message);
                                console.error('[ChiefAnalyst] Full error object:', JSON.stringify(insertError, null, 2));
                            }

                        } catch (priceError) {
                            console.error(`[ChiefAnalyst] Could not fetch price to log prediction for ${pick.stockName}:`, priceError);
                        }
                    }
                }

                setBriefing(result);
                localStorage.setItem(storageKey, JSON.stringify(result));
                lastFetchDate.current[marketTarget] = today; // Mark as fetched after successful API call
            } catch (err) {
                setError(err instanceof Error ? err.message : '수석 애널리스트 브리핑 생성에 실패했습니다.');
                setBriefing(null); // Clear briefing on error
            } finally {
                setIsLoading(false);
            }
        };
        
        executeFetch();
        
    }, [marketTarget, marketHealth, dashboardStocks, anomalies, materials, coinStocks, patterns]);

    return { briefing, isLoading, error };
};