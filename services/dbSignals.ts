// services/dbSignals.ts
import { supabase } from './supabaseClient';
import type { DashboardSignal, MarketTarget } from '../types';

export const fetchRecentSignals = async (market: MarketTarget): Promise<DashboardSignal[]> => {
    if (!supabase) return [];
    try {
        const { data, error } = await supabase
            .from('ai_trade_journals')
            .select('*')
            .eq('market', market)
            .order('created_at', { ascending: false })
            .limit(10);

        if (error || !data) return [];

        return data.map((item: any) => ({
            id: item.id,
            ticker: item.ticker,
            stockName: item.stock_name,
            signal: item.action,
            confidence: item.confidence,
            message: item.reason,
            timestamp: item.created_at
        }));
    } catch (e) {
        console.error("Failed to fetch signals:", e);
        return [];
    }
};

export const fetchDashboardStock = async (ticker: string) => {
    if (!supabase) return null;
    try {
        // Try to find recent analysis or signal for this stock
        const { data, error } = await supabase
            .from('ai_trade_journals')
            .select('*')
            .eq('ticker', ticker)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error || !data) return null;

        return {
            market: data.market,
            rationale: data.reason,
            pivotPoint: null // Placeholder as strictly mapping db schema to UI types can be complex without full schema
        };
    } catch (e) {
        return null;
    }
};

export const fetchMarketHealthLatest = async () => {
    if (!supabase) return null;
    try {
        // Attempt to get latest market summary timestamp
        const { data, error } = await supabase
            .from('market_briefings') // Assuming table name
            .select('created_at')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error || !data) return null;

        return {
            freshness_ts: data.created_at
        };
    } catch (e) {
        return null;
    }
};