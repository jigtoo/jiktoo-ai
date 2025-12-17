import { useState, useCallback, useEffect } from 'react';
import type { MarketTarget, ProgramFlow } from '../types';
import { scanForProgramTrading } from '../services/gemini/programTradingService';
import { supabase } from '../services/supabaseClient';

const initialMarketState = {
    programFlow: null as ProgramFlow | null,
    isLoading: false,
    error: null as string | null,
    lastScanTime: null as string | null,
};

type ProgramTradingState = typeof initialMarketState;

export const useProgramTrading = (marketTarget: MarketTarget) => {
    const [marketStates, setMarketStates] = useState<{ KR: ProgramTradingState, US: ProgramTradingState }>({
        KR: { ...initialMarketState },
        US: { ...initialMarketState },
    });

    const handleScan = useCallback(async () => {
        setMarketStates(prev => ({ ...prev, [marketTarget]: { ...prev[marketTarget], isLoading: true, error: null } }));
        try {
            const data = await scanForProgramTrading(marketTarget);
            const scanTime = new Date().toISOString();

            setMarketStates(prev => ({
                ...prev,
                [marketTarget]: {
                    ...prev[marketTarget],
                    programFlow: data,
                    lastScanTime: scanTime
                }
            }));

            // Persist to DB (Optional)
            if (supabase) {
                await supabase.from('program_trading_flows').upsert([{
                    market: marketTarget,
                    flow_data: data,
                    updated_at: scanTime
                }] as any);
            }

        } catch (err: any) {
            console.error("Program Trading Scan Error:", err);
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
