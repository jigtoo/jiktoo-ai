import { useState, useCallback } from 'react';
import type { MarketTarget, SupplyEagleSignal } from '../types';
import { scanForSupplyEagle } from '../services/gemini/screenerService';

export const useSupplyEagle = (marketTarget: MarketTarget) => {
    const [results, setResults] = useState<SupplyEagleSignal[] | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const runScan = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await scanForSupplyEagle(marketTarget);
            setResults(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : '수급 독수리 스캔 중 오류가 발생했습니다.');
            setResults(null);
        } finally {
            setIsLoading(false);
        }
    }, [marketTarget]);

    return {
        results,
        isLoading,
        error,
        runScan,
    };
};
