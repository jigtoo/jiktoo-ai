// hooks/useAlphaScalper.ts -> now hooks/useDayTrader.ts
import { useState, useCallback } from 'react';
import type { DayTraderSignal, MarketTarget, UserWatchlistItem } from '../types';
import { scanForDayTraderSignals } from '../services/gemini/alphaEngineService';

export const useDayTrader = (marketTarget: MarketTarget, watchlist: UserWatchlistItem[], isReadyForAnalysis: boolean) => {
    const [signals, setSignals] = useState<DayTraderSignal[] | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleScan = useCallback(async () => {
        if (!isReadyForAnalysis) {
            setError("관심종목 데이터가 아직 준비되지 않았습니다. 잠시 후 다시 시도해주세요.");
            console.warn("[DayTrader] Scan blocked because analysis is not ready.");
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const data = await scanForDayTraderSignals(marketTarget, watchlist);
            setSignals(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : '데이트레이딩 스캔 중 오류가 발생했습니다.');
            setSignals(null);
        } finally {
            setIsLoading(false);
        }
    }, [marketTarget, watchlist, isReadyForAnalysis]);

    return {
        signals,
        isLoading,
        error,
        handleScan,
    };
};