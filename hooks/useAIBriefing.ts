// hooks/useAIBriefing.ts
import { useState, useCallback, useEffect } from 'react';
import type { UserIntelligenceBriefing } from '../types';
import { supabase } from '../services/supabaseClient';

const FEATURE_DISABLED_ERROR = "AI 브리핑 기능이 비활성화되었습니다. Supabase 연결을 확인해주세요.";

export const useAIBriefing = () => {
    const [briefings, setBriefings] = useState<UserIntelligenceBriefing[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchBriefings = useCallback(async () => {
        if (!supabase) {
            setError(FEATURE_DISABLED_ERROR);
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            // Call the new RPC function to get briefings
            const { data, error: rpcError } = await supabase.rpc('get_all_briefings');

            if (rpcError) {
                if (rpcError.message.includes('function get_all_briefings() does not exist')) {
                    throw new Error("데이터베이스 설정 오류: 'get_all_briefings' 함수가 없습니다. Supabase SQL Editor에서 제공된 SQL 코드를 실행해주세요.");
                }
                throw rpcError;
            }
            
            setBriefings((data as UserIntelligenceBriefing[]) || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : '브리핑 목록을 불러오지 못했습니다.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchBriefings();
    }, [fetchBriefings]);

    // FIX: Update function signature and return type to match what ManualLearningForm expects.
    const handleSubmitBriefing = async (briefingData: { title: string; content: string; related_tickers: string | null; source_url: string | null; }): Promise<{ success: boolean; error: string | null; }> => {
        if (!supabase) {
            setError(FEATURE_DISABLED_ERROR);
            return { success: false, error: FEATURE_DISABLED_ERROR };
        }
        setError(null); // Clear previous errors on new submission

        try {
            // Call the new RPC function to insert a briefing
            // FIX: Changed supabase.rpc to (supabase.rpc as any) to bypass Supabase client type inference error.
            const { data, error: rpcError } = await (supabase.rpc as any)('insert_briefing', {
                p_title: briefingData.title,
                p_content: briefingData.content,
                p_related_tickers: briefingData.related_tickers,
                p_source_url: briefingData.source_url
            });

            if (rpcError) {
                if (rpcError.message.includes('function insert_briefing(text, text, text, text) does not exist')) {
                    throw new Error("데이터베이스 설정 오류: 'insert_briefing' 함수가 없습니다. Supabase SQL Editor에서 제공된 SQL 코드를 실행해주세요.");
                }
                throw rpcError;
            }

            // FIX: Cast `data` to `any` to access its properties without a type error.
            if (data && (data as any).length > 0) {
                // The RPC returns the new row, add it to the top of the list
                setBriefings(prev => [(data as any)[0] as UserIntelligenceBriefing, ...prev]);
            }
            return { success: true, error: null };
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : '브리핑 제출에 실패했습니다.';
            setError(errorMessage);
            console.error("Briefing submission failed:", err);
            return { success: false, error: errorMessage };
        }
    };

    return {
        briefings,
        isLoading,
        error,
        fetchBriefings,
        handleSubmitBriefing,
    };
};
