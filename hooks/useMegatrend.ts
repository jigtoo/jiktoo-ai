import { useState, useCallback, useEffect } from 'react';
import type { MarketTarget } from '../types';
import { analyzeMegatrends, type Megatrend } from '../services/gemini/megatrendService';
import { mapTrendToThemes, type InvestmentTheme } from '../services/gemini/themeMapperService';
import { discoverStocksByTheme, type ThemeStock } from '../services/gemini/stockDiscoveryService';
import { buildLongTermPortfolio, type LongTermPortfolio } from '../services/gemini/portfolioBuilderService';
// Trigger rebuild for portfolioBuilderService integration
import { supabase } from '../services/supabaseClient';

interface MegatrendState {
    trends: Megatrend[];
    selectedTrend: Megatrend | null;
    themes: InvestmentTheme[];
    stocks: ThemeStock[];
    portfolio: LongTermPortfolio | null;
    riskProfile: 'conservative' | 'moderate' | 'aggressive';
    isLoadingTrends: boolean;
    isLoadingThemes: boolean;
    isLoadingStocks: boolean;
    isLoadingPortfolio: boolean;
    error: string | null;
}

const initialState: MegatrendState = {
    trends: [],
    selectedTrend: null,
    themes: [],
    stocks: [],
    portfolio: null,
    riskProfile: 'moderate',
    isLoadingTrends: false,
    isLoadingThemes: false,
    isLoadingStocks: false,
    isLoadingPortfolio: false,
    error: null
};

