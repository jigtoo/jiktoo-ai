// components/MegatrendDashboard.tsx
import React from 'react';
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
        selectTrend,
        discoverStocks,
        buildPortfolio,
        setRiskProfile,
        reset,
        refreshTrends
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
                        onClick={refreshTrends}
                        className="px-3 py-2 bg-blue-700 hover:bg-blue-600 rounded-lg text-xs transition-all flex items-center gap-1"
                        title="최신 데이터로 다시 분석"
                    >
                        🔄 재분석
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
            {isLoadingTrends ? (
                <div className="flex justify-center items-center h-40 bg-gray-800 rounded-lg border border-gray-600">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
                    <span className="ml-3 text-cyan-400 font-bold">글로벌 메가트렌드 분석 중...</span>
                </div>
            ) : trends.length > 0 && (
                <section className="bg-gray-800 p-4 rounded-lg border border-gray-600">
                    <h3 className="text-lg font-bold mb-3 text-cyan-400">📊 메가트렌드</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {trends.map(trend => (
                            <TrendCard
                                key={`${trend.id}-${trend.title}`}
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
                        <div className="flex justify-center items-center h-32">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-400"></div>
                        </div>
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
                        <div className="flex justify-center items-center h-32">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400"></div>
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                            {stocks.map((stock, index) => (
                                <StockCard key={`${stock.ticker}-${index}-${Date.now()}`} stock={stock} />
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
                        <div className="flex justify-center items-center h-32">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
                        </div>
                    ) : portfolio && (
                        <div className="space-y-4">
                            {/* Portfolio Header */}
                            <div className="bg-gray-700/50 p-4 rounded-lg">
                                <h4 className="font-bold text-white text-lg mb-2">AI 최적화 포트폴리오</h4>
                                <p className="text-sm text-gray-300 mb-3">{portfolio.description}</p>
                                <div className="grid grid-cols-2 gap-3 text-xs">
                                    <div>
                                        <p className="text-gray-400">총 투자 비중</p>
                                        <p className="font-bold text-green-400">{portfolio.totalWeight}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-400">종목 수</p>
                                        <p className="font-bold text-white">{portfolio.stocks.length} 개</p>
                                    </div>
                                </div>
                            </div>

                            {/* Stocks List */}
                            <div className="space-y-3">
                                {portfolio.stocks.map((stock, index) => (
                                    <div key={index} className="bg-gray-700/30 p-3 rounded-lg border border-gray-600">
                                        <div className="flex justify-between items-center mb-2">
                                            <div className="flex items-center gap-2">
                                                <h5 className="font-bold text-white text-base">{stock.stockName}</h5>
                                                <span className="text-xs text-gray-400">({stock.ticker})</span>
                                            </div>
                                            <span className="text-sm font-bold text-green-400 bg-green-900/30 px-2 py-1 rounded">
                                                비중 {stock.weight}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-300 mb-3 leading-relaxed">{stock.rationale}</p>

                                        <div className="flex items-center gap-2 bg-gray-800/50 p-2 rounded text-xs">
                                            <span className="text-cyan-400 font-bold">💡 매수 전략:</span>
                                            <span className="text-white">{stock.buyingStrategy}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </section>
            )}
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
        <div className="flex flex-col gap-1 mb-2">
            <div className="flex justify-between items-start">
                <h4 className="font-bold text-white flex items-center gap-2">
                    {trend.title}
                    {trend.summary.includes('[🎯 Strategic Vision]') && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-purple-600 rounded text-white font-bold animate-pulse">
                            Vision Sync
                        </span>
                    )}
                </h4>
                <span className={`text-xs px-2 py-1 rounded ${trend.confidence >= 80 ? 'bg-green-600' :
                    trend.confidence >= 60 ? 'bg-yellow-600' :
                        'bg-red-600'
                    }`}>
                    {trend.confidence}%
                </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400">
                <span>⏱️ {trend.timeHorizon}</span>
                <span>•</span>
                <span>📈 {trend.investmentOpportunities.length}개 기회</span>
            </div>
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
