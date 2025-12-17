// hooks/useMaterialRadar.ts
import { useState, useCallback, useEffect } from 'react';
import type { DetectedMaterial, MarketTarget, MaterialRadarDBRow } from '../types';
import { fetchDetectedMaterials } from '../services/gemini/materialService';
import { mockDetectedMaterials } from '../services/mockData';
import { supabase } from '../services/supabaseClient';
import { postSignal } from '../lib/postSignal';

const initialMarketState = {
    materials: null as DetectedMaterial[] | null,
    isLoading: false,
    error: null as string | null,
    dataType: 'none' as 'live' | 'sample' | 'none',
    lastScanTime: null as string | null,
};

type MaterialRadarMarketState = typeof initialMarketState;


export const useMaterialRadar = (marketTarget: MarketTarget) => {
    const [marketStates, setMarketStates] = useState<{ KR: MaterialRadarMarketState, US: MaterialRadarMarketState }>({
        KR: { ...initialMarketState },
        US: { ...initialMarketState },
    });

    useEffect(() => {
        const fetchFromDB = async () => {
            if (!supabase) return;
            const { data, error } = await supabase
                .from('material_radar_results')
                .select('*')
                .eq('market', marketTarget)
                .maybeSingle();

            if (error) {
                console.error("Error fetching material radar data:", error);
            } else if (data) {
                const typedData = data as any;

                // [STALE DATA CHECK]
                const updatedAt = new Date(typedData.updated_at).getTime();
                const now = Date.now();
                const isStale = (now - updatedAt) > (24 * 60 * 60 * 1000); // 24 hours

                if (isStale) {
                    console.log(`[Material Radar] DB data found but stale (${typedData.updated_at}). Ignoring.`);
                    setMarketStates(prev => ({
                        ...prev,
                        [marketTarget]: {
                            ...prev[marketTarget],
                            materials: [], // Clear
                            lastScanTime: typedData.updated_at,
                            dataType: 'none',
                        }
                    }));
                } else {
                    setMarketStates(prev => ({
                        ...prev,
                        [marketTarget]: {
                            ...prev[marketTarget],
                            materials: typedData.results as DetectedMaterial[],
                            lastScanTime: typedData.updated_at,
                            dataType: 'live',
                        }
                    }));
                }
            }
        };
        fetchFromDB();
    }, [marketTarget]);


    const handleScan = useCallback(async (isAutoRefresh = false) => {
        if (!isAutoRefresh) {
            setMarketStates(prev => ({ ...prev, [marketTarget]: { ...prev[marketTarget], isLoading: true, error: null } }));
        }
        try {
            const data = await fetchDetectedMaterials(marketTarget);
            const scanTime = new Date().toISOString();
            setMarketStates(prev => ({
                ...prev,
                [marketTarget]: { ...prev[marketTarget], materials: data, dataType: 'live', lastScanTime: scanTime }
            }));

            // [α-Link] Publish signals
            data.forEach(material => {
                material.relatedStocks.forEach(stock => {
                    postSignal({
                        source: 'material',
                        ticker: stock.ticker,
                        stockName: stock.stockName,
                        rationale: material.title,
                        weight: (material.reliabilityScore || 0) / 100.0, // Normalize to 0-1
                    });
                });
            });

            if (supabase) {
                await supabase.from('material_radar_results').upsert([{
                    market: marketTarget,
                    results: data,
                    updated_at: scanTime,
                }] as any);
            }
        } catch (err: any) {
            if (!isAutoRefresh) {
                setMarketStates(prev => ({ ...prev, [marketTarget]: { ...prev[marketTarget], error: err instanceof Error ? err.message : '재료 탐지 중 오류 발생', materials: null } }));
            }
        } finally {
            if (!isAutoRefresh) {
                setMarketStates(prev => ({ ...prev, [marketTarget]: { ...prev[marketTarget], isLoading: false } }));
            }
        }
    }, [marketTarget]);

    useEffect(() => {
        const AUTO_REFRESH_INTERVAL = 1 * 60 * 60 * 1000; // 1 hour
        const intervalId = setInterval(() => {
            if (document.visibilityState === 'visible') {
                console.log('[Material Radar] Triggering hourly auto-refresh...');
                handleScan(true);
            }
        }, AUTO_REFRESH_INTERVAL);

        return () => clearInterval(intervalId);
    }, [handleScan]);

    const handleLoadSample = useCallback(() => {
        setMarketStates(prev => ({ ...prev, [marketTarget]: { ...prev[marketTarget], isLoading: true, error: null, } }));
        setTimeout(() => {
            setMarketStates(prev => ({
                ...prev,
                [marketTarget]: {
                    ...prev[marketTarget],
                    isLoading: false,
                    materials: mockDetectedMaterials,
                    dataType: 'sample',
                    lastScanTime: new Date().toISOString()
                }
            }));
        }, 500);
    }, [marketTarget]);

    const currentMarketState = marketStates[marketTarget];

    return {
        detectedMaterials: currentMarketState.materials,
        isLoading: currentMarketState.isLoading,
        error: currentMarketState.error,
        dataType: currentMarketState.dataType,
        lastScanTime: currentMarketState.lastScanTime,
        handleScan,
        handleLoadSample,
    };
};