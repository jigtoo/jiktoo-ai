// hooks/usePortfolio.ts
import { useState, useCallback, useEffect } from 'react';
import type { PortfolioItem, PortfolioItemAnalysis, PortfolioOverviewAnalysis, MarketTarget, PortfolioImmunityAnalysis } from '../types';
import { fetchPortfolioAnalysis, fetchPortfolioOverview, generateAIBriefing, generatePortfolioImmunityAnalysis } from '../services/gemini/portfolioService';
import { supabase } from '../services/supabaseClient';


const initialMarketState = (market: MarketTarget) => ({
    portfolioItems: [] as PortfolioItem[],
    portfolioCash: market === 'KR' ? 10000000 : 100000,
    analysis: [] as PortfolioItemAnalysis[],
    overview: null as PortfolioOverviewAnalysis | null,
    isAnalysisLoading: false,
    isOverviewLoading: false,
    error: null as string | null,
    hasNewAlert: false,
    isBriefingLoading: false,
    briefingError: null as string | null,
    portfolioId: null as string | null, // Add portfolioId to state
    immunityAnalysis: null as PortfolioImmunityAnalysis | null,
    isImmunityAnalysisLoading: false,
});

type PortfolioMarketState = ReturnType<typeof initialMarketState>;

export const usePortfolio = (marketTarget: MarketTarget) => {
    const [marketStates, setMarketStates] = useState<{ KR: PortfolioMarketState; US: PortfolioMarketState }>({
        KR: initialMarketState('KR'),
        US: initialMarketState('US'),
    });
    const [isBriefingModalOpen, setIsBriefingModalOpen] = useState(false);
    const [viewingBriefingItem, setViewingBriefingItem] = useState<PortfolioItem | null>(null);

    const handleFetchPortfolioAnalysis = useCallback(async (currentPortfolio: PortfolioItem[], currentCash: number, target: MarketTarget) => {
        setMarketStates(prev => ({
            ...prev,
            [target]: { ...prev[target], isAnalysisLoading: true, isOverviewLoading: true, error: null, overview: null, immunityAnalysis: null }
        }));

        if (currentPortfolio.length === 0) {
            setMarketStates(prev => ({
                ...prev,
                [target]: {
                    ...prev[target],
                    analysis: [],
                    overview: {
                        healthScore: 100,
                        summary: "보유 종목이 없습니다. '탐색' 탭에서 새로운 투자 기회를 찾아보세요!",
                        composition: [{ name: '현금', value: currentCash, percentage: 100 }]
                    },
                    isAnalysisLoading: false,
                    isOverviewLoading: false,
                }
            }));
            return;
        }

        try {
            const analysisResult = await fetchPortfolioAnalysis(currentPortfolio, target);
            setMarketStates(prev => ({ ...prev, [target]: { ...prev[target], analysis: analysisResult, isAnalysisLoading: false } }));

            if (analysisResult.some(a => a.aiAlert && (a.aiAlert.type === 'critical' || a.aiAlert.type === 'warning'))) {
                setMarketStates(prev => ({ ...prev, [target]: { ...prev[target], hasNewAlert: true } }));
            }

            try {
                const overviewResult = await fetchPortfolioOverview(currentPortfolio, analysisResult, currentCash, target);
                setMarketStates(prev => ({ ...prev, [target]: { ...prev[target], overview: overviewResult } }));
            } catch (overviewErr) {
                console.error("Failed to fetch portfolio overview:", overviewErr);
            } finally {
                setMarketStates(prev => ({ ...prev, [target]: { ...prev[target], isOverviewLoading: false } }));
            }

            try {
                setMarketStates(prev => ({ ...prev, [target]: { ...prev[target], isImmunityAnalysisLoading: true } }));
                const immunityResult = await generatePortfolioImmunityAnalysis(currentPortfolio, analysisResult, target);
                setMarketStates(prev => ({ ...prev, [target]: { ...prev[target], immunityAnalysis: immunityResult } }));
            } catch (immunityErr) {
                console.error("Failed to generate portfolio immunity analysis:", immunityErr);
            } finally {
                setMarketStates(prev => ({ ...prev, [target]: { ...prev[target], isImmunityAnalysisLoading: false } }));
            }


        } catch (err: any) {
            setMarketStates(prev => ({
                ...prev,
                [target]: {
                    ...prev[target],
                    error: err instanceof Error ? err.message : '알 수 없는 오류',
                    isAnalysisLoading: false,
                    isOverviewLoading: false
                }
            }));
        }
    }, []);

    // FIX: Add onRefresh function for the PortfolioDashboard component.
    const onRefresh = useCallback(() => {
        const currentMarketState = marketStates[marketTarget];
        handleFetchPortfolioAnalysis(currentMarketState.portfolioItems, currentMarketState.portfolioCash, marketTarget);
    }, [marketStates, marketTarget, handleFetchPortfolioAnalysis]);

    useEffect(() => {
        const fetchPortfolioFromDB = async () => {
            if (!supabase) {
                console.warn("Supabase not available, portfolio will not be persisted.");
                handleFetchPortfolioAnalysis(initialMarketState(marketTarget).portfolioItems, initialMarketState(marketTarget).portfolioCash, marketTarget);
                return;
            }

            setMarketStates(prev => ({ ...prev, [marketTarget]: { ...prev[marketTarget], isAnalysisLoading: true, isOverviewLoading: true, error: null } }));

            try {
                // FIX: Cast supabase.auth to `any` to bypass TypeScript type errors for getSession.
                // This is a workaround for a likely environment-specific type definition issue.
                const { data: { session }, error: sessionError } = await (supabase.auth as any).getSession();

                if (sessionError) throw new Error(`Authentication error: ${sessionError.message}`);

                if (!session) {
                    // This might happen on first load before anonymous sign-in completes.
                    // We will wait for a session. If it times out, we show an error.
                    console.log("No session found, waiting for auth...");
                    // FIX: Cast supabase.auth to `any` to bypass TypeScript type errors for onAuthStateChange.
                    await new Promise((resolve, reject) => {
                        const { data: { subscription } } = (supabase.auth as any).onAuthStateChange((event: any, session: any) => {
                            if (session) {
                                subscription.unsubscribe();
                                resolve(session);
                            }
                        });
                        setTimeout(() => {
                            subscription.unsubscribe();
                            reject(new Error("Authentication timed out."));
                        }, 5000);
                    });
                }

                // Direct table query instead of RPC
                const { data: rows, error: queryError } = await supabase
                    .from('portfolios')
                    .select('*')
                    .eq('owner', 'me');

                if (queryError) {
                    throw new Error(`[portfolio:load] ${queryError.message}`);
                }

                const portfolioRow = rows?.find((r: any) => r.meta?.market === marketTarget);
                const portfolioData = portfolioRow ? (portfolioRow as any).positions as { items?: PortfolioItem[]; cash?: number } : null;

                if (portfolioRow && portfolioData && Array.isArray(portfolioData.items)) {
                    const items = portfolioData.items;
                    const cash = typeof portfolioData.cash === 'number' ? portfolioData.cash : (marketTarget === 'KR' ? 10000000 : 100000);
                    // FIX: Use non-null assertion on portfolioRow as its existence is guaranteed by the `if` condition.
                    setMarketStates(prev => ({ ...prev, [marketTarget]: { ...prev[marketTarget], portfolioItems: items.map(i => ({ ...i, executionStatus: 'idle' })), portfolioCash: cash, portfolioId: (portfolioRow as any)?.id } }));
                    handleFetchPortfolioAnalysis(items, cash, marketTarget);
                } else {
                    const initialState = initialMarketState(marketTarget);
                    setMarketStates(prev => ({ ...prev, [marketTarget]: { ...initialState } }));
                    handleFetchPortfolioAnalysis(initialState.portfolioItems, initialState.portfolioCash, marketTarget);
                }
            } catch (err: any) {
                console.error("Error fetching portfolio from DB:", err);
                const errorMessage = err instanceof Error ? err.message : '데이터베이스에서 포트폴리오를 가져오는 중 오류가 발생했습니다.';
                setMarketStates(prev => ({ ...prev, [marketTarget]: { ...initialMarketState(marketTarget), error: errorMessage, isAnalysisLoading: false, isOverviewLoading: false } }));
            }
        };

        fetchPortfolioFromDB();
    }, [marketTarget, handleFetchPortfolioAnalysis]);


    const savePortfolioToDB = useCallback(async (newItems: PortfolioItem[], newCash: number, target: MarketTarget) => {
        // This function now only handles the DB interaction
        if (!supabase) {
            console.warn("Supabase not available, portfolio changes not persisted.");
            return;
        }

        try {
            const { data: { session } } = await (supabase.auth as any).getSession();
            if (!session) throw new Error("User not logged in. Cannot save portfolio.");

            // Direct upsert instead of RPC
            const { data: existing } = await (supabase as any)
                .from('portfolios')
                .select('id')
                .eq('owner', 'me')
                .eq('meta->>market', target)
                .single();

            let newId: string | null = null;

            if (existing) {
                // Update existing
                const { data, error: updateError } = await (supabase as any)
                    .from('portfolios')
                    .update({
                        positions: { items: newItems, cash: newCash },
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', (existing as any).id)
                    .select('id')
                    .single();

                if (updateError) throw new Error(`[portfolio:save] ${updateError.message}`);
                newId = (data as any)?.id || null;
            } else {
                // Insert new  
                const { data, error: insertError } = await (supabase as any)
                    .from('portfolios')
                    .insert({
                        owner: 'me',
                        positions: { items: newItems, cash: newCash },
                        meta: { market: target }
                    })
                    .select('id')
                    .single();

                if (insertError) throw new Error(`[portfolio:save] ${insertError.message}`);
                newId = (data as any)?.id || null;
            }

            setMarketStates(prev => ({ ...prev, [target]: { ...prev[target], portfolioId: newId as string | null } }));
        } catch (dbError: any) {
            console.error("Failed to save portfolio to DB:", dbError);
            setMarketStates(prev => ({ ...prev, [target]: { ...prev[target], error: "DB 저장 실패: " + dbError.message } }));
        }
    }, []);

    const handleSavePosition = (item: PortfolioItem) => {
        // This function now handles the "Optimal Execution" simulation.
        const currentPortfolio = marketStates[marketTarget].portfolioItems;
        const currentCash = marketStates[marketTarget].portfolioCash;

        // 1. Create a temporary item with 'executing' status
        const tempItem: PortfolioItem = { ...item, executionStatus: 'executing' };

        let tempItems = [...currentPortfolio];
        const index = tempItems.findIndex(i => i.id === tempItem.id);

        if (index > -1) {
            tempItems[index] = { ...tempItem, aiBriefing: tempItems[index].aiBriefing, autopilotStatus: tempItems[index].autopilotStatus || 'monitoring' };
        } else {
            tempItems.unshift({ ...tempItem, autopilotStatus: 'monitoring' });
        }

        // 2. Optimistically update the UI to show the 'executing' state
        setMarketStates(prev => ({
            ...prev,
            [marketTarget]: { ...prev[marketTarget], portfolioItems: tempItems }
        }));

        // 3. Simulate the execution delay
        setTimeout(() => {
            // 4. Calculate final executed price with simulated slippage (+/- 0.5%)
            const slippageFactor = 1 + (Math.random() - 0.4) * 0.01; // -0.4% to +0.6%
            const executedPrice = item.entryPrice * slippageFactor;

            const finalItem: PortfolioItem = { ...item, entryPrice: executedPrice, executionStatus: 'idle' };

            // 5. Calculate final cash and portfolio state
            let newItems = [...currentPortfolio];
            const finalIndex = newItems.findIndex(i => i.id === finalItem.id);
            let cashAfterTransaction = currentCash;
            const newItemCost = finalItem.entryPrice * finalItem.quantity;

            if (finalIndex > -1) {
                const originalItemCost = newItems[finalIndex].entryPrice * newItems[finalIndex].quantity;
                cashAfterTransaction = currentCash + originalItemCost - newItemCost;
                newItems[finalIndex] = { ...finalItem, aiBriefing: newItems[finalIndex].aiBriefing, autopilotStatus: newItems[finalIndex].autopilotStatus || 'monitoring' };
            } else {
                cashAfterTransaction = currentCash - newItemCost;
                newItems.unshift({ ...finalItem, autopilotStatus: 'monitoring' });
            }

            if (cashAfterTransaction < 0) {
                // If the final price makes the transaction invalid, revert the change
                alert("최종 체결가 기준, 보유 현금을 초과하여 포지션을 저장할 수 없습니다.");
                setMarketStates(prev => ({
                    ...prev,
                    [marketTarget]: { ...prev[marketTarget], portfolioItems: currentPortfolio } // Revert to original
                }));
                return;
            }

            // 6. Persist the final state to the database and trigger a full re-analysis
            savePortfolioToDB(newItems, cashAfterTransaction, marketTarget);
            setMarketStates(prev => ({
                ...prev,
                [marketTarget]: { ...prev[marketTarget], portfolioItems: newItems, portfolioCash: cashAfterTransaction }
            }));
            handleFetchPortfolioAnalysis(newItems, cashAfterTransaction, marketTarget);

        }, 3000); // 3-second simulation
    };

    const handleDeletePosition = (id: string) => {
        const currentPortfolio = marketStates[marketTarget].portfolioItems;
        const currentCash = marketStates[marketTarget].portfolioCash;
        const itemToDelete = currentPortfolio.find(item => item.id === id);
        if (!itemToDelete) return;

        const newItems = currentPortfolio.filter(item => item.id !== id);
        const returnedCash = itemToDelete.entryPrice * itemToDelete.quantity;
        const newCash = currentCash + returnedCash;

        savePortfolioToDB(newItems, newCash, marketTarget);
        setMarketStates(prev => ({
            ...prev,
            [marketTarget]: { ...prev[marketTarget], portfolioItems: newItems, portfolioCash: newCash }
        }));
        handleFetchPortfolioAnalysis(newItems, newCash, marketTarget);
    };

    const handleUpdateCash = (newCash: number) => {
        savePortfolioToDB(marketStates[marketTarget].portfolioItems, newCash, marketTarget);
        setMarketStates(prev => ({
            ...prev,
            [marketTarget]: { ...prev[marketTarget], portfolioCash: newCash }
        }));
        handleFetchPortfolioAnalysis(marketStates[marketTarget].portfolioItems, newCash, marketTarget);
    };

    const triggerAutopilotForStock = async (itemId: string, triggerEvent: string) => {
        const currentItems = marketStates[marketTarget].portfolioItems;
        const itemIndex = currentItems.findIndex(i => i.id === itemId);
        if (itemIndex === -1) return;

        // 1. Immediately update UI to 'analyzing' state
        const itemsWithAnalyzingState = currentItems.map((item, index) =>
            index === itemIndex ? { ...item, autopilotStatus: 'analyzing' as const } : item
        );
        setMarketStates(prev => ({
            ...prev,
            [marketTarget]: {
                ...prev[marketTarget],
                portfolioItems: itemsWithAnalyzingState,
                isBriefingLoading: true,
                briefingError: null
            }
        }));

        // 2. Simulate AI thinking time
        await new Promise(resolve => setTimeout(resolve, 2500));

        try {
            const itemToAnalyze = currentItems[itemIndex];
            const briefing = await generateAIBriefing(itemToAnalyze, triggerEvent);

            // 3. Update with the final result
            const finalItems = marketStates[marketTarget].portfolioItems.map((item, index) =>
                index === itemIndex ? { ...item, aiBriefing: briefing, autopilotStatus: 'briefing_ready' as const } : item
            );
            await savePortfolioToDB(finalItems, marketStates[marketTarget].portfolioCash, marketTarget);
            setMarketStates(prev => ({ ...prev, [marketTarget]: { ...prev[marketTarget], portfolioItems: finalItems } }));

        } catch (err) {
            const error = err instanceof Error ? err.message : 'AI 브리핑 생성 실패';
            // 4. Revert state on error
            const itemsRevertedOnError = marketStates[marketTarget].portfolioItems.map((item, index) =>
                index === itemIndex ? { ...item, autopilotStatus: 'monitoring' as const, aiBriefing: null } : item
            );
            setMarketStates(prev => ({
                ...prev,
                [marketTarget]: {
                    ...prev[marketTarget],
                    portfolioItems: itemsRevertedOnError,
                    briefingError: error
                }
            }));
        } finally {
            setMarketStates(prev => ({
                ...prev,
                [marketTarget]: { ...prev[marketTarget], isBriefingLoading: false }
            }));
        }
    };

    const handleViewBriefing = (item: PortfolioItem) => {
        setViewingBriefingItem(item);
        setIsBriefingModalOpen(true);
    };

    const currentMarketState = marketStates[marketTarget];

    // FIX: Rename properties to match PortfolioDashboardProps
    return {
        portfolioItems: currentMarketState.portfolioItems,
        portfolioCash: currentMarketState.portfolioCash,
        analysis: currentMarketState.analysis,
        overview: currentMarketState.overview,
        isAnalysisLoading: currentMarketState.isAnalysisLoading,
        isOverviewLoading: currentMarketState.isOverviewLoading,
        error: currentMarketState.error,
        hasNewAlert: currentMarketState.hasNewAlert,
        isBriefingLoading: currentMarketState.isBriefingLoading,
        briefingError: currentMarketState.briefingError,
        isBriefingModalOpen,
        viewingBriefingItem,
        immunityAnalysis: currentMarketState.immunityAnalysis,
        isImmunityAnalysisLoading: currentMarketState.isImmunityAnalysisLoading,
        onRefresh,
        handleFetchPortfolioAnalysis: (items: PortfolioItem[], cash: number) => handleFetchPortfolioAnalysis(items, cash, marketTarget),
        handleSavePosition,
        onDeletePosition: handleDeletePosition,
        onUpdateCash: handleUpdateCash,
        triggerAutopilotForStock,
        onViewBriefing: handleViewBriefing,
        closeBriefingModal: () => setIsBriefingModalOpen(false),
    };
}
