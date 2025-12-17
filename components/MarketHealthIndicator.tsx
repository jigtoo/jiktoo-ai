


import React from 'react';
import type { MarketHealth, MarketTarget } from '../types';
import { LoadingSpinner } from './LoadingSpinner';
import { InfoIcon, StrategyIcon, TrendingUpIcon, TrendingDownIcon, ThermometerIcon, PulseIcon, BrainIcon } from './icons';
import { ErrorDisplay } from './ErrorDisplay';

interface MarketHealthIndicatorProps {
    title: string;
    health: MarketHealth | null;
    isLoading: boolean;
    error: string | null;
    onRefresh?: () => void;
    marketTarget: MarketTarget;
    sessionLabel: string;
}

const statusConfig = {
    '매수 보류': {
        color: 'text-red-400',
        bgColor: 'bg-red-500',
        borderColor: 'border-red-700/50',
    },
    '신중한 매수 구간': {
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-500',
        borderColor: 'border-yellow-700/50',
    },
    '적극적 매수 구간': {
        color: 'text-green-400',
        bgColor: 'bg-green-500',
        borderColor: 'border-green-700/50',
    },
    'default': {
        color: 'text-gray-400',
        bgColor: 'bg-gray-500',
        borderColor: 'border-gray-700',
    }
};

const MacroIndicator: React.FC<{ name: string; value: string; trend: string }> = ({ name, value, trend }) => {
    const trendIcon = {
        'up': <TrendingUpIcon className="h-4 w-4 text-red-400" />,
        'down': <TrendingDownIcon className="h-4 w-4 text-green-400" />,
        'neutral': <span className="w-4 h-1 bg-gray-400 rounded-full" />,
    }[trend] || <span className="w-4 h-1 bg-gray-400 rounded-full" />;

    return (
        <div className="flex justify-between items-center text-sm p-2 bg-gray-900/40 rounded-md">
            <span className="text-gray-300">{name}</span>
            <div className="flex items-center gap-2">
                <span className="font-mono font-semibold text-white">{value}</span>
                {trendIcon}
            </div>
        </div>
    );
};


