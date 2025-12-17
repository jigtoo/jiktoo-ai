import { useState, useCallback, useEffect } from 'react';
import type { MarketTarget, LateSurgeSignal, ShakeoutSignal, DistributionSignal } from '../types';
import { scanForLateSurge, scanForShakeout, scanForDistribution } from '../services/gemini/screenerService';
import { supabase } from '../services/supabaseClient';
import { postSignal } from '../lib/postSignal';

const initialMarketState = {
    lateSurgeSignals: null as LateSurgeSignal[] | null,
    shakeoutSignals: null as ShakeoutSignal[] | null,
    distributionSignals: null as DistributionSignal[] | null,
    isLoading: false,
    error: null as string | null,
    lastScanTime: null as string | null,
};

type SmartMoneyMarketState = typeof initialMarketState;

export const useSmartMoneyCycle = (marketTarget: MarketTarget) => {
    const [marketStates, setMarketStates] = useState<{ KR: SmartMoneyMarketState, US: SmartMoneyMarketState }>({
        KR: { ...initialMarketState },
        US: { ...initialMarketState },
    });

    // Load from DB on mount (Optional: Implement persistence later if needed)
    // For now, we start fresh or rely on manual/auto scans.

    const handleScan = useCallback(async () => {
        setMarketStates(prev => ({ ...prev, [marketTarget]: { ...prev[marketTarget], isLoading: true, error: null } }));
        try {
            // Run scans in parallel
            const [lateSurge, shakeout, distribution] = await Promise.all([
                scanForLateSurge(marketTarget),
                scanForShakeout(marketTarget),
                scanForDistribution(marketTarget)
            ]);

            const scanTime = new Date().toISOString();

            setMarketStates(prev => ({
                ...prev,
                [marketTarget]: {
                    ...prev[marketTarget],
                    lateSurgeSignals: lateSurge,
                    shakeoutSignals: shakeout,
                    distributionSignals: distribution,
                    lastScanTime: scanTime
                }
            }));

            // [α-Link] Publish signals
            lateSurge.forEach(s => postSignal({ source: 'smart_money_surge', ticker: s.ticker, stockName: s.stockName, rationale: s.rationale, weight: s.aiConfidence / 100 }));
            shakeout.forEach(s => postSignal({ source: 'smart_money_shakeout', ticker: s.ticker, stockName: s.stockName, rationale: s.rationale, weight: s.aiConfidence / 100 }));
            distribution.forEach(s => postSignal({ source: 'smart_money_distribution', ticker: s.ticker, stockName: s.stockName, rationale: s.rationale, weight: s.aiConfidence / 100 }));

            // Persist to DB (Optional)
            if (supabase) {
                await supabase.from('smart_money_signals').upsert([{
                    market: marketTarget,
                    late_surge: lateSurge,
                    shakeout: shakeout,
                    distribution: distribution,
                    updated_at: scanTime
                }] as any);
            }

        } catch (err: any) {
            console.error("Smart Money Scan Error:", err);
            setMarketStates(prev => ({ ...prev, [marketTarget]: { ...prev[marketTarget], error: err.message || '스캔 중 오류 발생' } }));
        } finally {
            setMarketStates(prev => ({ ...prev, [marketTarget]: { ...prev[marketTarget], isLoading: false } }));
        }
    }, [marketTarget]);

    const currentMarketState = marketStates[marketTarget];

    return {
        ...currentMarketState,
        handleScan
    };
};
