import React from 'react';
import type { TradingPlaybookAnalysis } from '../types';
import { TradingPlaybookIcon, CheckCircleIcon, BrainIcon } from './icons';

interface TradingPlaybookAnalyzerProps {
    analysis: TradingPlaybookAnalysis;
}

const SignalStrengthBar: React.FC<{ score: number }> = ({ score }) => {
    const width = `${score}%`;
    let colorClass = 'bg-green-500';
    if (score < 75) colorClass = 'bg-yellow-500';
    if (score < 50) colorClass = 'bg-red-500';

    return (
        <div>
            <div className="w-full bg-gray-700 rounded-full h-2.5">
                <div className={`h-2.5 rounded-full ${colorClass}`} style={{ width }}></div>
            </div>
            <div className="text-right text-sm font-bold mt-1">
                 <span className={`${colorClass.replace('bg-', 'text-')}`}>{score} / 100</span>
            </div>
        </div>
    );
};

export const TradingPlaybookAnalyzer: React.FC<TradingPlaybookAnalyzerProps> = ({ analysis }) => {
    if (!analysis) return null;

    const { appliedStrategy, keyPattern, signalStrength, confirmationSignals, expertAlignment, summary } = analysis;

    return (
        <div className="bg-gray-800/60 rounded-lg border border-gray-700 p-4 space-y-6">
            <header className="text-center">
                 <h3 className="text-xl font-bold text-gray-100">AI 트레이딩 플레이북 분석</h3>
                 <p className="text-sm text-gray-400">전설적인 투자 대가들의 전략을 현재 차트에 적용합니다.</p>
            </header>

            <div className="bg-gray-900/40 p-4 rounded-lg">
                <h4 className="font-bold text-teal-300 mb-2">적용 전략 및 핵심 패턴</h4>
                <p className="font-semibold text-gray-200">{appliedStrategy}</p>
                <div className="mt-2 flex items-center gap-2">
                    <span className="text-sm text-gray-400">핵심 패턴:</span>
                    <span className="px-2 py-1 text-xs font-semibold rounded-md bg-cyan-600/50 text-white">{keyPattern.name}</span>
                    <span className="px-2 py-1 text-xs font-semibold rounded-md bg-yellow-600/50 text-black">{keyPattern.status}</span>
                </div>
            </div>
            
            <div className="bg-gray-900/40 p-4 rounded-lg">
                <h4 className="font-bold text-teal-300 mb-2">현재 신호 강도</h4>
                <SignalStrengthBar score={signalStrength} />
            </div>

             <div className="bg-gray-900/40 p-4 rounded-lg">
                <h4 className="font-bold text-teal-300 mb-3">다중 확인 신호</h4>
                <ul className="space-y-2">
                    {confirmationSignals.map((signal, index) => (
                        <li key={index} className="flex items-center gap-2 text-sm text-gray-200">
                            <CheckCircleIcon className="h-5 w-5 text-green-400 flex-shrink-0" />
                            <span>{signal}</span>
                        </li>
                    ))}
                </ul>
            </div>
            
            <div className="bg-gray-900/40 p-4 rounded-lg">
                 <h4 className="font-bold text-teal-300 mb-2">대가의 원칙 부합도</h4>
                 <p className="text-sm text-gray-300">{expertAlignment}</p>
            </div>

            <div className="bg-gray-900/40 p-4 rounded-lg border-l-4 border-teal-500/80">
                <div className="flex items-center gap-3 mb-2">
                    <TradingPlaybookIcon className="h-6 w-6 text-teal-400" />
                    <h4 className="font-bold text-teal-300">AI 종합 판단</h4>
                </div>
                <p className="text-gray-300 text-sm">{summary}</p>
            </div>
        </div>
    );
};