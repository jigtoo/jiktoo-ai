// hooks/useUserWatchlist.ts
import { useState, useCallback, useEffect } from 'react';
import type { UserWatchlistItem, MarketTarget } from '../types';
import { supabase } from '../services/supabaseClient';
import { findStock } from '../services/gemini/stockService';
import { postSignal } from '../lib/postSignal';

const FEATURE_DISABLED_ERROR = "관심종목 기능이 비활성화되었습니다. Supabase 연결을 확인해주세요.";

export const useUserWatchlist = (marketTarget: MarketTarget) => {
    const [watchlistItems, setWatchlistItems] = useState<UserWatchlistItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const updateWatchlistInDB = useCallback(async (items: UserWatchlistItem[], target: MarketTarget) => {
        if (!supabase) {
            setError(FEATURE_DISABLED_ERROR);
            return;
        };
        try {
            // The RPC function uses auth.uid() on the backend, so we just need to ensure a session exists.
            const { data: { session } } = await (supabase.auth as any).getSession();
            if (!session) throw new Error("로그인이 필요합니다.");

            // FIX: Cast RPC call to 'any' to resolve 'never' type error.
            const { error } = await (supabase.rpc as any)('rpc_upsert_user_watchlist', {
                p_market: target,
                p_items: items,
            });

            if (error) {
                // Provide a more helpful error message if the function is missing.
                if (error.message.includes('function public.rpc_upsert_user_watchlist(p_market => text, p_items => jsonb) does not exist')) {
                    throw new Error("데이터베이스 설정 오류: 'rpc_upsert_user_watchlist' 함수가 없습니다. README의 SQL 스크립트를 실행하여 데이터베이스를 업데이트하세요.");
                }
                throw error;
            }
        } catch (dbError) {
            const message = dbError instanceof Error ? dbError.message : '관심종목 저장에 실패했습니다.';
            setError(message);
        }
    }, []);

    const fetchWatchlist = useCallback(async () => {
        if (!supabase) {
            setError(FEATURE_DISABLED_ERROR);
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            // RPC function relies on backend session
            // FIX: Cast RPC call to 'any' to resolve 'never' type error.
            const { data, error } = await (supabase.rpc as any)('rpc_get_user_watchlist', {
                p_market: marketTarget,
            });

            if (error) {
                if (error.message.includes('function public.rpc_get_user_watchlist(p_market => text) does not exist')) {
                    throw new Error("데이터베이스 설정 오류: 'rpc_get_user_watchlist' 함수가 없습니다. README의 SQL 스크립트를 실행하여 데이터베이스를 업데이트하세요.");
                }
                throw error;
            }

            // RPC returns an array of rows. We expect 0 or 1.
            if (data && data.length > 0) {
                setWatchlistItems((data[0] as any).items as UserWatchlistItem[] || []);
            } else {
                setWatchlistItems([]);
            }

        } catch (err) {
            setError(err instanceof Error ? err.message : '관심종목을 불러오지 못했습니다.');
        } finally {
            setIsLoading(false);
        }
    }, [marketTarget]);

    useEffect(() => {
        fetchWatchlist();
    }, [fetchWatchlist]);

    const addStockToWatchlist = async (query: string): Promise<{ success: boolean; message?: string }> => {
        try {
            // Add timeout to prevent infinite loading
            const timeoutPromise = new Promise<never>((_, reject) => {
                setTimeout(() => reject(new Error('종목 검색 시간 초과 (30초). 다시 시도해주세요.')), 30000);
            });

            const stock = await Promise.race([
                findStock(query, marketTarget),
                timeoutPromise
            ]);

            if (stock.market !== marketTarget) {
                return { success: false, message: `선택된 시장(${marketTarget})과 다른 종목입니다.` };
            }
            if (watchlistItems.some(item => item.ticker === stock.ticker)) {
                return { success: false, message: '이미 추가된 종목입니다.' };
            }

            // [α-Link Phase 2] Publish user signal
            postSignal({
                source: 'user',
                ticker: stock.ticker,
                stockName: stock.stockName,
                rationale: '관심종목 추가',
                weight: 0.9, // High weight for direct user action
            });

            const newItem = { ticker: stock.ticker, stockName: stock.stockName };
            const newItems = [...watchlistItems, newItem];
            setWatchlistItems(newItems); // Optimistic update
            await updateWatchlistInDB(newItems, marketTarget);
            return { success: true };
        } catch (err) {
            console.error('[UserWatchlist] addStockToWatchlist error:', err);
            const errorMessage = err instanceof Error ? err.message : '종목을 추가하지 못했습니다.';
            return { success: false, message: errorMessage };
        }
    };

    const removeStockFromWatchlist = async (ticker: string) => {
        const newItems = watchlistItems.filter(item => item.ticker !== ticker);
        setWatchlistItems(newItems); // Optimistic update
        await updateWatchlistInDB(newItems, marketTarget);
    };

    return {
        watchlistItems,
        isLoading,
        error,
        addStock: addStockToWatchlist,
        removeStock: removeStockFromWatchlist,
    };
};
