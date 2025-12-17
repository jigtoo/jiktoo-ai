// hooks/useMorningBriefing.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { morningBriefingScheduler } from '../services/schedulers/MorningBriefingScheduler';
import type { MarketTarget, JIKTOOPicksItem } from '../types';

type MorningBriefingData = {
    title: string;
    summary: string;
    keyPoints: string[];
};

export const useMorningBriefing = (
    marketTarget: MarketTarget,
    marketHealth: any,
    jiktooSignals: JIKTOOPicksItem[] | null
) => {
    const [briefing, setBriefing] = useState<MorningBriefingData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchBriefing = useCallback(async () => {
        try {
            const today = new Date().toISOString().split('T')[0];
            const { data, error } = await supabase
                .from('morning_briefings')
                .select('*')
                .eq('market_target', marketTarget)
                .eq('date', today)
                .maybeSingle();

            if (error) throw error;

            if (data) {
                setBriefing({
                    title: data.title,
                    summary: data.summary,
                    keyPoints: data.key_points
                });
            } else {
                setBriefing(null);
            }
        } catch (err) {
            console.error('Failed to fetch morning briefing:', err);
            // Don't set error state here to avoid UI clutter, just log it
        }
    }, [marketTarget]);

    // Initial fetch
    useEffect(() => {
        fetchBriefing();
    }, [fetchBriefing]);

    const generateBriefing = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const today = new Date().toISOString().split('T')[0];
            await morningBriefingScheduler.runBriefing(marketTarget, today);
            await fetchBriefing(); // Refresh after generation
        } catch (err: any) {
            console.error('Failed to generate briefing:', err);
            setError(err.message || "브리핑 생성 중 오류가 발생했습니다.");
        } finally {
            setIsLoading(false);
        }
    }, [marketTarget, fetchBriefing]);

    return {
        briefing,
        isLoading,
        error,
        generateBriefing
    };
};