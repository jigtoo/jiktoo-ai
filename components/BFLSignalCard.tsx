
import React from 'react';
// FIX: Add missing type imports
import type { BFLSignal, ClosingBetEntryPlan, NextDayExitScenarios } from '../types';
import { CheckCircleIcon, XCircleIcon, BrainIcon, CalendarIcon, TrendingUpIcon, StopLossIcon, TargetIcon, LightbulbIcon, InfoIcon } from './icons';

interface BFLSignalCardProps {
    signal: BFLSignal;
    onSelect: (ticker: string, rationale: string, stockName: string) => void;
}

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
    if (score < 75) colorClass = 'text-yellow-400';
    if (score < 50) colorClass = 'text-red-400';

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

const EntryPlanDisplay: React.FC<{ plan?: ClosingBetEntryPlan }> = ({ plan }) => (
    <div className="bg-gray-900/50 p-3 rounded-lg space-y-3 h-full flex flex-col">
        <h4 className="font-bold text-lg text-cyan-300 flex items-center gap-2"><CalendarIcon className="h-5 w-5" />오늘 진입 계획 (15:20~16:00)</h4>
        <div className="flex-grow space-y-2">
            <div>
                <h5 className="font-semibold text-sm text-gray-300">진입 타이밍</h5>
                <p className="text-sm text-gray-400">{plan?.timing || '제공되지 않음'}</p>
            </div>
            <div>
                <h5 className="font-semibold text-sm text-gray-300">진입 전략</h5>
                <p className="text-sm text-gray-400">{plan?.strategy || '제공되지 않음'}</p>
            </div>
        </div>
    </div>
);

const ExitScenariosDisplay: React.FC<{ scenarios?: NextDayExitScenarios }> = ({ scenarios }) => (
    <div className="bg-gray-900/50 p-3 rounded-lg space-y-2 h-full flex flex-col">
        <h4 className="font-bold text-lg text-teal-300 flex items-center gap-2"><TrendingUpIcon className="h-5 w-5" />내일 대응 시나리오 (~09:15)</h4>
        <div className="flex-grow space-y-2">
            <div className="p-2 bg-green-900/30 rounded-md text-xs">
                <strong className="text-green-400">📈 갭상승 시:</strong>
                <p className="text-gray-300">{scenarios?.gapUp || '제공되지 않음'}</p>
            </div>
            <div className="p-2 bg-yellow-900/30 rounded-md text-xs">
                <strong className="text-yellow-400">📉 보합/눌림 시:</strong>
                <p className="text-gray-300">{scenarios?.flat || '제공되지 않음'}</p>
            </div>
            <div className="p-2 bg-red-900/30 rounded-md text-xs">
                <strong className="text-red-400">🚨 갭하락 시:</strong>
                <p className="text-gray-300">{scenarios?.gapDown || '제공되지 않음'}</p>
            </div>
        </div>
    </div>
);


export const BFLSignalCard: React.FC<BFLSignalCardProps> = ({ signal, onSelect }) => {
    const isPriceAvailable = signal.currentPrice && /\d/.test(signal.currentPrice);

    return (
        <div className="bg-gray-800/70 border border-gray-700 rounded-xl shadow-lg animate-fade-in">
            <header className="p-4 flex justify-between items-start gap-4 bg-gray-900/50 rounded-t-xl">
                <div>
                    <h3 className="text-xl font-bold text-white">{signal.stockName}</h3>
                    <p className="font-mono text-gray-400">{signal.ticker}</p>
                    {isPriceAvailable ? (
                        <p className="text-lg font-bold text-cyan-300 mt-1">{signal.currentPrice}</p>
                    ) : (
                        <div className="relative group flex items-center mt-1">
                            <p className="text-lg font-bold text-yellow-400">가격 확인 불가</p>
                            <InfoIcon className="h-4 w-4 text-gray-400 ml-2 cursor-help" />
                            <div className="absolute bottom-full left-0 mb-2 w-64 bg-gray-900 text-white text-xs rounded-lg p-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-lg pointer-events-none">
                                AI가 분석 시점에 종목의 현재가를 가져올 수 없었습니다. 데이터 소스 문제 또는 비정상적인 시장 상황 때문일 수 있습니다.
                            </div>
                        </div>
                    )}
                </div>
                <div className="text-center">
                    <ConfidenceGauge score={signal.aiConfidence} />
                    <p className="text-xs font-bold text-gray-400 mt-1">AI 신뢰도</p>
                </div>
            </header>
            <div className="p-4 space-y-4">
                <div className="p-3 bg-gray-900/40 rounded-lg border-l-4 border-cyan-500">
                    <h4 className="flex items-center gap-2 font-bold text-cyan-300 mb-1"><BrainIcon className="h-5 w-5" />AI 분석 요약</h4>
                    <p className="text-sm text-gray-300">{signal.rationale || "AI 분석 요약이 제공되지 않았습니다. (데이터 부족 또는 분석 실패)"}</p>
                </div>

                <details className="bg-gray-900/40 rounded-lg">
                    <summary className="p-3 font-semibold text-gray-200 cursor-pointer">핵심 조건 체크리스트 보기</summary>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm p-3 border-t border-gray-700">
                        {signal.keyMetrics && signal.keyMetrics.length > 0 ? (
                            signal.keyMetrics.map((metric, idx) => (
                                <div key={`${metric.name}-${idx}`} className="flex items-center gap-2 p-2 bg-gray-800/60 rounded-md">
                                    {metric.isPass ? <CheckCircleIcon className="h-5 w-5 text-green-400 flex-shrink-0" /> : <XCircleIcon className="h-5 w-5 text-red-400 flex-shrink-0" />}
                                    <div className="flex-grow">
                                        <p className="text-gray-400 text-xs">{metric.name}</p>
                                        <p className="font-semibold text-white">{metric.value}</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-gray-500 p-2">체크리스트 데이터가 없습니다.</p>
                        )}
                    </div>
                </details>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <EntryPlanDisplay plan={signal.entryPlan} />
                    <ExitScenariosDisplay scenarios={signal.exitScenarios} />
                </div>

                <button
                    onClick={() => onSelect(signal.ticker, signal.rationale, signal.stockName)}
                    className="w-full mt-2 px-4 py-2 bg-cyan-600 text-white font-semibold rounded-lg shadow-md hover:bg-cyan-700 transition-colors"
                >
                    심층 분석 보기
                </button>
            </div>
        </div>
    );
};
