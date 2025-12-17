

import React from 'react';
import type { FairValueAnalysis, MarketTarget } from '../types';
import { ValueIcon } from './icons';
import { marketInfo } from '../services/marketInfo';

interface ValueGaugeProps {
    lowerBound: number | null;
    upperBound: number | null;
    currentPrice: number;
    currency: string;
    marketTarget: MarketTarget;
}

interface FairValueAnalyzerProps {
    analysis: FairValueAnalysis;
    currentPrice: number;
    marketTarget: MarketTarget;
}

const ValueGauge: React.FC<ValueGaugeProps> = ({ lowerBound, upperBound, currentPrice, currency, marketTarget }) => {

    if (lowerBound === null || upperBound === null || lowerBound >= upperBound) {
        return <p className="text-sm text-gray-500 text-center">적정가치 밴드 정보를 계산할 수 없습니다.</p>;
    }

    const range = upperBound - lowerBound;
    const position = ((currentPrice - lowerBound) / range) * 100;
    const clampedPosition = Math.max(-10, Math.min(110, position)); // Allow slightly out of bounds

    let statusText = '적정가';
    let statusColor = 'bg-green-500';

    if (position < 0) {
        statusText = '저평가';
        statusColor = 'bg-cyan-500';
    } else if (position > 100) {
        statusText = '고평가';
        statusColor = 'bg-red-500';
    }
    
    const formatOptions = { maximumFractionDigits: marketTarget === 'KR' ? 0 : 2 };

    return (
        <div className="w-full">
            <div className="relative h-6">
                <div 
                    className="absolute top-0 transition-all duration-500 ease-out"
                    style={{ left: `${clampedPosition}%`, transform: 'translateX(-50%)' }}
                >
                    <div className={`px-2 py-0.5 rounded-md text-xs font-bold whitespace-nowrap text-white ${statusColor}`}>
                        {currentPrice.toLocaleString(undefined, formatOptions)}{currency} ({statusText})
                    </div>
                    <div className={`w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-transparent mx-auto border-t-4 ${statusColor.replace('bg-','border-t-')}`}></div>
                </div>
            </div>
            <div className="h-2 w-full bg-gradient-to-r from-cyan-500 via-green-500 to-red-500 rounded-full mt-1"></div>
            <div className="flex justify-between text-xs font-mono text-gray-400 mt-1">
                <span>{lowerBound.toLocaleString(undefined, formatOptions)}{currency}</span>
                <span>{upperBound.toLocaleString(undefined, formatOptions)}{currency}</span>
            </div>
        </div>
    );
};

export const FairValueAnalyzer: React.FC<FairValueAnalyzerProps> = ({ analysis, currentPrice, marketTarget }) => {
    if (!analysis) return null;

    const { fairValueLowerBound, fairValueUpperBound, summary, valuationModels, scorecard } = analysis;
    const currency = marketInfo[marketTarget].currency;

    return (
        <div className="bg-gray-800/60 rounded-lg border border-gray-700 p-4 space-y-6">
            <header className="text-center">
                 <h3 className="text-xl font-bold text-gray-100">AI 적정가치 분석</h3>
                 <p className="text-sm text-gray-400">다양한 가치평가 모델을 통해 기업의 내재가치를 탐색합니다.</p>
            </header>

            <div className="bg-gray-900/40 p-4 rounded-lg">
                <h4 className="flex items-center gap-2 font-bold text-cyan-300 mb-2">
                    <ValueIcon className="h-5 w-5"/>
                    AI 적정가치 밴드
                </h4>
                <ValueGauge lowerBound={fairValueLowerBound} upperBound={fairValueUpperBound} currentPrice={currentPrice} currency={currency} marketTarget={marketTarget} />
            </div>
            
            <div className="bg-gray-900/40 p-4 rounded-lg">
                <h4 className="flex items-center gap-2 font-bold text-cyan-300 mb-4">
                    가치평가 스코어카드
                </h4>
                <div className="space-y-4">
                    {scorecard.map((item, index) => {
                        const width = `${item.score}%`;
                        let colorClass = 'bg-green-500';
                        if (item.score < 75) colorClass = 'bg-yellow-500';
                        if (item.score < 50) colorClass = 'bg-red-500';

                        return (
                            <div key={index}>
                                <div className="flex justify-between items-center text-sm mb-1">
                                    <span className="font-semibold text-gray-200">{item.category}</span>
                                    <span className={`font-bold ${colorClass.replace('bg-','text-')}`}>{item.score} / 100</span>
                                </div>
                                <div className="w-full bg-gray-700 rounded-full h-2.5">
                                    <div className={`h-2.5 rounded-full ${colorClass}`} style={{ width }}></div>
                                </div>
                                <p className="text-xs text-gray-400 mt-1">{item.summary}</p>
                            </div>
                        );
                    })}
                </div>
            </div>
            
            <div className="bg-gray-900/40 p-4 rounded-lg">
                 <h4 className="font-bold text-cyan-300 mb-2">AI 종합 의견</h4>
                 <p className="text-sm text-gray-300">{summary}</p>
                 
                 <div className="mt-4 pt-3 border-t border-gray-700/50 space-y-2 text-xs">
                    {valuationModels.map((model, index) => (
                        <div key={index}>
                            <p className="font-semibold text-gray-200">{model.modelName}: <span className="font-mono text-cyan-400">{model.value?.toLocaleString(undefined, { maximumFractionDigits: marketTarget === 'KR' ? 0 : 2 }) ?? 'N/A'}{currency}</span></p>
                            <p className="text-gray-500">{model.description}</p>
                        </div>
                    ))}
                 </div>
            </div>
        </div>
    );
};