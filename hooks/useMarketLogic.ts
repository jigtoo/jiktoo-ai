// hooks/useMarketLogic.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import type { LogicChain, MarketTarget } from '../types';

export function useMarketLogic(marketTarget: MarketTarget) {
    const [logicChains, setLogicChains] = useState<LogicChain[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchLatestLogic = useCallback(async () => {
        if (!supabase) return;

        setIsLoading(true);
        setError(null);
        try {
            // 오늘 날짜 구하기 (UTC 기준)
            const today = new Date().toISOString().split('T')[0];

            // 오늘 날짜의 논리 사슬만 조회
            const { data, error } = await supabase
                .from('logic_chains')
                .select('*')
                .eq('market_target', marketTarget)
                .gte('created_at', `${today}T00:00:00`)
                .lte('created_at', `${today}T23:59:59`)
                .order('created_at', { ascending: false })
                .limit(5);

            if (error) throw error;

            if (data) {
                // DB 컬럼명을 CamelCase로 변환
                const formattedData: LogicChain[] = data.map(item => ({
                    id: item.id,
                    primaryKeyword: item.primary_keyword,
                    cause: item.cause,
                    effect: item.effect,
                    beneficiarySector: item.beneficiary_sector,
                    relatedTickers: item.related_tickers,
                    logicStrength: item.logic_strength,
                    alphaGap: item.alpha_gap,
                    rationale: item.rationale,
                    timestamp: item.created_at
                }));
                setLogicChains(formattedData);
            }
        } catch (err) {
            console.error('[Oracle] Failed to fetch logic chains:', err);
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setIsLoading(false);
        }
    }, [marketTarget]);

    // 마운트 시 및 marketTarget 변경 시 조회
    useEffect(() => {
        fetchLatestLogic();

        // 실시간 구독 (선택 사항)
        const channel = supabase?.channel('logic_chains_changes')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'logic_chains' },
                () => {
                    console.log('[Oracle] New logic chain detected, refreshing...');
                    fetchLatestLogic();
                }
            )
            .subscribe();

        return () => {
            if (channel) supabase?.removeChannel(channel);
        };
    }, [fetchLatestLogic]);

    return {
        logicChains,
        isLoading,
        error,
        refresh: fetchLatestLogic
    };
}
