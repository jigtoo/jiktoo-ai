import { useState, useCallback, useEffect } from 'react';
import type { AIPortfolios, AITradeLogs, AITraderAlert, AIInvestmentStyle, AITurnType, MarketTarget, AIPortfolioState, MarketHealth, DashboardStock, AITradeLogEntry, AITraderDiagnosis, AIPortfolioDBRow, AITradeLogDBRow } from '../types';
import { fetchAITurnDecision, fetchAITraderDiagnosis } from '../services/gemini/aiTraderService';
import { supabase } from '../services/supabaseClient';


interface AITraderMarketState {
    portfolios: AIPortfolios;
    tradeLogs: AITradeLogs;
}

const initialMarketState: AITraderMarketState = {
    portfolios: { conservative: null, balanced: null, aggressive: null },
    tradeLogs: { conservative: [], balanced: [], aggressive: [] },
};

export const useAITrader = (marketTarget: MarketTarget, marketHealth: MarketHealth | null, dashboardStocks: DashboardStock[] | null) => {
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

    useEffect(() => {
        const fetchAITraderData = async () => {
            if (!supabase) return;

            const { data: portfolioData, error: portfolioError } = await supabase
                .from('ai_trader_portfolios')
                .select('style, data')
                .eq('market', marketTarget);

            if (portfolioError) console.error("Error fetching AI portfolios:", portfolioError);

            const { data: logData, error: logError } = await supabase
                .from('ai_trader_logs')
                .select('style, logs')
                .eq('market', marketTarget);

            if (logError) console.error("Error fetching AI logs:", logError);

            const portfolios: AIPortfolios = { conservative: null, balanced: null, aggressive: null };
            // FIX: Cast portfolioData to resolve 'never' type issue.
            ((portfolioData as any) || []).forEach((p: any) => {
                portfolios[p.style as AIInvestmentStyle] = p.data as AIPortfolioState;
            });

            const tradeLogs: AITradeLogs = { conservative: [], balanced: [], aggressive: [] };
            // FIX: Cast logData to resolve 'never' type issue.
            ((logData as any) || []).forEach((l: any) => {
                tradeLogs[l.style as AIInvestmentStyle] = l.logs as AITradeLogEntry[];
            });

            setMarketStates(prev => ({ ...prev, [marketTarget]: { portfolios, tradeLogs } }));
        };
        fetchAITraderData();
    }, [marketTarget]);


    const saveAIPortfolioToDB = useCallback(async (style: AIInvestmentStyle, portfolio: AIPortfolioState | null) => {
        if (!supabase) return;
        // FIX: Cast payload to `any` to avoid Supabase client type inference issues.
        const { error } = await supabase
            .from('ai_trader_portfolios')
            .upsert([{ market: marketTarget, style, data: portfolio, updated_at: new Date().toISOString() }] as any, { onConflict: 'market, style' });
        if (error) console.error(`Error saving AI portfolio (${style}):`, error);
    }, [marketTarget]);

    const saveAILogsToDB = useCallback(async (style: AIInvestmentStyle, logs: AITradeLogEntry[]) => {
        if (!supabase) return;
        // FIX: Cast payload to `any` to avoid Supabase client type inference issues.
        const { error } = await supabase
            .from('ai_trader_logs')
            .upsert([{ market: marketTarget, style, logs: logs, updated_at: new Date().toISOString() }] as any, { onConflict: 'market, style' });
        if (error) console.error(`Error saving AI logs (${style}):`, error);
    }, [marketTarget]);


    const handleSetupAIPortfolio = (initialCapital: number, investmentStyle: AIInvestmentStyle) => {
        const newPortfolio: AIPortfolioState = {
            initialCapital, cash: initialCapital, holdings: [],
            currentValue: initialCapital, profitOrLoss: 0, profitOrLossPercent: 0,
            investmentStyle,
        };
        const newPortfolios = { ...marketStates[marketTarget].portfolios, [investmentStyle]: newPortfolio };
        setMarketStates(prev => ({ ...prev, [marketTarget]: { ...prev[marketTarget], portfolios: newPortfolios } }));
        saveAIPortfolioToDB(investmentStyle, newPortfolio);
    };

    const handleResetAIPortfolio = () => {
        const style = activeAIInvestmentStyle;
        const newPortfolios = { ...marketStates[marketTarget].portfolios, [style]: null };
        const newLogs = { ...marketStates[marketTarget].tradeLogs, [style]: [] };
        setMarketStates(prev => ({ ...prev, [marketTarget]: { portfolios: newPortfolios, tradeLogs: newLogs } }));
        saveAIPortfolioToDB(style, null);
        saveAILogsToDB(style, []);
        setAiTurnFeedback(null);
        setAiTraderAlerts([]);
    };

    const handleRunAITurn = useCallback(async (turnType: AITurnType) => {
        setIsAiTurnRunning(true);
        setAiTurnFeedback(null);
        setAiTraderAlerts([]);

        const currentPortfolio = marketStates[marketTarget].portfolios[activeAIInvestmentStyle];
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

            updatedPortfolio.currentValue = updatedPortfolio.cash + updatedPortfolio.holdings.reduce((acc, h) => acc + (h.entryPrice * h.quantity), 0);
            updatedPortfolio.profitOrLoss = updatedPortfolio.currentValue - updatedPortfolio.initialCapital;
            updatedPortfolio.profitOrLossPercent = (updatedPortfolio.profitOrLoss / updatedPortfolio.initialCapital) * 100;

            const newPortfolios = { ...marketStates[marketTarget].portfolios, [activeAIInvestmentStyle]: updatedPortfolio };
            const updatedLogs = [...newLogs, ...marketStates[marketTarget].tradeLogs[activeAIInvestmentStyle]];
            const newTradeLogs = { ...marketStates[marketTarget].tradeLogs, [activeAIInvestmentStyle]: updatedLogs };

            setMarketStates(prev => ({ ...prev, [marketTarget]: { portfolios: newPortfolios, tradeLogs: newTradeLogs } }));
            saveAIPortfolioToDB(activeAIInvestmentStyle, updatedPortfolio);
            saveAILogsToDB(activeAIInvestmentStyle, updatedLogs);
            setAiTurnFeedback(decision.overallReason);

        } catch (err) {
            setAiTurnFeedback(`AI 턴 실행 중 오류 발생: ${err instanceof Error ? err.message : '알 수 없는 오류'}`);
        } finally {
            setIsAiTurnRunning(false);
        }
    }, [activeAIInvestmentStyle, marketStates, marketHealth, dashboardStocks, marketTarget, saveAIPortfolioToDB, saveAILogsToDB]);

    const handleRunDiagnosis = useCallback(async () => {
        const portfolio = marketStates[marketTarget].portfolios[activeAIInvestmentStyle];
        const logs = marketStates[marketTarget].tradeLogs[activeAIInvestmentStyle];
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
            setAiDiagnosisResult({
                diagnosisScore: 0,
                summary: `진단 중 오류가 발생했습니다: ${err instanceof Error ? err.message : '알 수 없는 오류'}`,
                strengths: [],
                weaknesses: [],
                recommendations: []
            });
        } finally {
            setIsDiagnosisLoading(false);
        }
    }, [activeAIInvestmentStyle, marketStates, marketTarget]);

    // FIX: Rename properties to match AITraderDashboardProps. This resolves the error in App.tsx.
    return {
        portfolios: marketStates[marketTarget].portfolios,
        tradeLogs: marketStates[marketTarget].tradeLogs,
        activeStyle: activeAIInvestmentStyle,
        onRunTurn: handleRunAITurn,
        isLoading: isAiTurnRunning,
        alerts: aiTraderAlerts,
        onSetup: handleSetupAIPortfolio,
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