
// hooks/useMemoir.ts
import { useState, useCallback, useEffect } from 'react';
// FIX: Corrected casing for JIKTOOMemoirEntry type import
import type { JIKTOOMemoirEntry, MarketTarget } from '../types';
import { supabase } from '../services/supabaseClient';

const FEATURE_DISABLED_ERROR = "회고록 기능이 비활성화되었습니다. Supabase 연결을 확인해주세요.";

export const useMemoir = (marketTarget: MarketTarget) => {
    const [memoirEntries, setMemoirEntries] = useState<JIKTOOMemoirEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchMemoir = useCallback(async () => {
        if (!supabase) {
            setError(FEATURE_DISABLED_ERROR);
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const { data, error } = await supabase
                .from('jiktoo_memoir')
                .select('*')
                .eq('market', marketTarget)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setMemoirEntries(data as JIKTOOMemoirEntry[]);
        } catch (err) {
            setError(err instanceof Error ? err.message : '회고록을 불러오지 못했습니다.');
        } finally {
            setIsLoading(false);
        }
    }, [marketTarget]);

    useEffect(() => {
        fetchMemoir();
    }, [fetchMemoir]);

    return {
        memoirEntries,
        isLoading,
        error,
        fetchMemoir,
    };
};