export const useMegatrend = (marketTarget: MarketTarget) => {
    const [state, setState] = useState<MegatrendState>(initialState);

    // Load existing megatrend data from Supabase on mount
    useEffect(() => {
        const loadExistingData = async () => {
            setState(prev => ({ ...prev, isLoadingTrends: true, error: null })); // Start loading
            try {
                // Check if we have valid data in DB (younger than 72 hours)
                const threeDaysAgo = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();

                const { data: trendsData, error: trendsError } = await supabase!
                    .from('megatrend_analysis')
                    .select('*')
                    .or(`market_target.eq.${marketTarget},market_target.eq.GLOBAL`)
                    .gt('analyzed_at', threeDaysAgo) // Only fetch fresh data
                    .order('analyzed_at', { ascending: false })
                    .limit(10); // Check a few more to filter effectively

                if (!trendsError && trendsData && trendsData.length > 0) {
                    const trends: Megatrend[] = trendsData.map((t: any) => ({
                        id: t.id,
                        title: t.title,
                        summary: t.summary,
                        keyFactors: t.key_factors || [],
                        timeHorizon: t.time_horizon || '3-5년',
                        confidence: t.impact_score || 80,
                        risks: t.risks || [],
                        investmentOpportunities: t.investment_opportunities || [],
                        sources: t.sources || []
                    }));

                    // Deduplicate based on title to avoid seeing same trend twice (KR & GLOBAL)
                    const uniqueTrends = trends.filter((trend, index, self) =>
                        index === self.findIndex((t) => (
                            t.title === trend.title
                        ))
                    );

                    setState(prev => ({ ...prev, trends: uniqueTrends, isLoadingTrends: false }));
                    console.log(`[useMegatrend] Loaded ${uniqueTrends.length} fresh megatrends from DB (<24h)`);
                } else {
                    // Start auto-analysis only if no fresh data found
                    console.log('[useMegatrend] No fresh data found (<24h). Triggering auto-analysis...');
                    analyzeTrends(); // analyzeTrends will handle its own loading state
                }
            } catch (err) {
                console.error('[useMegatrend] Failed to load existing data:', err);
                setState(prev => ({ ...prev, isLoadingTrends: false, error: '데이터 로드 중 오류가 발생했습니다.' }));
            }
        };

        loadExistingData();
    }, [marketTarget]);

    // Step 1: Analyze megatrends
    const analyzeTrends = useCallback(async () => {
        console.log('[useMegatrend] analyzeTrends called');
        setState(prev => ({ ...prev, isLoadingTrends: true, error: null }));
        try {
            console.log('[useMegatrend] Calling analyzeMegatrends service...');
            const trends = await analyzeMegatrends(marketTarget);
            console.log('[useMegatrend] Analysis complete, trends:', trends);

            if (trends && trends.length > 0) {
                // Map API response to internal model
                const mappedTrends: Megatrend[] = trends.map(t => ({
                    id: `${marketTarget}_${t.trendName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}_${Date.now()}`,
                    title: t.trendName,
                    summary: t.description,
                    keyFactors: t.relatedSectors,
                    timeHorizon: '3-5 Years',
                    confidence: t.growthPotential,
                    risks: [],
                    investmentOpportunities: t.topStocks,
                    sources: []
                }));

                // Save to Supabase
                try {
                    const dbRecords = mappedTrends.map(t => ({
                        id: t.id,
                        title: t.title,
                        summary: t.summary,
                        key_factors: t.keyFactors,
                        time_horizon: t.timeHorizon,
                        impact_score: t.confidence,
                        market_target: marketTarget,
                        investment_opportunities: t.investmentOpportunities,
                        analyzed_at: new Date().toISOString()
                    }));

                    const { error: saveError } = await supabase!
                        .from('megatrend_analysis')
                        .upsert(dbRecords as any, { onConflict: 'id' });

                    if (saveError) {
                        console.error('[useMegatrend] Failed to save trends to DB:', saveError);
                    } else {
                        console.log('[useMegatrend] Successfully saved trends to DB');
                    }
                } catch (dbErr: any) {
                    // Graceful degradation: If DB save fails (e.g., 403), just log warning and proceed
                    // This allows users to see results even if they don't block history
                    console.warn('[useMegatrend] DB save skipped (likely permission/RLS issue). showing local results only.');
                }

                setState(prev => ({ ...prev, trends: mappedTrends, isLoadingTrends: false }));
            } else {
                // If empty result, assume failure but keep old data if exists
                console.warn('[useMegatrend] Received empty trends list. Keeping previous data.');
                setState(prev => ({
                    ...prev,
                    isLoadingTrends: false,
                    error: '트렌드 분석에 실패했거나 결과가 비어있습니다. 잠시 후 다시 시도해주세요.'
                }));
            }

        } catch (err: any) {
            console.error('[useMegatrend] Failed to analyze trends:', err);
            setState(prev => ({
                ...prev,
                isLoadingTrends: false,
                error: err.message || '메가트렌드 분석 중 오류가 발생했습니다.'
            }));
        }
    }, [marketTarget]);

    // Force Refresh Trend (User initiated)
    const refreshTrends = useCallback(() => {
        console.log('[useMegatrend] User forced refresh. Analyzing new trends...');
        analyzeTrends();
    }, [analyzeTrends]);

    // Step 2: Select a trend and map to themes
    const selectTrend = useCallback(async (trend: Megatrend) => {
        setState(prev => ({
            ...prev,
            selectedTrend: trend,
            isLoadingThemes: true,
            error: null,
            themes: [], // Clear previous themes
            stocks: [],  // Clear previous stocks
            portfolio: null // Clear previous portfolio
        }));
        try {
            // 2-1 Check DB Cache first to avoid wasted tokens
            const { data: cachedThemes } = await supabase!
                .from('investment_themes')
                .select('*')
                .eq('megatrend_id', trend.id);

            if (cachedThemes && cachedThemes.length > 0) {
                console.log('[useMegatrend] Cache Hit! Loaded themes from DB.');
                const themes: InvestmentTheme[] = cachedThemes.map((t: any) => ({
                    id: t.id,
                    name: t.name,
                    megatrendId: t.megatrend_id,
                    description: t.description,
                    subThemes: t.sub_themes,
                    targetMarkets: t.target_markets,
                    expectedGrowthRate: t.expected_growth_rate,
                    timeframe: t.timeframe
                }));
                setState(prev => ({ ...prev, themes, isLoadingThemes: false }));
                return;
            }

            // 2-2 If no cache, call AI
            console.log('[useMegatrend] No cache found. Calling AI for themes...');
            const themes = await mapTrendToThemes(trend);

            // Save to Supabase
            try {
                const dbRecords = themes.map(t => ({
                    id: t.id,
                    name: t.name,
                    megatrend_id: t.megatrendId,
                    description: t.description,
                    sub_themes: t.subThemes,
                    target_markets: t.targetMarkets,
                    expected_growth_rate: t.expectedGrowthRate,
                    timeframe: t.timeframe
                }));

                const { error: saveError } = await supabase!
                    .from('investment_themes')
                    .upsert(dbRecords as any, { onConflict: 'id' });

                if (saveError) {
                    console.error('[useMegatrend] Failed to save themes to DB:', saveError);
                } else {
                    console.log('[useMegatrend] Successfully saved themes to DB');
                }
            } catch (dbErr) {
                console.error('[useMegatrend] DB save error:', dbErr);
            }

            setState(prev => ({ ...prev, themes, isLoadingThemes: false }));
        } catch (err: any) {
            console.error('[useMegatrend] Failed to map themes:', err);
            setState(prev => ({
                ...prev,
                isLoadingThemes: false,
                error: err.message || '투자 테마 도출 중 오류가 발생했습니다.'
            }));
        }
    }, []);

    // Step 3: Discover stocks for all themes
    const discoverStocks = useCallback(async () => {
        if (state.themes.length === 0) {
            setState(prev => ({ ...prev, error: '먼저 투자 테마를 선택하세요.' }));
            return;
        }

        setState(prev => ({ ...prev, isLoadingStocks: true, error: null }));
        try {
            // 3-1 Check DB Cache for stocks
            // Since we need to check ALL themes, we can't easily do a single query unless we iterate or use 'in'.
            // Let's check if we have stocks for the FIRST theme as a proxy, or just query all for current themes.
            // A simple way: Query theme_stocks where theme_id matches any of our theme IDs.

            const themeIds = state.themes.map(t => t.id.replace(/\s/g, '_')); // Assuming ID format consistency
            // Actually, let's just query by the first theme to see if we have data. Ideally we should check all.
            // But simpler is: Just try to fetch stocks for these themes.

            // Construct 'or' filter for theme_name or theme_id
            // Because 'or' with many items is hard, let's try a different approach.
            // Let's just fetch ALL stocks for this marketTarget created recently? Too broad.
            // Let's iterate and check cache individually (parallel).

            const stockPromises = state.themes.map(async (theme) => {
                // Check DB
                const { data: cachedStocks } = await supabase!
                    .from('theme_stocks')
                    .select('*')
                    .eq('theme_name', theme.name)
                    .eq('market_target', marketTarget)
                    .limit(5);

                if (cachedStocks && cachedStocks.length > 0) {
                    console.log(`[useMegatrend] Cache Hit for theme: ${theme.name}`);
                    return cachedStocks.map((s: any) => ({
                        ticker: s.ticker,
                        stockName: s.stock_name,
                        theme: s.theme_name,
                        rationale: s.rationale,
                        marketCap: s.market_cap,
                        revenueExposure: parseFloat(s.revenue_exposure || '0'),
                        aiConfidence: s.ai_confidence,
                        catalysts: s.catalysts || [],
                        risks: s.risks || []
                    }));
                }

                // If not in DB, call AI
                console.log(`[useMegatrend] No cache for ${theme.name}, calling AI...`);
                const aiStocks = await discoverStocksByTheme(theme, marketTarget);

                // Save to DB (Fire and Forget)
                const dbRecords = aiStocks.map(s => ({
                    id: `${s.ticker}_${s.theme.replace(/\s/g, '_')}`,
                    ticker: s.ticker,
                    stock_name: s.stockName,
                    theme_id: s.theme.replace(/\s/g, '_'),
                    theme_name: s.theme,
                    rationale: s.rationale,
                    market_cap: s.marketCap,
                    revenue_exposure: s.revenueExposure.toString(),
                    ai_confidence: s.aiConfidence,
                    catalysts: s.catalysts,
                    risks: s.risks,
                    market_target: marketTarget,
                    created_at: new Date().toISOString()
                }));

                supabase!.from('theme_stocks').upsert(dbRecords as any, { onConflict: 'id' }).then(({ error }) => {
                    if (error) console.error('Stock save error:', error);
                });

                return aiStocks;
            });

            const stockArrays = await Promise.all(stockPromises);
            const allStocks = stockArrays.flat();

            setState(prev => ({ ...prev, stocks: allStocks, isLoadingStocks: false }));
        } catch (err: any) {
            console.error('[useMegatrend] Failed to discover stocks:', err);
            setState(prev => ({
                ...prev,
                isLoadingStocks: false,
                error: err.message || '종목 발굴 중 오류가 발생했습니다.'
            }));
        }
    }, [state.themes, marketTarget]);

    // Step 4: Build long-term portfolio
    const buildPortfolio = useCallback(async () => {
        if (!state.selectedTrend || state.themes.length === 0 || state.stocks.length === 0) {
            setState(prev => ({ ...prev, error: '먼저 트렌드, 테마, 종목을 모두 분석하세요.' }));
            return;
        }

        setState(prev => ({ ...prev, isLoadingPortfolio: true, error: null }));
        try {
            const portfolio = await buildLongTermPortfolio(
                state.selectedTrend,
                state.themes,
                state.stocks,
                state.riskProfile
            );
            setState(prev => ({ ...prev, portfolio, isLoadingPortfolio: false }));
        } catch (err: any) {
            console.error('[useMegatrend] Failed to build portfolio:', err);
            setState(prev => ({
                ...prev,
                isLoadingPortfolio: false,
                error: err.message || '포트폴리오 구성 중 오류가 발생했습니다.'
            }));
        }
    }, [state.selectedTrend, state.themes, state.stocks, state.riskProfile]);

    // Set risk profile
    const setRiskProfile = useCallback((profile: 'conservative' | 'moderate' | 'aggressive') => {
        setState(prev => ({ ...prev, riskProfile: profile, portfolio: null }));
    }, []);

    // Reset state
    const reset = useCallback(() => {
        setState(initialState);
    }, []);

    return {
        ...state,
        analyzeTrends,
        selectTrend,
        discoverStocks,
        buildPortfolio,
        setRiskProfile,
        reset,
        refreshTrends // Export new function
    };
};
