import { useState, useCallback, useEffect } from 'react';
import type { MarketTarget } from '../types';
import { analyzeMegatrends, type Megatrend } from '../services/gemini/megatrendService';
import { mapTrendToThemes, type InvestmentTheme } from '../services/gemini/themeMapperService';
import { discoverStocksByTheme, type ThemeStock } from '../services/gemini/stockDiscoveryService';
import { buildLongTermPortfolio, type LongTermPortfolio } from '../services/gemini/portfolioBuilderService';
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
            try {
                // Load latest megatrends for this market
                const { data: trendsData, error: trendsError } = await supabase
                    .from('megatrend_analysis')
                    .select('*')
                    .eq('market_target', marketTarget)
                    .order('analyzed_at', { ascending: false })
                    .limit(5);

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
                    setState(prev => ({ ...prev, trends }));
                    console.log(`[useMegatrend] Loaded ${trends.length} existing megatrends from DB`);
                }
            } catch (err) {
                console.error('[useMegatrend] Failed to load existing data:', err);
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

                    const { error: saveError } = await supabase
                        .from('megatrend_analysis')
                        .upsert(dbRecords, { onConflict: 'id' });

                    if (saveError) {
                        console.error('[useMegatrend] Failed to save trends to DB:', saveError);
                    } else {
                        console.log('[useMegatrend] Successfully saved trends to DB');
                    }
                } catch (dbErr) {
                    console.error('[useMegatrend] DB save error:', dbErr);
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

                const { error: saveError } = await supabase
                    .from('investment_themes')
                    .upsert(dbRecords, { onConflict: 'id' });

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
            const stockPromises = state.themes.map(theme =>
                discoverStocksByTheme(theme, marketTarget)
            );
            const stockArrays = await Promise.all(stockPromises);
            const allStocks = stockArrays.flat();

            // Save to Supabase
            try {
                const dbRecords = allStocks.map(s => ({
                    id: `${s.ticker}_${s.theme.replace(/\s/g, '_')}`,
                    ticker: s.ticker,
                    stock_name: s.stockName,
                    theme_id: s.theme.replace(/\s/g, '_'), // Generate ID from theme name
                    theme_name: s.theme,
                    rationale: s.rationale,
                    market_cap: s.marketCap,
                    revenue_exposure: s.revenueExposure.toString(),
                    ai_confidence: s.aiConfidence,
                    catalysts: s.catalysts,
                    risks: s.risks,
                    market_target: marketTarget
                }));

                const { error: saveError } = await supabase
                    .from('theme_stocks')
                    .upsert(dbRecords, { onConflict: 'id' });

                if (saveError) {
                    console.error('[useMegatrend] Failed to save stocks to DB:', saveError);
                } else {
                    console.log('[useMegatrend] Successfully saved stocks to DB');
                }
            } catch (dbErr) {
                console.error('[useMegatrend] DB save error:', dbErr);
            }

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
        reset
    };
};
