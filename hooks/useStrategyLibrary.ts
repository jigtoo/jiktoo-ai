// hooks/useStrategyLibrary.ts
import { useState, useCallback, useEffect, useMemo } from 'react';
import type { UserStrategy, MarketTarget } from '../types';
import { supabase } from '../services/supabaseClient';

const defaultStrategies: UserStrategy[] = [
    {
        id: 'default-ai-collection-signal',
        owner: 'JIKTOO AI',
        created_at: '2024-01-01T00:00:00Z',
        name: 'AI 매집봉 포착 (기관/외국인 쌍끌이)',
        description: '시장이 하락하거나 횡보하는 불안정한 상황 속에서도, 기관과 외국인이 동시에 강력한 순매수를 보이며 주가를 방어하거나 상승시키는 종목을 포착하는 역발상 전략입니다.',
        rules: {
            entryConditions: ["지수 하락일 또는 횡보일", "외국인 및 기관 동시 순매수 발생", "주가 보합 또는 상승 마감", "주가가 20일 이동평균선 위에 위치"],
            exitConditions: ["수급 주체 중 하나가 대량 매도로 전환 시"],
            stopLoss: "-8% 또는 주요 지지선 이탈",
            takeProfit: "+20% 이상에서 분할 매도"
        },
        backtest_result: {
            period: "2022-2024 (Sim)", totalTrades: 124, winRate: 65.3, profitFactor: 2.1, avgProfit: 12.5, avgLoss: -5.8, maxDrawdown: -18.2, cagr: 35.1,
            aiAnalysis: "시장 변동성이 클 때 안정적인 성과를 보이는 역발상 수급 전략입니다.",
            aiOptimization: "거래대금 필터를 추가하여 유동성이 높은 종목에 집중하면 MDD를 개선할 수 있습니다."
        },
        is_active: true,
        market: 'KR',
        isDefault: true,
    },
    {
        id: 'default-ai-limit-up-engine',
        owner: 'JIKTOO AI',
        created_at: '2024-01-01T00:00:00Z',
        name: 'AI 상한가 포착 엔진 (시장 주도주)',
        description: '시장의 모든 에너지가 집중되는 당일 상한가 종목을 대상으로, 추세의 지속 가능성을 판단하여 다음 날 추가 상승(갭상승)을 노리는 초단기 모멘텀 전략입니다.',
        rules: {
            entryConditions: ["당일 상한가 마감", "거래대금 시장 상위 20% 이내", "주가가 5일 이동평균선 위에 위치"],
            exitConditions: ["다음 날 시초가 갭하락 시 즉시 매도", "수익 발생 시 5분봉 추세 이탈 시 분할 매도"],
            stopLoss: "시초가 이탈",
            takeProfit: "자율 매도"
        },
        backtest_result: {
            period: "2022-2024 (Sim)", totalTrades: 98, winRate: 55.1, profitFactor: 2.5, avgProfit: 9.8, avgLoss: -3.5, maxDrawdown: -25.5, cagr: 42.8,
            aiAnalysis: "높은 변동성을 감수하고 시장의 가장 강한 모멘텀에 편승하는 고위험 고수익 전략입니다.",
            aiOptimization: "시장 지수가 5일선 위에 있을 때만 진입하는 시장 필터를 추가하면 승률을 높일 수 있습니다."
        },
        is_active: true,
        market: 'KR',
        isDefault: true,
    }
];


export const useStrategyLibrary = (marketTarget: MarketTarget) => {
    const [userStrategies, setUserStrategies] = useState<UserStrategy[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchUserStrategies = useCallback(async () => {
        if (!supabase) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const { data, error: dbError } = await supabase
                .from('user_strategies')
                .select('*')
                .eq('market', marketTarget)
                .order('created_at', { ascending: false });

            if (dbError) throw dbError;
            setUserStrategies((data as UserStrategy[]) || []);
        } catch (e) {
            setError(e instanceof Error ? e.message : '사용자 전략을 불러오지 못했습니다.');
        } finally {
            setIsLoading(false);
        }
    }, [marketTarget]);

    useEffect(() => {
        fetchUserStrategies();
    }, [fetchUserStrategies]);
    
    const strategies = useMemo(() => {
        const marketDefaults = defaultStrategies.filter(s => s.market === marketTarget);
        // Prevent duplicates if user somehow creates a strategy with the same name as a default one
        const userStrategiesFiltered = userStrategies.filter(us => !marketDefaults.some(ds => ds.name === us.name));
        return [...marketDefaults, ...userStrategiesFiltered];
    }, [userStrategies, marketTarget]);

    const templateStrategies = useMemo(() => {
        // Templates are now separate from default strategies.
        const templateStrategiesData: UserStrategy[] = [];
        return templateStrategiesData.filter(s => s.market === marketTarget);
    }, [marketTarget]);

    const importStrategy = useCallback(async (templateId: string) => {
        const template = templateStrategies.find(t => t.id === templateId);
        if (template && supabase) {
            const newStrategy: Omit<UserStrategy, 'id' | 'created_at'> = {
                ...template,
                isDefault: false,
                is_active: false, // Start as inactive
                owner: '', // Will be set by DB policy
            };
            const { data, error } = await supabase.from('user_strategies').insert([newStrategy] as any).select();
            if (error) {
                setError(error.message);
            } else if (data) {
                setUserStrategies(prev => [...prev, data[0] as UserStrategy]);
            }
        }
    }, [templateStrategies]);

    const deleteStrategy = async (id: string) => {
        const strategyToDelete = strategies.find(s => s.id === id);
        if (strategyToDelete?.isDefault) {
            alert("기본 탑재된 AI 전략은 삭제할 수 없습니다.");
            return;
        }
        if (supabase) {
            const { error: dbError } = await supabase.from('user_strategies').delete().eq('id', id);
            if (dbError) {
                setError(dbError.message);
                return; // Don't update UI if DB operation fails
            }
        }
        setUserStrategies(prev => prev.filter(s => s.id !== id));
    };

    const toggleStrategyActive = async (id: string, isActive: boolean) => {
        if (supabase) {
            // FIX: Changed update to upsert to align with other working patterns in the codebase and resolve 'never' type error.
            const { error: dbError } = await supabase.from('user_strategies').upsert([{ id, is_active: isActive }] as any);
             if (dbError) {
                setError(dbError.message);
                return; // Don't update UI if DB operation fails
            }
        }
        setUserStrategies(prev => prev.map(s => s.id === id ? { ...s, is_active: isActive } : s));
    };
    
    const activeUserStrategies = useMemo(() => strategies.filter(s => s.is_active), [strategies]);

    return {
        strategies,
        activeUserStrategies,
        isLoading,
        error,
        deleteStrategy,
        toggleStrategyActive,
        templateStrategies,
        importStrategy,
    };
};
