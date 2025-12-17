
import { useState } from 'react';
import type { MarketTarget, DashboardStock } from '../types';
import { runValuePivotScan, runPowerPlayScan, runTurnaroundScan } from '../services/ScannerTools';
import { scanForGenomeMomentum } from '../services/gemini/screenerService';

export const useAIQuantScreener = (marketTarget: MarketTarget) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [results, setResults] = useState<any[]>([]);
    const [activeRecipe, setActiveRecipe] = useState<string | null>(null);

    // Helper to map results
    const mapToDashboard = (rawResults: any[], market: MarketTarget) => {
        return rawResults.map((r: any) => ({
            ticker: r.ticker,
            stockName: r.stockName,
            referencePrice: typeof r.price === 'string' ? r.price : r.price?.toLocaleString(),
            rationale: r.technicalSignal || r.rationale || r.matchedPattern,
            market: market === 'KR' ? 'KOSPI' : 'NASDAQ',
            aiScore: r.aiConfidence || 80,
            priceTimestamp: 'Just now',
            tradingStatus: 'Active'
        }));
    };

    const handleScan = async (type: 'value' | 'power' | 'turnaround' | 'genome' | 'all') => {
        setIsLoading(true);
        setError(null);
        setActiveRecipe(type);
        setResults([]);

        try {
            let scanResults: any[] = [];

            if (type === 'all') {
                // Sequential Execution for 'Run All' with Deduplication
                const updateResultsUnique = (newItems: any[]) => {
                    setResults(prev => {
                        const existingTickers = new Set(prev.map(p => p.ticker));
                        const uniqueNew = newItems.filter(item => !existingTickers.has(item.ticker));
                        return [...prev, ...uniqueNew];
                    });
                };

                try {
                    console.log('Running Value Pivot...');
                    const valueResults = await runValuePivotScan(marketTarget);
                    scanResults = [...scanResults, ...valueResults];
                    updateResultsUnique(mapToDashboard(valueResults, marketTarget));

                    console.log('Running Power Play...');
                    const powerResults = await runPowerPlayScan(marketTarget);
                    scanResults = [...scanResults, ...powerResults];
                    updateResultsUnique(mapToDashboard(powerResults, marketTarget));

                    console.log('Running Turnaround...');
                    const turnResults = await runTurnaroundScan(marketTarget);
                    scanResults = [...scanResults, ...turnResults];
                    updateResultsUnique(mapToDashboard(turnResults, marketTarget));

                    console.log('Running Genome Hunter...');
                    const genomeSignals = await scanForGenomeMomentum(marketTarget);
                    const genomeResults = genomeSignals.map(s => ({
                        ticker: s.ticker, stockName: s.stockName, price: s.currentPrice,
                        rationale: `[Genome] ${s.matchedPattern}`, aiConfidence: s.aiConfidence
                    }));
                    scanResults = [...scanResults, ...genomeResults];
                    updateResultsUnique(mapToDashboard(genomeResults, marketTarget));

                } catch (e) {
                    console.error('Sequential scan error:', e);
                    // Continue even if one fails
                }
                setIsLoading(false); // Done
                return; // Return early as we handled UI update incrementally
            }

            if (type === 'value') {
                scanResults = await runValuePivotScan(marketTarget);
            } else if (type === 'power') {
                scanResults = await runPowerPlayScan(marketTarget);
            } else if (type === 'turnaround') {
                scanResults = await runTurnaroundScan(marketTarget);
            } else if (type === 'genome') {
                const signals = await scanForGenomeMomentum(marketTarget);
                // Map GenomeSignal to generic structure
                scanResults = signals.map(s => ({
                    ticker: s.ticker,
                    stockName: s.stockName,
                    price: s.currentPrice,
                    rationale: s.matchedPattern,
                    aiConfidence: s.aiConfidence
                }));
            }

            const mappedResults = mapToDashboard(scanResults, marketTarget);
            setResults(mappedResults);

        } catch (err) {
            setError('스캔 중 오류가 발생했습니다. 다시 시도해주세요.');
            console.error(err);
        } finally {
            if (type !== 'all') setIsLoading(false);
        }
    };

    return {
        results,
        isLoading,
        error,
        handleScan,
        activeRecipe
    };
};
