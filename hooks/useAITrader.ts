import { useState, useCallback, useEffect } from 'react';
import type { AITraderAlert, AIInvestmentStyle, AITurnType, MarketTarget, AIPortfolioState, MarketHealth, DashboardStock, AITradeLogEntry, AITraderDiagnosis } from '../types';

import { fetchAITurnDecision, fetchAITraderDiagnosis } from '../services/gemini/aiTraderService';
import { supabase } from '../services/supabaseClient';


interface AITraderMarketState {
    portfolio: AIPortfolioState | null; // [Unified] Single Portfolio
    tradeLogs: AITradeLogEntry[];       // [Unified] Single Logs
}

const initialMarketState: AITraderMarketState = {
    portfolio: null,
    tradeLogs: [],
};

export const useAITrader = (marketTarget: MarketTarget, marketHealth: MarketHealth | null, dashboardStocks: DashboardStock[] | null) => {
    // [Refactor] activeStyle is less relevant for Unified, but kept for UI compatibility if needed, though now acts as 'unified' internally
    const [activeAIInvestmentStyle, setActiveAIInvestmentStyle] = useState<AIInvestmentStyle>('balanced');

    const [marketStates, setMarketStates] = useState<{ KR: AITraderMarketState, US: AITraderMarketState }>({
        KR: { ...initialMarketState },
        US: { ...initialMarketState },
    });

    const [isAiTurnRunning, setIsAiTurnRunning] = useState(false);
    const [aiTraderAlerts, setAiTraderAlerts] = useState<AITraderAlert[]>([]);
    const [aiTurnFeedback, setAiTurnFeedback] = useState<string | null>(null);

    const [isDiagnosisModalOpen, setIsDiagnosisModalOpen] = useState(false);
    const [isDiagnosisLoading, setIsDiagnosisLoading] = useState(false);
    const [aiDiagnosisResult, setAiDiagnosisResult] = useState<AITraderDiagnosis | null>(null);

    // [Refactor] Unified Data Fetching
    useEffect(() => {
        const fetchAITraderData = async () => {
            if (!supabase) return;

            // Fetch Unified Portfolio for KR
            const { data: krData, error: krError } = await supabase
                .from('ai_trader_portfolios')
                .select('data')
                .eq('market', 'KR')
                .eq('style', 'unified')
                .maybeSingle();

            // Fetch Unified Portfolio for US
            const { data: usData, error: usError } = await supabase
                .from('ai_trader_portfolios')
                .select('data')
                .eq('market', 'US')
                .eq('style', 'unified')
                .maybeSingle();

            if (krError) console.error("Error fetching KR portfolio:", krError);
            if (usError) console.error("Error fetching US portfolio:", usError);

            // Fetch Unified Logs
            const { data: logData, error: logError } = await supabase
                .from('ai_trader_logs')
                .select('logs')
                .eq('market', marketTarget)
                .eq('style', 'unified')
                .maybeSingle();

            if (logError && logError.code !== 'PGRST116') console.error("Error fetching AI logs:", logError);

            // [FIX] Explicit Type Casting to avoid 'never'
            // [FIX] Explicit Type Casting to avoid 'never' & Fallback for Zero Balance
            // If DB returns null (RLS issue or empty), use Default Capital instead of 0
            const DEFAULT_KR_CAPITAL = 50000000;
            const DEFAULT_US_CAPITAL = 30000;

            const krPortfolio = krData ? (krData as any).data as AIPortfolioState : {
                initialCapital: DEFAULT_KR_CAPITAL,
                cash: DEFAULT_KR_CAPITAL,
                currentValue: DEFAULT_KR_CAPITAL,
                holdings: [],
                profitOrLoss: 0,
                profitOrLossPercent: 0,
                investmentStyle: 'unified'
            };

            const usPortfolio = usData ? (usData as any).data as AIPortfolioState : {
                initialCapital: DEFAULT_US_CAPITAL,
                cash: DEFAULT_US_CAPITAL,
                currentValue: DEFAULT_US_CAPITAL,
                holdings: [],
                profitOrLoss: 0,
                profitOrLossPercent: 0,
                investmentStyle: 'unified'
            };

            const tradeLogs = logData ? (logData as any).logs as AITradeLogEntry[] : [];


            setMarketStates(prev => ({
                KR: { portfolio: krPortfolio, tradeLogs: marketTarget === 'KR' ? tradeLogs : prev.KR.tradeLogs },
                US: { portfolio: usPortfolio, tradeLogs: marketTarget === 'US' ? tradeLogs : prev.US.tradeLogs }
            }));
        };
        fetchAITraderData();

        // [REALTIME] Subscribe to balance/portfolio updates from the background service
        const subscription = supabase?.channel('ai_portfolio_changes')
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'ai_trader_portfolios'
            }, () => {
                console.log('[useAITrader] 🔄 Realtime Update Detected. Refreshing...');
                fetchAITraderData();
            })
            .subscribe();

        return () => {
            if (subscription) {
                supabase?.removeChannel(subscription);
            }
        };
    }, [marketTarget]);


    const saveAIPortfolioToDB = useCallback(async (portfolio: AIPortfolioState | null) => {
        if (!supabase) return;
        const { error } = await supabase
            .from('ai_trader_portfolios')
            .upsert([{ market: marketTarget, style: 'unified', data: portfolio, updated_at: new Date().toISOString() }] as any, { onConflict: 'market, style' });
        if (error) console.error(`Error saving AI unified portfolio:`, error);
    }, [marketTarget]);

    const saveAILogsToDB = useCallback(async (logs: AITradeLogEntry[]) => {
        if (!supabase) return;
        const { error } = await supabase
            .from('ai_trader_logs')
            .upsert([{ market: marketTarget, style: 'unified', logs: logs, updated_at: new Date().toISOString() }] as any, { onConflict: 'market, style' });
        if (error) console.error(`Error saving AI logs:`, error);
    }, [marketTarget]);


    const handleSetupAIPortfolio = (initialCapital: number) => {
        const newPortfolio: AIPortfolioState = {
            initialCapital, cash: initialCapital, holdings: [],
            currentValue: initialCapital, profitOrLoss: 0, profitOrLossPercent: 0,
            investmentStyle: 'balanced', // Default tag for now
        };
        setMarketStates(prev => ({ ...prev, [marketTarget]: { ...prev[marketTarget], portfolio: newPortfolio } }));
        saveAIPortfolioToDB(newPortfolio);
    };

    const handleResetAIPortfolio = () => {
        setMarketStates(prev => ({ ...prev, [marketTarget]: { portfolio: null, tradeLogs: [] } }));
        saveAIPortfolioToDB(null);
        saveAILogsToDB([]);
        setAiTurnFeedback(null);
        setAiTraderAlerts([]);
    };

    const handleRunAITurn = useCallback(async (turnType: AITurnType) => {
        setIsAiTurnRunning(true);
        setAiTurnFeedback(null);
        setAiTraderAlerts([]);

        const currentPortfolio = marketStates[marketTarget].portfolio;
        if (!currentPortfolio) {
            setIsAiTurnRunning(false);
            return;
        }

        try {
            const decision = await fetchAITurnDecision(currentPortfolio, marketHealth, dashboardStocks, turnType, marketTarget);
            let updatedPortfolio = { ...currentPortfolio };
            const newLogs: AITradeLogEntry[] = [];

            for (const trade of decision.trades) {
                if (trade.type === 'buy') {
                    const cost = trade.price * trade.quantity;
                    if (updatedPortfolio.cash >= cost) {
                        updatedPortfolio.cash -= cost;
                        // ... (Logic same as before, simplified for Unified)
                        const existingHoldingIndex = updatedPortfolio.holdings.findIndex(h => h.ticker === trade.ticker);
                        if (existingHoldingIndex > -1) {
                            const existing = updatedPortfolio.holdings[existingHoldingIndex];
                            const totalQty = existing.quantity + trade.quantity;
                            const avgPrice = ((existing.entryPrice * existing.quantity) + (trade.price * trade.quantity)) / totalQty;
                            updatedPortfolio.holdings[existingHoldingIndex] = { ...existing, quantity: totalQty, entryPrice: avgPrice };
                        } else {
                            updatedPortfolio.holdings.push({
                                id: crypto.randomUUID(),
                                ticker: trade.ticker, stockName: trade.stockName, entryPrice: trade.price,
                                quantity: trade.quantity, purchaseTimestamp: new Date().toISOString(),
                            });
                        }
                        newLogs.push({ ...trade, id: crypto.randomUUID(), timestamp: new Date().toLocaleString('ko-KR') });
                    }
                } else if (trade.type === 'sell') {
                    const holdingIndex = updatedPortfolio.holdings.findIndex(h => h.ticker === trade.ticker);
                    if (holdingIndex > -1) {
                        updatedPortfolio.cash += trade.price * trade.quantity;
                        updatedPortfolio.holdings.splice(holdingIndex, 1);
                        newLogs.push({ ...trade, id: crypto.randomUUID(), timestamp: new Date().toLocaleString('ko-KR') });
                    }
                }
            }

            // Recalculate Totals
            updatedPortfolio.currentValue = updatedPortfolio.cash + updatedPortfolio.holdings.reduce((acc, h) => acc + (h.entryPrice * h.quantity), 0);
            updatedPortfolio.profitOrLoss = updatedPortfolio.currentValue - updatedPortfolio.initialCapital;
            updatedPortfolio.profitOrLossPercent = (updatedPortfolio.profitOrLoss / updatedPortfolio.initialCapital) * 100;

            const updatedLogs = [...newLogs, ...marketStates[marketTarget].tradeLogs];

            setMarketStates(prev => ({
                ...prev,
                [marketTarget]: { portfolio: updatedPortfolio, tradeLogs: updatedLogs }
            }));

            saveAIPortfolioToDB(updatedPortfolio);
            saveAILogsToDB(updatedLogs);
            setAiTurnFeedback(decision.overallReason);

        } catch (err) {
            setAiTurnFeedback(`AI 턴 실행 중 오류 발생: ${err instanceof Error ? err.message : '알 수 없는 오류'}`);
        } finally {
            setIsAiTurnRunning(false);
        }
    }, [marketStates, marketHealth, dashboardStocks, marketTarget, saveAIPortfolioToDB, saveAILogsToDB]);

    // ... (Diagnosis logic similar but using unified)

    const handleRunDiagnosis = useCallback(async () => {
        const portfolio = marketStates[marketTarget].portfolio;
        const logs = marketStates[marketTarget].tradeLogs;
        if (!portfolio || logs.length === 0) {
            alert('진단을 위해선 최소 한 번 이상의 매매 기록이 필요합니다.');
            return;
        }
        setIsDiagnosisModalOpen(true);
        setIsDiagnosisLoading(true);
        setAiDiagnosisResult(null);
        try {
            const result = await fetchAITraderDiagnosis(portfolio, logs, marketTarget);
            setAiDiagnosisResult(result);
        } catch (err) {
            console.error('Diagnosis failed:', err);
            // ... error handling
        } finally {
            setIsDiagnosisLoading(false);
        }
    }, [marketStates, marketTarget]);


    // [Return Adapted Structure]
    // To support UI that expects key-value portfolios, we map unified to 'balanced' or just return single object?
    // ShadowDashboard expects: { portfolios: { aggressive: ..., balanced: ..., stable: ... } }
    // We will adapt this Hook to return "Unified" but mapped to "balanced" key to minimize Dashboard refactor,
    // OR ideally update Dashboard to use `portfolio` directly.
    // FIX: Rename properties to match AITraderDashboardProps. This resolves the error in App.tsx.
    return {
        // [New Interface]
        portfolio: marketStates[marketTarget].portfolio,
        tradeLogs: marketStates[marketTarget].tradeLogs,

        // [Global Access for Dashboard War Chest]
        allPortfolios: {
            KR: marketStates.KR.portfolio,
            US: marketStates.US.portfolio
        },


        // [Legacy Support - Optional, if Dashboard refactor is delayed]
        // portfolios: { balanced: marketStates[marketTarget].portfolio }, 

        activeStyle: activeAIInvestmentStyle,
        onRunTurn: handleRunAITurn,
        isLoading: isAiTurnRunning,
        alerts: aiTraderAlerts,
        onSetup: (cap: number, style?: any) => handleSetupAIPortfolio(cap), // Ignore style
        onInvestmentStyleChange: setActiveAIInvestmentStyle,
        onReset: handleResetAIPortfolio,
        onRunDiagnosis: handleRunDiagnosis,
        aiTurnFeedback,
        // These are also needed for the modal in App.tsx
        isDiagnosisModalOpen,
        isDiagnosisLoading,
        aiDiagnosisResult,
        setIsDiagnosisModalOpen,
    };
};