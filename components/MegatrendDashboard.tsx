// components/MegatrendDashboard.tsx
import React, { useState, useEffect } from 'react';
import { useMegatrend } from '../hooks/useMegatrend';
import type { MarketTarget } from '../types';
import type { Megatrend } from '../services/gemini/megatrendService';
import type { InvestmentTheme } from '../services/gemini/themeMapperService';
import type { ThemeStock } from '../services/gemini/stockDiscoveryService';

interface MegatrendDashboardProps {
    marketTarget: MarketTarget;
}

export const MegatrendDashboard: React.FC<MegatrendDashboardProps> = ({ marketTarget }) => {
    const {
        trends,
        selectedTrend,
        themes,
        stocks,
        portfolio,
        riskProfile,
        isLoadingTrends,
        isLoadingThemes,
        isLoadingStocks,
        isLoadingPortfolio,
        error,
        analyzeTrends,
        selectTrend,
        discoverStocks,
        buildPortfolio,
        setRiskProfile,
        reset
    } = useMegatrend(marketTarget);

    return (
        <div className="bg-gray-900 text-white p-6 rounded-xl shadow-2xl border border-gray-700 space-y-6">
            {/* Header */}
            <header className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
                        🌍 메가트렌드 분석
                    </h2>
                    <p className="text-xs text-gray-400 mt-1">
                        거시적 트렌드 → 투자 테마 → 종목 발굴
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={analyzeTrends}
                        disabled={isLoadingTrends}
                        className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoadingTrends ? '분석 중...' : '🔍 트렌드 분석'}
                    </button>
                    <button
                        onClick={reset}
                        className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs transition-all"
                    >
                        초기화
                    </button>
                </div>
            </header>

            {/* Error Display */}
            {error && (
                <div className="bg-red-900/30 border border-red-600 rounded-lg p-4">
                    <p className="text-red-300 text-sm">⚠️ {error}</p>
                </div>
            )}

            {/* Step 1: Megatrends */}
            {trends.length > 0 && (
                <section className="bg-gray-800 p-4 rounded-lg border border-gray-600">
                    <h3 className="text-lg font-bold mb-3 text-cyan-400">📊 메가트렌드</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {trends.map(trend => (
                            <TrendCard
                                key={trend.id}
                                trend={trend}
                                isSelected={selectedTrend?.id === trend.id}
                                onSelect={() => selectTrend(trend)}
                            />
                        ))}
                    </div>
                </section>
            )}

            {/* Step 2: Investment Themes */}
            {selectedTrend && (
                <section className="bg-gray-800 p-4 rounded-lg border border-gray-600">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-lg font-bold text-green-400">💡 투자 테마</h3>
                        {themes.length > 0 && (
                            <button
                                onClick={discoverStocks}
                                disabled={isLoadingStocks}
                                className="px-3 py-1 bg-green-600 hover:bg-green-500 rounded text-sm font-bold transition-all disabled:opacity-50"
                            >
                                {isLoadingStocks ? '검색 중...' : '🔎 종목 발굴'}
                            </button>
                        )}
                    </div>
                    {isLoadingThemes ? (
                        <AnalysisLog
                            steps={[
                                `Analyzing Megatrend: ${selectedTrend.title}...`,
                                "Scanning global market reports...",
                                "Identifying key growth sectors...",
                                "Evaluating market impact (KR/US)...",
                                "Synthesizing investment themes..."
                            ]}
                        />
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {themes.map(theme => (
                                <ThemeCard key={theme.id} theme={theme} />
                            ))}
                        </div>
                    )}
                </section>
            )}

            {/* Step 3: Discovered Stocks */}
            {(stocks.length > 0 || isLoadingStocks) && (
                <section className="bg-gray-800 p-4 rounded-lg border border-gray-600">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-lg font-bold text-yellow-400">🎯 발굴 종목</h3>
                        {stocks.length > 0 && (
                            <button
                                onClick={buildPortfolio}
                                disabled={isLoadingPortfolio}
                                className="px-3 py-1 bg-purple-600 hover:bg-purple-500 rounded text-sm font-bold transition-all disabled:opacity-50"
                            >
                                {isLoadingPortfolio ? '구성 중...' : '📊 포트폴리오 구성'}
                            </button>
                        )}
                    </div>
                    {isLoadingStocks ? (
                        <AnalysisLog
                            steps={[
                                "Initializing Stock Discovery Agent...",
                                `Target Market: ${marketTarget === 'KR' ? 'Korea (KOSPI/KOSDAQ)' : 'USA (NYSE/NASDAQ)'}`,
                                "Searching for leading companies in each theme...",
                                "Analyzing financial fundamentals (Revenue, Profit)...",
                                "Checking recent news and catalysts...",
                                "Calculating AI Confidence Score...",
                                "Finalizing stock list..."
                            ]}
                        />
                    ) : (
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                            {stocks.map((stock, index) => (
                                <StockCard key={`${stock.ticker}-${index}`} stock={stock} />
                            ))}
                        </div>
                    )}
                </section>
            )}

            {/* Step 4: Portfolio */}
            {(portfolio || isLoadingPortfolio) && (
                <section className="bg-gray-800 p-4 rounded-lg border border-gray-600">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-purple-400">💼 장기 투자 포트폴리오</h3>
                        <div className="flex gap-2">
                            {(['conservative', 'moderate', 'aggressive'] as const).map(profile => (
                                <button
                                    key={profile}
                                    onClick={() => setRiskProfile(profile)}
                                    className={`px-3 py-1 rounded text-xs font-bold transition-all ${riskProfile === profile
                                        ? 'bg-purple-600 text-white'
                                        : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                                        }`}
                                >
                                    {profile === 'conservative' ? '보수적' : profile === 'moderate' ? '균형' : '공격적'}
                                </button>
                            ))}
                        </div>
                    </div>
                    {isLoadingPortfolio ? (
                        <AnalysisLog
                            steps={[
                                `Building Portfolio (Risk Profile: ${riskProfile})...`,
                                "Optimizing asset allocation weights...",
                                "Calculating expected returns and drawdown...",
                                "Simulating stress tests...",
                                "Generating investment rationale...",
                                "Finalizing portfolio structure..."
                            ]}
                        />
                    ) : portfolio && (
                        <div className="space-y-4">
                            {/* Portfolio Header */}
                            <div className="bg-gray-700/50 p-4 rounded-lg">
                                <h4 className="font-bold text-white text-lg mb-2">{portfolio.name}</h4>
                                <p className="text-sm text-gray-300 mb-3">{portfolio.description}</p>
                                <div className="grid grid-cols-3 gap-3 text-xs">
                                    <div>
                                        <p className="text-gray-400">시간 지평</p>
                                        <p className="font-bold text-white">{portfolio.timeHorizon}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-400">예상 수익률</p>
                                        <p className="font-bold text-green-400">{portfolio.expectedReturn}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-400">최대 손실</p>
                                        <p className="font-bold text-red-400">{portfolio.maxDrawdown}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Allocations */}
                            <div className="space-y-3">
                                {portfolio.allocations.map((allocation, index) => (
                                    <div key={index} className="bg-gray-700/30 p-3 rounded-lg border border-gray-600">
                                        <div className="flex justify-between items-center mb-2">
                                            <h5 className="font-bold text-green-300">{allocation.theme}</h5>
                                            <span className="text-sm font-bold text-white">{allocation.weight}%</span>
                                        </div>
                                        <p className="text-xs text-gray-300 mb-3">{allocation.rationale}</p>
                                        <div className="space-y-2">
                                            {allocation.stocks.map((stock, stockIndex) => (
                                                <div key={stockIndex} className="flex justify-between items-center text-xs bg-gray-800/50 p-2 rounded">
                                                    <div>
                                                        <p className="font-bold text-white">{stock.stockName}</p>
                                                        <p className="text-gray-400">{stock.ticker}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-bold text-cyan-400">{stock.weight}%</p>
                                                        <p className="text-gray-400">{stock.entryStrategy}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Monitoring & Risks */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-gray-700/30 p-3 rounded-lg">
                                    <h5 className="font-bold text-cyan-400 mb-2 text-sm">📊 모니터링 지표</h5>
                                    <ul className="text-xs text-gray-300 space-y-1">
                                        {portfolio.monitoringMetrics.map((metric, i) => (
                                            <li key={i}>• {metric}</li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="bg-gray-700/30 p-3 rounded-lg">
                                    <h5 className="font-bold text-red-400 mb-2 text-sm">⚠️ 주요 리스크</h5>
                                    <ul className="text-xs text-gray-300 space-y-1">
                                        {portfolio.risks.map((risk, i) => (
                                            <li key={i}>• {risk}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}
                </section>
            )}
        </div>
    );
};

// Analysis Log Component
const AnalysisLog: React.FC<{ steps: string[] }> = ({ steps }) => {
    const [currentStep, setCurrentStep] = useState(0);

    useEffect(() => {
        if (currentStep < steps.length - 1) {
            const timer = setTimeout(() => {
                setCurrentStep(prev => prev + 1);
            }, 2500); // Update message every 2.5 seconds
            return () => clearTimeout(timer);
        }
    }, [currentStep, steps.length]);

    return (
        <div className="bg-black p-4 rounded-lg font-mono text-xs text-green-400 border border-green-800 shadow-inner min-h-[150px]">
            <div className="flex items-center gap-2 mb-2 border-b border-green-900 pb-2">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-gray-500 ml-2">AI Analyst Terminal</span>
            </div>
            <div className="space-y-1">
                {steps.slice(0, currentStep + 1).map((step, i) => (
                    <div key={i} className="flex gap-2">
                        <span className="text-gray-500">[{new Date().toLocaleTimeString()}]</span>
                        <span>{i === currentStep ? '> ' : '  '}{step}</span>
                        {i === currentStep && <span className="animate-pulse">_</span>}
                    </div>
                ))}
            </div>
        </div>
    );
};

// Trend Card Component
const TrendCard: React.FC<{ trend: Megatrend; isSelected: boolean; onSelect: () => void }> = ({ trend, isSelected, onSelect }) => (
    <div
        onClick={onSelect}
        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${isSelected
            ? 'border-cyan-400 bg-cyan-900/30'
            : 'border-gray-600 hover:border-gray-500 bg-gray-700/50'
            }`}
    >
        <div className="flex justify-between items-start mb-2">
            <h4 className="font-bold text-white">{trend.title}</h4>
            <span className={`text-xs px-2 py-1 rounded ${trend.confidence >= 80 ? 'bg-green-600' :
                trend.confidence >= 60 ? 'bg-yellow-600' :
                    'bg-red-600'
                }`}>
                {trend.confidence}%
            </span>
        </div>
        <p className="text-sm text-gray-300 mb-2">{trend.summary}</p>
        <div className="flex items-center gap-2 text-xs text-gray-400">
            <span>⏱️ {trend.timeHorizon}</span>
            <span>•</span>
            <span>📈 {trend.investmentOpportunities.length}개 기회</span>
        </div>
    </div>
);

// Theme Card Component
const ThemeCard: React.FC<{ theme: InvestmentTheme }> = ({ theme }) => (
    <div className="p-3 rounded-lg bg-gray-700/50 border border-gray-600">
        <h4 className="font-bold text-green-300 mb-1">{theme.name}</h4>
        <p className="text-xs text-gray-300 mb-2">{theme.description}</p>
        <div className="flex flex-wrap gap-1 mb-2">
            {(theme.subThemes || []).map((sub, i) => (
                <span key={i} className="text-xs px-2 py-0.5 bg-gray-600 rounded">
                    {sub}
                </span>
            ))}
        </div>
        <div className="text-xs text-gray-400">
            <div>📊 성장률: {theme.expectedGrowthRate}</div>
            <div>📅 기간: {theme.timeframe}</div>
        </div>
    </div>
);

// Stock Card Component
const StockCard: React.FC<{ stock: ThemeStock }> = ({ stock }) => (
    <div className="p-3 rounded-lg bg-gray-700/50 border border-gray-600 hover:border-yellow-500 transition-all">
        <div className="flex justify-between items-start mb-2">
            <div>
                <h4 className="font-bold text-white">{stock.stockName}</h4>
                <p className="text-xs text-gray-400">{stock.ticker}</p>
            </div>
            <div className="text-right">
                <span className="text-xs px-2 py-1 bg-yellow-600 rounded font-bold">
                    {stock.aiConfidence}%
                </span>
                <p className="text-xs text-gray-400 mt-1">{stock.marketCap}</p>
            </div>
        </div>
        <div className="mb-2">
            <span className="text-xs px-2 py-0.5 bg-blue-600 rounded mr-1">{stock.theme}</span>
            <span className="text-xs px-2 py-0.5 bg-purple-600 rounded">{stock.subTheme}</span>
        </div>
        <p className="text-sm text-gray-300 mb-2">{stock.rationale}</p>
        <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
                <p className="text-gray-400 mb-1">💰 매출 비중</p>
                <p className="font-bold text-green-400">{stock.revenueExposure}%</p>
            </div>
            <div>
                <p className="text-gray-400 mb-1">🚀 촉매</p>
                <p className="text-gray-300">{stock.catalysts[0]}</p>
            </div>
        </div>
    </div>
);
