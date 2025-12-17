// hooks/useBFLScanner.ts
import { useState, useCallback, useEffect } from 'react';
import type { BFLSignal, MarketTarget, BFLScannerDBRow } from '../types';
import { scanForBFLStocks } from '../services/gemini/screenerService';
import { mockBFLSignals } from '../services/mockData';
import { supabase } from '../services/supabaseClient';
import { postSignal } from '../lib/postSignal';

const initialMarketState = {
    signals: null as BFLSignal[] | null,
    isLoading: false,
    error: null as string | null,
    dataType: 'none' as 'live' | 'sample' | 'none',
    lastScanTime: null as string | null,
};

type BFLScannerMarketState = typeof initialMarketState;

export const useBFLScanner = (marketTarget: MarketTarget) => {
    const [marketStates, setMarketStates] = useState<{ KR: BFLScannerMarketState, US: BFLScannerMarketState }>({
        KR: { ...initialMarketState },
        US: { ...initialMarketState },
    });

    useEffect(() => {
        const fetchFromDB = async () => {
            if (!supabase) return;
            const { data, error } = await supabase
                .from('bfl_scanner_results')
                .select('*')
                .eq('market', marketTarget)
                .maybeSingle();

            if (error) {
                console.error("Error fetching BFL scanner data:", error);
            } else if (data) {
                const typedData = data as any;

                // [STALE DATA CHECK]
                const updatedAt = new Date(typedData.updated_at).getTime();
                const now = Date.now();
                // If data is older than 24 hours, treat it as expired (Zombie prevention)
                const isStale = (now - updatedAt) > (24 * 60 * 60 * 1000);

                if (isStale) {
                    console.log(`[BFL Scanner] DB data found but stale (${typedData.updated_at}). Ignoring to prevent Zombies.`);
                    setMarketStates(prev => ({
                        ...prev,
                        [marketTarget]: {
                            ...prev[marketTarget],
                            signals: [], // Clear signals
                            lastScanTime: typedData.updated_at,
                            dataType: 'none', // Mark as none or stale
                        }
                    }));
                } else {
                    setMarketStates(prev => ({
                        ...prev,
                        [marketTarget]: {
                            ...prev[marketTarget],
                            signals: typedData.results as BFLSignal[],
                            lastScanTime: typedData.updated_at,
                            dataType: 'live',
                        }
                    }));
                }
            }
        };

        fetchFromDB();
        const intervalId = setInterval(fetchFromDB, 60000); // Poll every minute

        return () => clearInterval(intervalId);
    }, [marketTarget]);

    // 🔥 AUTO-SCAN: Run BFL Scanner automatically at 15:00-15:20 KST
    useEffect(() => {
        const checkAndRunAutoScan = () => {
            const now = new Date();
            const hour = now.getHours();
            const minute = now.getMinutes();

            // Close Betting Window: 15:00 ~ 15:20 KST
            const isCloseBettingTime = hour === 15 && minute >= 0 && minute <= 20;

            if (isCloseBettingTime && !marketStates[marketTarget].isLoading) {
                const lastScan = marketStates[marketTarget].lastScanTime;
                const today = new Date().toLocaleDateString('ko-KR');
                const lastScanDate = lastScan ? new Date(lastScan).toLocaleDateString('ko-KR') : null;

                // Only scan once per day
                if (lastScanDate !== today) {
                    console.log(`[BFL Scanner] 🌇 Auto-scan triggered (${hour}:${minute}) for ${marketTarget}`);
                    handleScan();
                }
            }
        };

        // Check every minute
        const autoScanInterval = setInterval(checkAndRunAutoScan, 60000);
        checkAndRunAutoScan(); // Run immediately on mount

        return () => clearInterval(autoScanInterval);
    }, [marketTarget, marketStates]); // Removed handleScan to avoid initialization error


    const handleScan = useCallback(async () => {
        console.log('[BFL Scanner] 스캔 시작 - Market:', marketTarget);
        setMarketStates(prev => ({ ...prev, [marketTarget]: { ...prev[marketTarget], isLoading: true, error: null } }));
        try {
            console.log('[BFL Scanner] Gemini API 호출 중...');
            const data = await scanForBFLStocks(marketTarget);
            console.log('[BFL Scanner] Gemini API 응답:', data);
            console.log('[BFL Scanner] 발견된 종목 수:', data?.length || 0);
            const scanTime = new Date().toISOString();
            setMarketStates(prev => ({
                ...prev,
                [marketTarget]: { ...prev[marketTarget], signals: data, dataType: 'live', lastScanTime: scanTime }
            }));

            // [α-Link] Publish signals
            data.forEach(signal => {
                postSignal({
                    source: 'bfl',
                    ticker: signal.ticker,
                    stockName: signal.stockName,
                    rationale: signal.rationale,
                    weight: (signal.aiConfidence || 0) / 100.0, // Normalize to 0-1
                });
            });

            if (supabase) {
                await supabase.from('bfl_scanner_results').upsert([{
                    market: marketTarget,
                    results: data,
                    updated_at: scanTime,
                }] as any);
            }
        } catch (err: any) {
            setMarketStates(prev => ({ ...prev, [marketTarget]: { ...prev[marketTarget], error: err instanceof Error ? err.message : '스캔 중 오류 발생', signals: null } }));
        } finally {
            setMarketStates(prev => ({ ...prev, [marketTarget]: { ...prev[marketTarget], isLoading: false } }));
        }
    }, [marketTarget]);

    const handleLoadSample = useCallback(() => {
        setMarketStates(prev => ({ ...prev, [marketTarget]: { ...prev[marketTarget], isLoading: true, error: null } }));
        setTimeout(() => {
            setMarketStates(prev => ({
                ...prev,
                [marketTarget]: {
                    ...prev[marketTarget],
                    isLoading: false,
                    signals: mockBFLSignals,
                    dataType: 'sample',
                    lastScanTime: new Date().toISOString()
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
        lastScanTime: currentMarketState.lastScanTime,
        handleScan,
        handleLoadSample,
    };
};