// components/AlphaScalperSignalCard.tsx -> now DayTraderSignalCard.tsx
import React from 'react';
import type { DayTraderSignal } from '../types';
import { BrainIcon, DayTradeIcon, TargetIcon, StopLossIcon } from './icons';

interface DayTraderSignalCardProps {
    signal: DayTraderSignal;
}

const ConfidenceGauge: React.FC<{ score: number }> = ({ score }) => {
    const percentage = Math.max(0, Math.min(100, score));
    const radius = 24;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    let colorClass = 'text-green-400';
    if (score < 80) colorClass = 'text-yellow-400';
    if (score < 60) colorClass = 'text-red-400';

    return (
        <div className="relative w-16 h-16 flex-shrink-0" aria-label={`AI 신뢰도: ${score}점`}>
            <svg className="w-full h-full" viewBox="0 0 56 56">
                <circle className="text-gray-700" strokeWidth="5" stroke="currentColor" fill="transparent" r={radius} cx="28" cy="28" />
                <circle
                    className={colorClass}
                    strokeWidth="5"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r={radius}
                    cx="28"
                    cy="28"
                    style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dashoffset 0.5s ease-in-out' }}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-xl font-bold ${colorClass}`}>{score}</span>
            </div>
        </div>
    );
};

export const DayTraderSignalCard: React.FC<DayTraderSignalCardProps> = ({ signal }) => {
    return (
        <div className="bg-gray-800/70 border border-gray-700 rounded-xl shadow-lg animate-fade-in">
            <header className="p-4 flex justify-between items-start gap-4 bg-gray-900/50 rounded-t-xl">
                <div>
                    <h3 className="text-xl font-bold text-white">{signal.stockName}</h3>
                    <p className="font-mono text-gray-400">{signal.ticker}</p>
                </div>
                <div className="text-center">
                    <ConfidenceGauge score={signal.aiConfidence} />
                    <p className="text-xs font-bold text-gray-400 mt-1">AI 신뢰도</p>
                </div>
            </header>
            <div className="p-4 space-y-4">
                <div className="p-3 bg-gray-900/40 rounded-lg border-l-4 border-cyan-500">
                    <h4 className="flex items-center gap-2 font-bold text-cyan-300 mb-1"><BrainIcon className="h-5 w-5"/>AI 추천 근거</h4>
                    <p className="text-sm text-gray-300">{signal.rationale}</p>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-green-900/30 p-2 rounded">
                        <p className="text-xs text-gray-400">돌파 가격</p>
                        <p className="font-mono font-bold text-green-300">{signal.breakoutPrice}</p>
                    </div>
                    <div className="bg-red-900/30 p-2 rounded">
                        <p className="text-xs text-gray-400">손절 기준</p>
                        <p className="font-mono font-bold text-red-300">{signal.stopLoss}</p>
                    </div>
                    <div className="bg-blue-900/30 p-2 rounded">
                        <p className="text-xs text-gray-400">단기 목표</p>
                        <p className="font-mono font-bold text-blue-300">{signal.target}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};