import React from 'react';
import type { ChiefAnalystBriefing, MarketTarget } from '../types';
import { LoadingSpinner } from './LoadingSpinner';
import { LightbulbIcon, RadarIcon, FireIcon, PulseIcon, SparklesIcon, StrategyIcon, InfoIcon } from './icons';
import { PortfolioImmunityDashboard } from './PortfolioImmunityDashboard';

interface ChiefAnalystBriefingProps {
  briefing: ChiefAnalystBriefing | null;
  isLoading: boolean;
  error: string | null;
  onSelectStock: (ticker: string, rationale: string, stockName: string) => void;
  marketTarget: MarketTarget;
}

const SourceIcon: React.FC<{ source: string }> = ({ source }) => {
    switch(source) {
        case '재료 레이더': return <RadarIcon className="h-5 w-5 text-purple-400" />;
        case '코인주 스캐너': return <FireIcon className="h-5 w-5 text-orange-400" />;
        case '이상 신호': return <PulseIcon className="h-5 w-5 text-yellow-400" />;
        case 'AI 추천': return <SparklesIcon className="h-5 w-5 text-cyan-400" />;
        case '시장 건강': return <StrategyIcon className="h-5 w-5 text-green-400" />;
        case '패턴 스크리너': return <SparklesIcon className="h-5 w-5 text-teal-400" />;
        default: return <InfoIcon className="h-5 w-5 text-gray-400" />;
    }
}
export const ChiefAnalystBriefingComponent: React.FC<ChiefAnalystBriefingProps> = ({ briefing, isLoading, error, onSelectStock, marketTarget }) => {
    if (isLoading) {
        return (
            <div className="p-6 bg-gray-800/50 border border-cyan-500/30 rounded-xl text-center mb-8 animate-fade-in flex flex-col items-center justify-center min-h-[200px]">
                <LoadingSpinner message="수석 AI 애널리스트가 여러 데이터를 종합하여 시장의 핵심을 분석 중입니다..." />
            </div>
        );
    }
    
    if (error || !briefing || !briefing.marketThesis) {
        return null;
    }

    const { marketThesis, topConvictionPicks, leadingIndicators, portfolioImmunityAnalysis } = briefing;
    const usButtonClass = 'from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600';
    const krButtonClass = 'from-cyan-600 to-blue-700 hover:from-cyan-700 hover:to-blue-800';
    const buttonClass = marketTarget === 'US' ? usButtonClass : krButtonClass;

    return (
        <div className="p-6 bg-gradient-to-br from-gray-800 via-gray-900 to-gray-800 border border-cyan-500/50 rounded-xl shadow-2xl mb-8 animate-fade-in">
            <header className="text-center mb-6">
                 <div className="inline-block bg-gray-700 p-3 rounded-full mb-3">
                    <LightbulbIcon className="h-8 w-8 text-cyan-300" />
                </div>
                <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-400">AI 수석 애널리스트 브리핑</h2>
                <p className="text-gray-400 max-w-2xl mx-auto mt-1">
                    분산된 신호들을 연결하여 시장의 핵심 아이디어를 도출합니다.
                </p>
            </header>
            
            <div className="space-y-6">
                <div className="bg-gray-900/50 p-4 rounded-lg border-l-4 border-cyan-400">
                    <h3 className="text-lg font-bold text-cyan-300 mb-1">시장 핵심 테제 (Market Thesis)</h3>
                    <p className="text-gray-200 leading-relaxed">"{marketThesis}"</p>
                </div>

                <div>
                     <h3 className="text-lg font-bold text-gray-200 mb-3 text-center">최고 확신 종목 (Top Conviction)</h3>
                     <div className={`grid grid-cols-1 ${topConvictionPicks.length > 1 ? 'md:grid-cols-2' : ''} gap-4`}>
                        {topConvictionPicks.map(pick => (
                             <div key={pick.ticker} className="bg-gray-800/70 border border-gray-700 rounded-lg p-4 flex flex-col justify-between">
                                 <div>
                                    <h4 className="text-xl font-bold text-white">{pick.stockName}</h4>
                                    <p className="font-mono text-sm text-gray-400">{pick.ticker}</p>
                                    <p className="text-sm text-gray-300 mt-2">{pick.rationale}</p>
                                </div>
                                 <button
                                    onClick={() => onSelectStock(pick.ticker, pick.rationale, pick.stockName)}
                                    className={`mt-4 w-full px-4 py-2 bg-gradient-to-r ${buttonClass} text-white font-semibold rounded-lg shadow-md transition-transform transform hover:scale-105`}
                                    aria-label={`${pick.stockName} 심층 분석 보기`}
                                >
                                    심층 분석 보기
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
                
                {portfolioImmunityAnalysis && (
                    <PortfolioImmunityDashboard analysis={portfolioImmunityAnalysis} onSelectStock={onSelectStock} />
                )}

                 <div>
                    <h3 className="text-lg font-bold text-gray-200 mb-3 text-center">핵심 근거 신호 (Leading Indicators)</h3>
                     <div className="bg-gray-900/50 p-4 rounded-lg space-y-3">
                        {leadingIndicators.map((indicator, index) => (
                            <div key={index} className="flex items-start gap-3 p-2 bg-gray-800/60 rounded-md">
                                <div className="flex-shrink-0 mt-0.5"><SourceIcon source={indicator.source} /></div>
                                <div>
                                    <p className="font-semibold text-gray-300">{indicator.source}</p>
                                    <p className="text-sm text-gray-400">{indicator.signal}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