export const MarketHealthIndicator: React.FC<MarketHealthIndicatorProps> = ({ title, health, isLoading, error, onRefresh, marketTarget, sessionLabel }) => {
    
    if (isLoading) {
        return (
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl shadow-lg p-4 h-full flex flex-col items-center justify-center">
                <LoadingSpinner message={`${title.split(' ')[0]} 분석 중...`} showWittyMessages={true} />
            </div>
        );
    }
    
    if (error) {
        return (
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl shadow-lg p-4 h-full flex flex-col items-center justify-center">
               <ErrorDisplay
                    title={`${title} 로드 실패`}
                    message={error}
                    onRetry={onRefresh}
                />
            </div>
        );
    }
    
    const usButtonClass = 'from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600';
    const krButtonClass = 'from-cyan-600 to-blue-700 hover:from-cyan-700 hover:to-blue-800';
    const buttonClass = marketTarget === 'US' ? usButtonClass : krButtonClass;

    if (!health) {
        return (
             <div className="bg-gray-800/50 border border-gray-700 rounded-xl shadow-lg p-4 h-full flex flex-col items-center justify-center text-center">
                <StrategyIcon className="h-8 w-8 mb-4 text-cyan-400" />
                <h3 className="text-lg font-bold text-gray-100">{title}</h3>
                <p className="text-sm text-gray-400 mt-2 mb-6 max-w-sm">현재 시장의 투자 적합도를 분석하여, 지금이 공격적으로 나설 때인지 몸을 사릴 때인지 판단합니다.</p>
                <button 
                    onClick={onRefresh} 
                    className={`flex items-center justify-center px-4 py-2 bg-gradient-to-r ${buttonClass} text-white font-semibold rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-cyan-500 transition duration-200`}
                >
                    <span>시장 현황 분석 시작</span>
                </button>
            </div>
        );
    }

    const config = statusConfig[health.status] || statusConfig.default;

    return (
        <div className={`bg-gray-800/50 border ${config.borderColor} rounded-xl shadow-lg p-4 h-full flex flex-col`}>
             <div className="flex justify-between items-start mb-3">
                <h2 className="text-lg font-bold text-gray-100">{title}</h2>
                 <div className="text-right">
                    {sessionLabel && (
                        <span className="px-2 py-1 text-xs font-semibold bg-gray-700 text-gray-300 rounded-md">
                            {sessionLabel}
                        </span>
                    )}
                    {health.freshness_label && (
                         <p className="text-xs text-gray-500 mt-1">{health.freshness_label}</p>
                    )}
                 </div>
            </div>
            
            <div className="flex flex-col items-center justify-center text-center flex-grow">
                {/* Status */}
                <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${config.bgColor} shadow-md`}></span>
                    <p className={`text-lg font-bold ${config.color}`}>{health.status}</p>
                </div>

                {/* Summary */}
                <p className="text-gray-400 text-sm mt-2">{health.summary}</p>
            </div>

            {health.supplyDemandAnalysis && (
                <div className="mt-4 p-3 bg-gray-900/40 rounded-lg border-l-4 border-cyan-500">
                     <h4 className="flex items-center gap-2 font-bold text-cyan-300 mb-1">
                        <BrainIcon className="h-5 w-5"/>
                        AI 수급 해석
                    </h4>
                    <p className="text-sm text-gray-300">{health.supplyDemandAnalysis}</p>
                </div>
            )}
            
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="bg-gray-900/40 p-2 rounded-md"><p className="text-xs text-gray-400">1H</p><p className="font-mono font-semibold text-sm text-white">{health.avg_change_1h || '-'}</p></div>
                <div className="bg-gray-900/40 p-2 rounded-md"><p className="text-xs text-gray-400">4H</p><p className="font-mono font-semibold text-sm text-white">{health.avg_change_4h || '-'}</p></div>
                <div className="bg-gray-900/40 p-2 rounded-md"><p className="text-xs text-gray-400">1D</p><p className="font-mono font-semibold text-sm text-white">{health.avg_change_1d || '-'}</p></div>
            </div>
            
            {health.market_sentiment && (
                <div className="mt-3 p-2 bg-gray-900/40 rounded-md flex items-center justify-center gap-2 text-sm">
                    <ThermometerIcon className="h-5 w-5 text-purple-400" />
                    <span className="font-semibold text-gray-300">시장 심리:</span>
                    <span className="font-bold text-purple-300">{health.market_sentiment}</span>
                </div>
            )}

            {/* Footer Section */}
            <div className="mt-3 pt-3 border-t border-gray-700/50 space-y-3">
                 {/* Macro Indicators */}
                {health.macroIndicators && health.macroIndicators.length > 0 && (
                    <div className="space-y-2">
                        {health.macroIndicators.map(indicator => (
                           <MacroIndicator key={indicator.name} name={indicator.name} value={indicator.value} trend={indicator.trend} />
                        ))}
                    </div>
                )}
                 {/* Leading Sectors */}
                {health.leadingSectors && health.leadingSectors.length > 0 && (
                    <div className="text-center">
                        <div className="flex items-center justify-center gap-2 text-sm text-gray-300 font-semibold">
                            <TrendingUpIcon className="h-5 w-5 text-green-400" />
                            <span>주도 섹터</span>
                        </div>
                        <div className="flex flex-wrap justify-center gap-2 mt-2">
                           {health.leadingSectors?.map(sector => (
                               sector && <span key={sector} className="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded-md">{sector}</span>
                           ))}
                        </div>
                    </div>
                )}
                {health.regimeAnalysis && (
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 text-sm">
                        <StrategyIcon />
                        <p className="text-gray-300 font-semibold">{health.regimeAnalysis.regime}</p>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{health.regimeAnalysis.adaptationAdvice}</p>
                  </div>
                )}
            </div>
        </div>
    );
};