// hooks/useCoinStockScanner.ts
import { useState, useCallback, useEffect } from 'react';
import type { CoinStockSignal, MarketTarget, CoinStockScannerDBRow } from '../types';
import { scanForCoinStocks } from '../services/gemini/stockService';
import { mockCoinStockSignals } from '../services/mockData';
import { supabase } from '../services/supabaseClient';
import { postSignal } from '../lib/postSignal';

const initialMarketState = {
    signals: null as CoinStockSignal[] | null,
    isLoading: false,
    error: null as string | null,
    dataType: 'none' as 'live' | 'sample' | 'none',
};

type CoinStockScannerMarketState = typeof initialMarketState;

export const useCoinStockScanner = (marketTarget: MarketTarget) => {
    const [marketStates, setMarketStates] = useState<{ KR: CoinStockScannerMarketState, US: CoinStockScannerMarketState }>({
        KR: { ...initialMarketState },
        US: { ...initialMarketState },
    });

    useEffect(() => {
        const fetchFromDB = async () => {
            if (!supabase) return;
            const { data, error } = await supabase
                .from('coin_stock_scanner_results')
                .select('*')
                .eq('market', marketTarget)
                .maybeSingle();

            if (error) {
                 console.error("Error fetching coin stock scanner data:", error);
            } else if (data) {
                const typedData = data as any;
                setMarketStates(prev => ({ ...prev, [marketTarget]: { ...prev[marketTarget], signals: typedData.results as CoinStockSignal[], dataType: 'live' } }));
            }
        };
        fetchFromDB();
    }, [marketTarget]);

    const handleScan = useCallback(async () => {
        setMarketStates(prev => ({ ...prev, [marketTarget]: { ...prev[marketTarget], isLoading: true, error: null, dataType: 'none' } }));
        try {
            const data = await scanForCoinStocks(marketTarget);
            setMarketStates(prev => ({ ...prev, [marketTarget]: { ...prev[marketTarget], signals: data, dataType: 'live' } }));
            
            // [α-Link] Publish signals
            data.forEach(signal => {
                postSignal({
                    source: 'coin',
                    ticker: signal.ticker,
                    stockName: signal.stockName,
                    rationale: signal.detectedSignals[0]?.description || '조기 신호 포착',
                    weight: (signal.aiConfidence || 0) / 100.0, // Normalize to 0-1
                });
            });

            if (supabase) {
                await supabase.from('coin_stock_scanner_results').upsert([{
                    market: marketTarget,
                    results: data,
                    updated_at: new Date().toISOString(),
                }] as any);
            }
        } catch (err: any) {
            setMarketStates(prev => ({ ...prev, [marketTarget]: { ...prev[marketTarget], error: err instanceof Error ? err.message : '스캔 중 오류 발생', signals: null } }));
        } finally {
            setMarketStates(prev => ({ ...prev, [marketTarget]: { ...prev[marketTarget], isLoading: false } }));
        }
    }, [marketTarget]);

    const handleLoadSample = useCallback(() => {
        setMarketStates(prev => ({ ...prev, [marketTarget]: { ...prev[marketTarget], isLoading: true, error: null, dataType: 'none' } }));
        setTimeout(() => {
            setMarketStates(prev => ({
                ...prev,
                [marketTarget]: {
                    ...prev[marketTarget],
                    isLoading: false,
                    signals: mockCoinStockSignals,
                    dataType: 'sample'
                }
            }));
        }, 500);
    }, [marketTarget]);
    
    const currentMarketState = marketStates[marketTarget];

    return {
        signals: currentMarketState.signals,
        isLoading: currentMarketState.isLoading,
        error: currentMarketState.error,
        dataType: currentMarketState.dataType,
        handleScan,
        handleLoadSample,
    };
};