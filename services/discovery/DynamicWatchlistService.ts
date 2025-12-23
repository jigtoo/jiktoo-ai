// services/discovery/DynamicWatchlistService.ts
/**
 * AI-Driven Dynamic Watchlist Curator
 * Automatically selects best 300 stocks per market based on:
 * 1. Megatrends, 2. Volume spikes, 3. News themes, 4. Sector rotation, 5. Sniper learning
 */

import { supabase } from '../supabaseClient';
import { ai } from '../gemini/client';
import type { MarketTarget } from '../../types';

interface WatchlistStock {
    ticker: string;
    stock_name: string;
    priority: number;
    source: 'megatrend' | 'volume' | 'news' | 'sector' | 'sniper' | 'manual';
    tier: 'hot' | 'active' | 'monitor';
    rationale?: string;
    market_cap?: number;
    avg_volume?: number;
}

class DynamicWatchlistService {
    /**
     * Generate complete watchlist for a market (300 stocks)
     */
    async generateWatchlist(market: MarketTarget): Promise<WatchlistStock[]> {
        console.log(`[DynamicWatchlist] 🎯 Generating watchlist for ${market} market...`);

        const sources = await Promise.all([
            this.getMegatrendStocks(market, 60),      // Megatrend 60개
            this.getVolumeSpikeStocks(market, 60),    // 거래량 급증 60개
            this.getNewsThemeStocks(market, 60),      // 뉴스 테마 60개
            this.getSectorLeaders(market, 60),        // 섹터 리더 60개
            this.getSniperLearningStocks(market, 60)  // 스나이퍼 학습 60개
        ]);

        // Flatten and deduplicate
        const allStocks = sources.flat();
        const uniqueStocks = this.deduplicateAndRank(allStocks, 300);

        // Assign tiers
        const tiered = this.assignTiers(uniqueStocks);

        // Save to database
        await this.saveToDatabase(market, tiered);

        console.log(`[DynamicWatchlist] ✅ Generated ${tiered.length} stocks for ${market}`);
        return tiered;
    }

    /**
     * Get stocks from megatrend analysis
     */
    private async getMegatrendStocks(market: MarketTarget, limit: number): Promise<WatchlistStock[]> {
        try {
            const { data } = await supabase!
                .from('megatrend_analysis')
                .select('trends')
                .eq('market', market)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (!data || !(data as any).trends) return [];

            const trends = (data as any).trends;

            // Extract tickers from trends using AI
            const prompt = `
Extract stock tickers from these megatrends for ${market} market:
${JSON.stringify(trends)}

Return JSON array of objects with:
- ticker (string)
- stock_name (string)
- rationale (string, why it fits the trend)

Limit to ${limit} stocks.
`;

            const result = await ai!.generateContent({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: {
                    responseMimeType: 'application/json'
                }
            });

            const stocks = JSON.parse(result.response.text());
            return stocks.map((s: any, i: number) => ({
                ticker: s.ticker,
                stock_name: s.stock_name,
                priority: 100 - i,
                source: 'megatrend' as const,
                tier: 'active' as const,
                rationale: s.rationale
            }));
        } catch (err) {
            console.warn('[DynamicWatchlist] Megatrend fetch failed:', err);
            return [];
        }
    }

    /**
     * Get stocks with volume spikes (placeholder - needs KIS integration)
     */
    private async getVolumeSpikeStocks(market: MarketTarget, _limit: number): Promise<WatchlistStock[]> {
        // TODO: Integrate with KIS real-time volume data
        console.log(`[DynamicWatchlist] Volume spike detection for ${market} (placeholder)`);
        return [];
    }

