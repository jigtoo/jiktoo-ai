// components/StrategyPlaybookCard.tsx
import React from 'react';
import type { StrategyPlaybook } from '../types';
import { BrainIcon, ChartIcon, DayTradeIcon, SwingTradeIcon, HandshakeIcon, SparklesIcon, BellIcon, SignalSourceIcon } from './icons';
import { formatStockDisplay } from '../utils/stockDisplay';

const ConfidenceGauge: React.FC<{ score: number }> = ({ score }) => {
    // Handle invalid score
    if (typeof score !== 'number' || isNaN(score)) {
        return (
            <div className="relative w-16 h-16 flex-shrink-0 flex items-center justify-center bg-gray-800 rounded-full border border-gray-700" aria-label="AI 신뢰도: 정보 없음">
                <span className="text-gray-500 text-xs font-bold">N/A</span>
            </div>
        );
    }

    const percentage = Math.max(0, Math.min(100, score));
    const radius = 24;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    let colorClass = 'text-green-400';
    if (score < 80) colorClass = 'text-yellow-400';
    if (score < 60) colorClass = 'text-red-400';

    return (
        <div className="relative w-16 h-16 flex-shrink-0" aria-label={`AI 신뢰도: ${score.toFixed(0)}점`}>
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
                <span className={`text-xl font-bold ${colorClass}`}>{Math.round(score)}</span>
            </div>
        </div>
    );
};


interface StrategyPlaybookCardProps {
    playbook: StrategyPlaybook;
    onSelect: () => void;
}

export const StrategyPlaybookCard: React.FC<StrategyPlaybookCardProps> = ({ playbook, onSelect }) => {
    const { stockName, ticker, strategyName, strategySummary, aiConfidence, isUserRecommended, sources } = playbook;

    const borderColor = isUserRecommended ? 'border-purple-500 hover:border-purple-400' : 'border-gray-700 hover:border-cyan-500';

    // FIX: Normalize AI confidence score. The AI may return a value between 0-1 or 0-100.
    // This ensures it's always displayed on a 0-100 scale.
    const normalizedConfidence = (aiConfidence || 0) <= 1 ? (aiConfidence || 0) * 100 : (aiConfidence || 0);

    return (
        <div
            onClick={onSelect}
            className={`bg-gray-800/70 border rounded-xl shadow-lg animate-fade-in transition-all duration-300 cursor-pointer transform hover:-translate-y-1 ${borderColor}`}
        >
            <header className="p-4 bg-gray-900/50 rounded-t-xl">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-xl font-bold text-white">{formatStockDisplay(stockName, ticker)}</h3>
                    </div>
                    <div className="text-center">
                        <ConfidenceGauge score={normalizedConfidence} />
                        <p className="text-xs font-bold text-gray-400 mt-1">AI 신뢰도</p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-2 items-center">
                    <span className="flex items-center gap-1 px-2 py-1 text-xs font-bold rounded-md bg-cyan-800 text-cyan-200">
                        <SparklesIcon className="h-4 w-4" />
                        <span>{strategyName}</span>
                    </span>
                    {isUserRecommended && (
                        <div title="사용자 관심종목 기반 신호" className="flex items-center gap-1 px-2 py-1 text-xs font-bold rounded-md bg-purple-800 text-purple-200">
                            <HandshakeIcon className="h-4 w-4" />
                            <span>사용자 관심종목</span>
                        </div>
                    )}
                    {sources && sources.length > 0 && (
                        <div className="flex items-center gap-1" title={`신호 출처: ${sources.join(', ')}`}>
                            {sources.map(source => <SignalSourceIcon key={source} source={source} className="h-4 w-4" />)}
                        </div>
                    )}
                </div>
            </header>
            <div className="p-4 space-y-4">
                <div className="p-3 bg-gray-900/40 rounded-lg border-l-4 border-cyan-500">
                    <h4 className="font-bold text-cyan-300 mb-1 flex items-center gap-2"><BrainIcon className="h-5 w-5" /> AI 분석 요약</h4>
                    <p className="text-sm text-gray-300">{strategySummary || "AI 분석 요약이 제공되지 않았습니다."}</p>
                </div>
            </div>
        </div>
    );
};