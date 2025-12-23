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
            // Direct query instead of RPC (fallback)
            const { data, error: queryError } = await supabase
                .from('user_intelligence_briefings')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(100);

            if (queryError) {
                throw queryError;
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
        setError(null);

        const submitWithRetry = async (retries = 2, backoff = 2000): Promise<any> => {
            try {
                // Extended timeout to 30s for critical data submission
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('제출 요청 시간 초과 (30초)')), 30000)
                );

                const insertPromise = (async () => {
                    const { data, error: insertError } = await (supabase!
                        .from('user_intelligence_briefings') as any)
                        .insert({
                            title: briefingData.title,
                            content: briefingData.content,
                            related_tickers: briefingData.related_tickers,
                            source_url: briefingData.source_url
                        })
                        .select()
                        .single();

                    if (insertError) throw insertError;
                    return data;
                })();

                return await Promise.race([insertPromise, timeoutPromise]);
            } catch (err) {
                if (retries > 0) {
                    console.log(`[Briefing] Submission failed. Retrying in ${backoff}ms... (${retries} left)`);
                    await new Promise(res => setTimeout(res, backoff));
                    return submitWithRetry(retries - 1, backoff * 2);
                }
                throw err;
            }
        };

        try {
            const data = await submitWithRetry();
            if (data) {
                setBriefings(prev => [data as UserIntelligenceBriefing, ...prev]);
            }
            return { success: true, error: null };
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : '브리핑 제출에 최종 실패했습니다. (재시도 포함)';
            setError(errorMessage);
            console.error("Briefing submission finally failed:", err);
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