    /**
     * Get stocks from news themes using AI
     */
    private async getNewsThemeStocks(market: MarketTarget, limit: number): Promise<WatchlistStock[]> {
        try {
            const marketName = market === 'KR' ? 'South Korea' : 'United States';
            const prompt = `
Search for trending stock themes in ${marketName} market today.
Find ${limit} stocks related to hot topics, breaking news, or emerging trends.

Return JSON array of objects with:
- ticker (string)
- stock_name (string)
- rationale (string, news/theme explanation)

Focus on stocks with recent catalysts or momentum.
`;

            const result = await ai!.generateContent(prompt);

            const stocks = JSON.parse(result.response.text());
            return stocks.map((s: any, i: number) => ({
                ticker: s.ticker,
                stock_name: s.stock_name,
                priority: 80 - i,
                source: 'news' as const,
                tier: 'monitor' as const,
                rationale: s.rationale
            }));
        } catch (err) {
            console.warn('[DynamicWatchlist] News theme fetch failed:', err);
            return [];
        }
    }

    /**
     * Get sector leaders (placeholder)
     */
    private async getSectorLeaders(market: MarketTarget, _limit: number): Promise<WatchlistStock[]> {
        // TODO: Implement sector rotation analysis
        console.log(`[DynamicWatchlist] Sector leader detection for ${market} (placeholder)`);
        return [];
    }

    /**
     * Get stocks from Sniper learning history
     */
    private async getSniperLearningStocks(market: MarketTarget, limit: number): Promise<WatchlistStock[]> {
        try {
            const { data } = await supabase!
                .from('sniper_learning')
                .select('ticker, pattern')
                .eq('market', market)
                .eq('success', true)
                .order('timestamp', { ascending: false })
                .limit(limit);

            if (!data || data.length === 0) return [];

            return (data as any[]).map((s, i) => ({
                ticker: s.ticker,
                stock_name: s.ticker, // Will be enriched later
                priority: 90 - i,
                source: 'sniper' as const,
                tier: 'hot' as const,
                rationale: `Successful pattern: ${s.pattern}`
            }));
        } catch (err) {
            console.warn('[DynamicWatchlist] Sniper learning fetch failed:', err);
            return [];
        }
    }

    /**
     * Deduplicate and rank stocks
     */
    private deduplicateAndRank(stocks: WatchlistStock[], limit: number): WatchlistStock[] {
        const seen = new Set<string>();
        const unique: WatchlistStock[] = [];

        // Sort by priority first
        stocks.sort((a, b) => b.priority - a.priority);

        for (const stock of stocks) {
            if (!seen.has(stock.ticker)) {
                seen.add(stock.ticker);
                unique.push(stock);
                if (unique.length >= limit) break;
            }
        }

        return unique;
    }

    /**
     * Assign tier structure (50/100/150)
     */
    private assignTiers(stocks: WatchlistStock[]): WatchlistStock[] {
        return stocks.map((s, i) => {
            if (i < 50) return { ...s, tier: 'hot' as const };
            if (i < 150) return { ...s, tier: 'active' as const };
            return { ...s, tier: 'monitor' as const };
        });
    }

    /**
     * Save to Supabase
     */
    private async saveToDatabase(market: MarketTarget, stocks: WatchlistStock[]) {
        try {
            // Clear existing watchlist for this market
            await supabase!
                .from('dynamic_watchlist')
                .delete()
                .eq('market', market);

            // Insert new watchlist
            const records = stocks.map(s => ({
                market,
                tier: s.tier,
                ticker: s.ticker,
                stock_name: s.stock_name,
                priority: s.priority,
                source: s.source,
                rationale: s.rationale,
                expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            }));

            await supabase!
                .from('dynamic_watchlist')
                .insert(records as any);

            console.log(`[DynamicWatchlist] 💾 Saved ${records.length} stocks to database`);
        } catch (err) {
            console.error('[DynamicWatchlist] Database save failed:', err);
        }
    }

    /**
     * Get current watchlist from database
     */
    async getWatchlist(market: MarketTarget, tier?: 'hot' | 'active' | 'monitor'): Promise<any[]> {
        let query = supabase!
            .from('dynamic_watchlist')
            .select('*')
            .eq('market', market)
            .gt('expires_at', new Date().toISOString())
            .order('priority', { ascending: false });

        if (tier) {
            query = query.eq('tier', tier);
        }

        const { data } = await query;
        return data || [];
    }
}

export const dynamicWatchlistService = new DynamicWatchlistService();
