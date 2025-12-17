import React from 'react';
import type { WhaleTrackerAnalysis, MarketTarget } from '../types';
import { WhaleTrackerIcon, TrendingUpIcon, TrendingDownIcon, AlertIcon, InfoIcon, UserGroupIcon } from './icons';
import { marketInfo } from '../services/marketInfo';

interface WhaleTrackerAnalyzerProps {
    analysis: WhaleTrackerAnalysis;
    marketTarget: MarketTarget;
}

export const WhaleTrackerAnalyzer: React.FC<WhaleTrackerAnalyzerProps> = ({ analysis, marketTarget }) => {
    if (!analysis) return null;
    
    const { averageCost, deviationPercent, phase, phaseEvidence, signals, summary, accumulationType } = analysis;
    const currency = marketInfo[marketTarget].currency;
    const formatOptions = { maximumFractionDigits: marketTarget === 'KR' ? 0 : 2 };

    const phaseConfig = {
        '매집': 'bg-green-500/20 text-green-300 border-green-500/30',
        '분산': 'bg-red-500/20 text-red-300 border-red-500/30',
        '중립': 'bg-gray-500/20 text-gray-300 border-gray-500/30',
    };
    const phaseStyle = phaseConfig[phase] || phaseConfig['중립'];
    
    const signalIcon = (type: string) => {
        switch(type) {
            case '매수 신호': return <TrendingUpIcon className="h-5 w-5 text-green-400" />;
            case '매도 신호': return <TrendingDownIcon className="h-5 w-5 text-red-400" />;
            case '단기 과열 경고': return <AlertIcon className="h-5 w-5 text-yellow-400" />;
            case '저평가 기회': return <TrendingUpIcon className="h-5 w-5 text-cyan-400" />;
            default: return <InfoIcon className="h-5 w-5 text-gray-400" />;
        }
    };
    
    return (
        <div className="bg-gray-800/60 rounded-lg border border-gray-700 p-4 space-y-6">
            <header className="text-center">
                 <h3 className="text-xl font-bold text-gray-100">AI 세력 추적 분석</h3>
                 <p className="text-sm text-gray-400">시장의 보이지 않는 손, 세력의 움직임을 포착합니다.</p>
            </header>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-center">
                <div className="bg-gray-900/40 p-3 rounded-lg">
                    <p className="text-sm text-gray-400">세력 추정 평균단가 (VWAP)</p>
                    <p className="text-2xl font-bold font-mono text-white">{averageCost.toLocaleString(undefined, formatOptions)}{currency}</p>
                </div>
                 <div className="bg-gray-900/40 p-3 rounded-lg">
                    <p className="text-sm text-gray-400">현재가와 괴리율</p>
                    <p className={`text-2xl font-bold font-mono ${deviationPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {deviationPercent >= 0 ? '+' : ''}{deviationPercent.toFixed(2)}%
                    </p>
                </div>
            </div>

            <div className="bg-gray-900/40 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                    <h4 className="font-bold text-teal-300">현재 국면 (Phase)</h4>
                     <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${phaseStyle}`}>
                        {phase}
                    </span>
                </div>
                {accumulationType && (
                    <div className="flex items-center gap-2 mb-2 text-sm">
                        <UserGroupIcon className="h-5 w-5 text-purple-400" />
                        <span className="font-semibold text-purple-300">매집 유형:</span>
                        <span className="text-gray-200">{accumulationType}</span>
                    </div>
                )}
                <p className="text-sm text-gray-300">{phaseEvidence}</p>
            </div>
            
             <div className="bg-gray-900/40 p-4 rounded-lg">
                <h4 className="font-bold text-teal-300 mb-3">포착된 주요 신호</h4>
                <div className="space-y-3">
                    {signals && signals.length > 0 ? signals.map((signal, index) => (
                        <div key={index} className="flex items-start gap-3">
                            <div className="flex-shrink-0 mt-0.5">{signalIcon(signal.type)}</div>
                            <div>
                                <p className="font-semibold text-gray-200">{signal.type}</p>
                                <p className="text-xs text-gray-400">{signal.description}</p>
                            </div>
                        </div>
                    )) : <p className="text-sm text-gray-500">최근에 포착된 유의미한 신호가 없습니다.</p>}
                </div>
            </div>
            
            <div className="bg-gray-900/40 p-4 rounded-lg border-l-4 border-teal-500/80">
                <div className="flex items-center gap-3 mb-2">
                    <WhaleTrackerIcon className="h-6 w-6 text-teal-400" />
                    <h4 className="font-bold text-teal-300">AI 종합 분석</h4>
                </div>
                <p className="text-gray-300 text-sm">{summary}</p>
            </div>
        </div>
    );
};