// hooks/useRiskDashboard.ts
import { useState, useCallback, useEffect } from 'react';
import type { RiskDashboardData, MarketTarget, PortfolioItem } from '../types';
import { supabase } from '../services/supabaseClient';

const mockRiskData: RiskDashboardData = {
    portfolioRiskScore: {
        score: 75,
        summary: "포트폴리오가 특정 기술주 섹터에 편중되어 있어 섹터 관련 악재 발생 시 변동성이 클 수 있습니다."
    },
    alerts: [
        {
            id: 'risk_1',
            ticker: '005930.KS',
            stockName: '삼성전자',
            riskType: '실적 악화 우려',
            summary: "3분기 잠정 실적이 시장 컨센서스를 하회할 수 있다는 리포트가 다수 발행되었습니다.",
            severity: '중간',
            timestamp: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
            relatedNews: "A증권, '삼성전자 3분기 실적, 반도체 부진으로 기대치 하회 전망'"
        },
        {
            id: 'risk_2',
            ticker: 'TSLA',
            stockName: 'Tesla Inc.',
            riskType: '경쟁 심화',
            summary: "중국 전기차 시장에서 BYD의 신모델 출시로 점유율 경쟁이 심화될 것이라는 분석이 있습니다.",
            severity: '높음',
            timestamp: new Date(Date.now() - 3600000 * 2).toISOString(), // 2 hours ago
            relatedNews: "Reuters, 'BYD's new Seagull model to challenge Tesla's Model 3 dominance in China'",
            priceChangePercent: 5.1,
            marketReactionAnalysis: "경쟁 심화 리스크는 장기적인 관점의 우려입니다. 현재 시장은 단기적인 호재(예: 신규 공장 생산량 증대, 긍정적인 인도량 데이터 등)에 더 강하게 반응하고 있습니다. 이는 해당 리스크가 아직 주가에 완전히 반영되지 않았거나, 투자자들이 단기 성장 모멘텀을 더 중요하게 평가하고 있음을 시사합니다."
        },
        {
            id: 'risk_3',
            ticker: '042700.KS',
            stockName: '한미반도체',
            riskType: '기술적 과열 신호',
            summary: "주봉 RSI 지표가 85를 상회하며 단기 과매수 구간에 진입했습니다. 차익 실현 매물 출회 가능성이 있습니다.",
            severity: '낮음',
            timestamp: new Date().toISOString(),
        }
    ]
};

export const useRiskDashboard = (marketTarget: MarketTarget, portfolioItems: PortfolioItem[]) => {
    const [riskData, setRiskData] = useState<RiskDashboardData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchRiskData = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        if (!portfolioItems || portfolioItems.length === 0) {
            setRiskData(null);
            setIsLoading(false);
            return;
        }

        try {
            // For now, we will use mock data.
            // In the future, this will be replaced with a Gemini call based on portfolioItems.
            await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate network delay

            const portfolioTickers = new Set(portfolioItems.map(item => item.ticker));

            // Filter mock data based on portfolio
            const relevantAlerts = mockRiskData.alerts.filter(alert => portfolioTickers.has(alert.ticker));
            
            // Make the summary more dynamic
            const portfolioSummary = portfolioItems.length > 1
                ? `포트폴리오가 ${portfolioItems[0].stockName} 등 특정 기술주 섹터에 편중되어 있어 섹터 관련 악재 발생 시 변동성이 클 수 있습니다.`
                : `포트폴리오가 단일 종목(${portfolioItems[0].stockName})에 집중되어 있어 개별 종목 리스크가 매우 높습니다.`;

            setRiskData({
                portfolioRiskScore: {
                    ...mockRiskData.portfolioRiskScore,
                    summary: portfolioSummary,
                },
                alerts: relevantAlerts,
            });

        } catch (err) {
            setError(err instanceof Error ? err.message : '리스크 데이터를 불러오는 데 실패했습니다.');
        } finally {
            setIsLoading(false);
        }
    }, [marketTarget, portfolioItems]);

    useEffect(() => {
        fetchRiskData();
    }, [fetchRiskData]);

    return {
        riskData,
        isLoading,
        error,
        onRefresh: fetchRiskData,
    };
};