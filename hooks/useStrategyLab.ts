// hooks/useStrategyLab.ts
import { useState, useCallback } from 'react';
import type { MarketTarget, UserDefinedStrategyRules, BacktestResult, UserStrategy } from '../types';
import { parseStrategyWithAI, runRealBacktestOnData, runBacktestSimulation } from '../services/gemini/strategyLabService';
import { runBacktest } from '../services/strategy/BacktestEngine';
import { supabase } from '../services/supabaseClient';
import { API_GATEWAY_URL } from '../config';

export const useStrategyLab = (marketTarget: MarketTarget) => {
    const [strategyText, setStrategyText] = useState('');
    const [parsedRules, setParsedRules] = useState<UserDefinedStrategyRules | null>(null);
    const [backtestResult, setBacktestResult] = useState<BacktestResult | null>(null);

    const [isParsing, setIsParsing] = useState(false);
    const [isBacktesting, setIsBacktesting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // New state for real backtesting
    const [backtestTicker, setBacktestTicker] = useState('AAPL');
    const [timeframe, setTimeframe] = useState('day'); // 'day', '60', '30'
    const [startDate, setStartDate] = useState('2023-01-01');
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [historicalData, setHistoricalData] = useState<any[] | null>(null);
    const [isFetchingData, setIsFetchingData] = useState(false);

    // --- STRATEGY LAB 2.0 State (Moved to top) ---
    const [logicV2, setLogicV2] = useState<any | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const resetState = (clearStrategyText = false) => {
        if (clearStrategyText) setStrategyText('');
        setParsedRules(null);
        setBacktestResult(null);
        setError(null);
        setHistoricalData(null);
    };

    const parseStrategy = useCallback(async () => {
        if (!strategyText.trim()) return;
        setIsParsing(true);
        resetState();
        try {
            const rules = await parseStrategyWithAI(strategyText, marketTarget);
            setParsedRules(rules);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'AI가 전략을 해석하는 데 실패했습니다.');
        } finally {
            setIsParsing(false);
        }
    }, [strategyText, marketTarget]);

    // --- NEW: Real Backtest Functions (Smart Discovery) ---
    const fetchHistoricalData = useCallback(async (manualTicker?: string) => {
        // Mode 1: Manual Ticker (User typed 'AAPL')
        if (manualTicker && manualTicker.trim().toUpperCase() !== 'RANDOM' && manualTicker.trim() !== '') {
            setBacktestTicker(manualTicker);
            await loadDataForTicker(manualTicker);
            return;
        }

        // Mode 2: Smart Discovery (User clicked 'Market Discovery')
        // Scan the universe for a match!
        setIsFetchingData(true);
        setError(null);
        setHistoricalData(null);

        try {
            const { getMarketUniverse } = await import('../services/strategy/MarketUniverse');
            const universe = getMarketUniverse(marketTarget);

            // If no logic is defined, just pick a random one to show data
            if (!logicV2) {
                const randomStock = universe[Math.floor(Math.random() * universe.length)];
                setBacktestTicker(randomStock.ticker);
                await loadDataForTicker(randomStock.ticker, randomStock.name);
                return;
            }

            // Logic exists -> Search for a MATCH
            let foundMatch = false;
            let checkedCount = 0;
            const maxChecks = 25; // Limit to 25 for promptness

            // Shuffle universe to get different results each time
            const shuffled = [...universe].sort(() => 0.5 - Math.random());

            for (const stock of shuffled.slice(0, maxChecks)) {
                checkedCount++;
                // 1. Fetch Data
                const data = await fetchTickerDataInternal(stock.ticker);
                if (!data || data.length < 100) continue;

                // 2. Test Strategy
                const { runBacktest } = await import('../services/strategy/BacktestEngine');
                const mockStrategy: any = {
                    id: 'temp',
                    name: 'Test',
                    logic_v2: logicV2,
                    market: marketTarget
                };

                try {
                    const result = await runBacktest(mockStrategy, marketTarget, data);
                    if (result && result.totalTrades > 0) {
                        // FOUND A MATCH!
                        setBacktestTicker(stock.ticker);
                        setHistoricalData(data);
                        // Also set the result immediately so user sees it
                        setBacktestResult(result);
                        alert(`🔍 조건 만족 종목 발견!\n\n종목: ${stock.name} (${stock.ticker})\n거래 횟수: ${result.totalTrades}회\n\n이 종목으로 시뮬레이션을 시작합니다.`);
                        foundMatch = true;
                        break;
                    }
                } catch (e) {
                    // silent fail for non-matches
                }
            }

            if (!foundMatch) {
                setError(`상위 ${maxChecks}개 종목을 스캔했으나 조건을 만족하는 종목이 없습니다. \n조건을 조금 더 완화해보세요.`);
                // Fallback: Just load the last one so they see something
                const fallback = shuffled[0];
                setBacktestTicker(fallback.ticker);
                await loadDataForTicker(fallback.ticker, fallback.name);
            }

        } catch (e) {
            setError(e instanceof Error ? e.message : '마켓 스캔 중 오류가 발생했습니다.');
        } finally {
            setIsFetchingData(false);
        }
    }, [marketTarget, startDate, endDate, timeframe, logicV2]);

    const loadDataForTicker = async (ticker: string, name?: string) => {
        setIsFetchingData(true);
        try {
            const data = await fetchTickerDataInternal(ticker);
            setHistoricalData(data);
        } catch (e) {
            setError(e instanceof Error ? e.message : '데이터 로드 실패');
        } finally {
            setIsFetchingData(false);
        }
    };

    const fetchTickerDataInternal = async (ticker: string): Promise<any[]> => {
        const timespan = timeframe === 'day' ? 'day' : 'minute';
        const multiplier = timeframe === 'day' ? 1 : Number(timeframe);

        const endpoint = `/v2/aggs/ticker/${ticker.toUpperCase()}/range/${multiplier}/${timespan}/${startDate}/${endDate}?adjusted=true&sort=asc&limit=5000`;
        const res = await fetch(`${API_GATEWAY_URL}?service=polygon&endpoint=${encodeURIComponent(endpoint)}`);
        const data = await res.json();

        if (!res.ok || data.error) throw new Error(data.error || 'API 호출 실패');
        if (!data.results) return [];
        return data.results;
    };


    const runRealBacktest = useCallback(async () => {
        if (!parsedRules) {
            setError('먼저 1단계에서 AI 전략 해석을 실행해주세요.');
            return;
        }
        if (!historicalData) {
            setError('먼저 2단계에서 과거 데이터를 가져와주세요.');
            return;
        }
        setIsBacktesting(true);
        setBacktestResult(null);
        setError(null);
        try {
            const result = await runRealBacktestOnData(parsedRules, historicalData, { from: startDate, to: endDate });
            setBacktestResult(result);
        } catch (e) {
            setError(e instanceof Error ? e.message : '실제 데이터 백테스트 중 오류가 발생했습니다.');
        } finally {
            setIsBacktesting(false);
        }
    }, [parsedRules, historicalData, startDate, endDate]);


    // --- OLD: AI Simulation Function ---
    const runAISimulation = useCallback(async () => {
        if (!parsedRules) {
            setError('먼저 1단계에서 AI 전략 해석을 실행해주세요.');
            return;
        }
        setIsBacktesting(true);
        setBacktestResult(null);
        setError(null);
        try {
            const result = await runBacktestSimulation(parsedRules, marketTarget);
            setBacktestResult(result);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'AI 가상 시뮬레이션 중 오류가 발생했습니다.');
        } finally {
            setIsBacktesting(false);
        }
    }, [parsedRules, marketTarget]);

    const saveStrategy = useCallback(async (name: string) => {
        if (!strategyText || !parsedRules || !backtestResult || !name.trim() || !supabase) {
            setError("전략을 저장하기 위한 모든 정보가 준비되지 않았습니다.");
            return;
        }
        setError(null);
        try {
            const { data: { session } } = await (supabase.auth as any).getSession();
            if (!session) throw new Error("로그인이 필요합니다.");
            const newStrategy: Omit<UserStrategy, 'id' | 'created_at' | 'owner'> = {
                name: name.trim(),
                description: strategyText,
                rules: parsedRules,
                backtest_result: backtestResult,
                is_active: false,
                market: marketTarget,
            };
            const { error: dbError } = await supabase.from('user_strategies').insert([newStrategy] as any);
            if (dbError) throw dbError;
            alert('전략이 라이브러리에 저장되었습니다!');
        } catch (e) {
            setError(`전략 저장 실패: ${e instanceof Error ? e.message : String(e)}`);
        }
    }, [strategyText, parsedRules, backtestResult, marketTarget]);


    // --- STRATEGY LAB 2.0 Functions ---
    const parseStrategyV2 = useCallback(async () => {
        if (!strategyText.trim()) return;
        setIsParsing(true);
        try {
            // Dynamic import to avoid cycles
            const { parseStrategyToLogicV2 } = await import('../services/gemini/strategyLabService');
            const logic = await parseStrategyToLogicV2(strategyText);
            setLogicV2(logic);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'AI 전략 파싱 실패');
        } finally {
            setIsParsing(false);
        }
    }, [strategyText]);

    const runBacktestV2 = useCallback(async () => {
        if (!logicV2) {
            setError("전략 로직이 비어있습니다.");
            return;
        }
        // Force data check
        if (!historicalData || historicalData.length === 0) {
            setError("⚠️ 백테스트 데이터가 없습니다. 먼저 상단에서 [종목 데이터 가져오기]를 실행해주세요.");
            return;
        }

        setIsBacktesting(true);
        setBacktestResult(null);
        try {
            // Construct mock strategy for backtest
            const mockStrategy: any = {
                id: 'temp',
                name: 'Test Strategy',
                description: strategyText,
                logic_v2: logicV2,
                rules: parsedRules || {},
                market: marketTarget,
                created_at: new Date().toISOString(),
                owner: 'user',
                is_active: false
            };

            // Run Real Backtest
            const result = await runBacktest(mockStrategy, marketTarget, historicalData);
            setBacktestResult(result);
        } catch (e) {
            setError(e instanceof Error ? e.message : '백테스트 실패');
        } finally {
            setIsBacktesting(false);
        }
    }, [logicV2, strategyText, parsedRules, marketTarget, historicalData]);

    const saveStrategyV2 = useCallback(async (name: string) => {
        if (!logicV2 || !name.trim() || !supabase) return;
        setIsSaving(true);
        try {
            // Insert into 'strategies' table
            const { error: dbError } = await supabase.from('strategies').insert([{
                name: name.trim(),
                description: strategyText,
                market: marketTarget,
                logic_v2: logicV2,
                is_active: true, // Default to active for Hunter
                owner_id: (await supabase.auth.getUser()).data.user?.id,
                genome: {} // Fallback for legacy NOT NULL constraint
            }] as any);

            if (dbError) throw dbError;
            alert(`✅ 전략 [${name}] 저장 완료! \nHunter가 즉시 감시를 시작합니다.`);
        } catch (e) {
            console.error(e);
            alert(`전략 저장 실패: ${e instanceof Error ? e.message : String(e)}`);
        } finally {
            setIsSaving(false);
        }
    }, [logicV2, strategyText, marketTarget]);

    return {
        strategyText, setStrategyText, parsedRules,
        backtestResult, isParsing, isBacktesting, error,
        parseStrategy, runAISimulation,
        // New real backtest exports
        backtestTicker, setBacktestTicker, startDate, setStartDate, endDate, setEndDate,
        historicalData, isFetchingData,
        fetchHistoricalData, runRealBacktest,
        timeframe, setTimeframe,
        // Save
        saveStrategy,
        // V2
        logicV2, setLogicV2, parseStrategyV2, saveStrategyV2, runBacktestV2, isSaving
    };
};
