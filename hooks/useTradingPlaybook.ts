import { useState, useCallback, useEffect } from 'react';
import type { SuccessStoryItem, MarketTarget, PlaybookDBRow } from '../types';
import { fetchTradingPlaybook } from '../services/gemini/playbookService';
import { supabase } from '../services/supabaseClient';


interface TradingPlaybookMarketState {
    stories: SuccessStoryItem[];
    isLoading: boolean;
    error: string | null;
}

const initialMarketState: TradingPlaybookMarketState = {
    stories: [],
    isLoading: false,
    error: null,
};

export const useTradingPlaybook = (marketTarget: MarketTarget) => {
    const [marketStates, setMarketStates] = useState<{ KR: TradingPlaybookMarketState, US: TradingPlaybookMarketState }>({
        KR: { ...initialMarketState },
        US: { ...initialMarketState },
    });

    const handleFetchTradingPlaybook = useCallback(async () => {
        setMarketStates(prev => ({ ...prev, [marketTarget]: { ...prev[marketTarget], isLoading: true, error: null } }));
        try {
            const data = await fetchTradingPlaybook(marketTarget);
            setMarketStates(prev => ({
                ...prev,
                [marketTarget]: { ...prev[marketTarget], stories: data }
            }));
            if (supabase) {
                // Note: We are now primarily reading from alpha_engine_playbooks, so writing back to trading_playbooks is less critical,
                // but kept for legacy compatibility if needed.
                await supabase.from('trading_playbooks').upsert([{ market: marketTarget, stories: data, updated_at: new Date().toISOString() }] as any);
            }
        } catch (err: any) {
            setMarketStates(prev => ({ ...prev, [marketTarget]: { ...prev[marketTarget], error: err instanceof Error ? err.message : '트레이딩 플레이북을 불러오는 중 알 수 없는 오류가 발생했습니다.' } }));
        } finally {
            setMarketStates(prev => ({ ...prev, [marketTarget]: { ...prev[marketTarget], isLoading: false } }));
        }
    }, [marketTarget]);

    useEffect(() => {
        const fetchAndPopulate = async () => {
            // Start loading immediately when this effect runs for a new market
            setMarketStates(prev => ({ ...prev, [marketTarget]: { ...prev[marketTarget], isLoading: true, error: null } }));

            if (!supabase) {
                handleFetchTradingPlaybook();
                return;
            }

            // NEW: Read from 'alpha_engine_playbooks' (The Active Candidates Table)
            // This unifies the data source with the Bot/Scheduler.
            const { data, error } = await supabase
                .from('alpha_engine_playbooks')
                .select('*')
                .eq('market', marketTarget)
                .order('created_at', { ascending: false })
                .limit(50); // Get recent top 50 candidates

            if (error) {
                console.error("Error fetching playbook data from DB, falling back to Gemini:", error);
                handleFetchTradingPlaybook();
            } else {
                const typedData = data as any[];

                if (typedData && typedData.length > 0) {
                    console.log(`[useTradingPlaybook] Found ${typedData.length} active candidates in alpha_engine_playbooks for ${marketTarget}. Mapping to UI...`);

                    // Map alpha_engine_playbooks rows to SuccessStoryItem format for UI
                    const mappedStories: SuccessStoryItem[] = typedData.map(row => {
                        // Extract price from key_factors if possible
                        let price = 'N/A';
                        if (row.key_factors && Array.isArray(row.key_factors)) {
                            const priceFactor = row.key_factors.find((f: string) => f.includes('Price:'));
                            if (priceFactor) price = priceFactor.replace('Price:', '').trim();
                        }

                        // Generate a pseudo-profit rate or score for display
                        // In 'SuccessStory' context, we usually show profit. Here we show 'AI Score' or 'Potential'.
                        let score = 'N/A';
                        if (row.key_factors && Array.isArray(row.key_factors)) {
                            const scoreFactor = row.key_factors.find((f: string) => f.includes('Score:'));
                            if (scoreFactor) score = scoreFactor.replace('Score:', '').trim();
                        }

                        return {
                            ticker: row.ticker,
                            stockName: row.stock_name || row.ticker,
                            buyingPrice: price, // Display Current Price as Buying Price
                            profitRate: `Score: ${score}`, // Display AI Score as Profit Rate
                            holdingPeriod: row.pattern_name || row.strategy_name || 'AI Selected', // Display Pattern as Holding Period
                            description: (row.key_factors && row.key_factors[0]) ? row.key_factors[0] : 'AI generated high conviction setup',
                            chartUrl: row.example_chart || ''
                        };
                    });

                    setMarketStates(prev => ({
                        ...prev,
                        [marketTarget]: {
                            ...prev[marketTarget],
                            stories: mappedStories,
                            isLoading: false
                        }
                    }));
                } else {
                    console.log(`[useTradingPlaybook] alpha_engine_playbooks empty. Fetching new data via Gemini fallback.`);
                    handleFetchTradingPlaybook();
                }
            }
        };

        fetchAndPopulate();
        // handleFetchTradingPlaybook is wrapped in useCallback with marketTarget as a dependency, so this is safe.
    }, [marketTarget, handleFetchTradingPlaybook]);

    const currentMarketState = marketStates[marketTarget];

    // FIX: Rename properties to match TradingPlaybookDashboardProps
    return {
        stories: currentMarketState.stories,
        isLoading: currentMarketState.isLoading,
        error: currentMarketState.error,
        onRefresh: handleFetchTradingPlaybook,
    };
};