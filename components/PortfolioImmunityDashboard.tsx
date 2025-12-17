// components/PortfolioImmunityDashboard.tsx
import React from 'react';
import type { PortfolioImmunityAnalysis } from '../types';
import { ShieldCheckIcon, BrainIcon } from './icons';

interface PortfolioImmunityDashboardProps {
    analysis: PortfolioImmunityAnalysis;
    onSelectStock: (ticker: string, rationale: string, stockName: string) => void;
}

const RiskGauge: React.FC<{ score: number }> = ({ score }) => {
    const percentage = Math.max(0, Math.min(100, score));
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - ((100 - percentage) / 100) * circumference;

    let colorClass = 'text-green-400';
    let textLabel = '낮음';
    if (score >= 40) {
        colorClass = 'text-yellow-400';
        textLabel = '주의';
    }
    if (score >= 70) {
        colorClass = 'text-red-400';
        textLabel = '높음';
    }

    return (
        <div className="relative w-28 h-28 flex-shrink-0" aria-label={`쏠림 위험도: ${score}점, ${textLabel}`}>
            <svg className="w-full h-full" viewBox="0 0 90 90">
                <circle className="text-gray-700" strokeWidth="8" stroke="currentColor" fill="transparent" r={radius} cx="45" cy="45" />
                <circle
                    className={colorClass}
                    strokeWidth="8"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r={radius}
                    cx="45"
                    cy="45"
                    style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dashoffset 0.5s ease-in-out' }}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-3xl font-bold ${colorClass}`}>{score}</span>
                <span className={`text-sm font-semibold ${colorClass}`}>{textLabel}</span>
            </div>
        </div>
    );
};


export const PortfolioImmunityDashboard: React.FC<PortfolioImmunityDashboardProps> = ({ analysis, onSelectStock }) => {
    if (!analysis) return null;

    const { concentrationRiskScore, summary, counterNarrativePick } = analysis;

    return (
        <div className="bg-gray-800/60 rounded-lg border border-gray-700 p-4 space-y-4">
            <header className="text-center">
                <h3 className="text-xl font-bold text-gray-100 flex items-center justify-center gap-2">
                    <ShieldCheckIcon className="h-6 w-6 text-cyan-400"/>
                    AI 포트폴리오 면역 시스템
                </h3>
            </header>
            
            <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-gray-900/40 rounded-lg">
                <div className="text-center">
                    <p className="text-sm font-semibold text-gray-300 mb-1">테마 쏠림 위험도</p>
                    <RiskGauge score={concentrationRiskScore} />
                </div>
                <div className="flex-grow">
                    <h4 className="flex items-center gap-2 font-bold text-cyan-300 mb-1"><BrainIcon className="h-5 w-5"/>AI 진단 요약</h4>
                    <p className="text-sm text-gray-300">{summary}</p>
                </div>
            </div>
            
            {counterNarrativePick && (
                <div className="bg-gray-900/40 p-4 rounded-lg border-l-4 border-purple-500">
                    <h4 className="font-bold text-purple-300 mb-2">대안적 관점: 비주류 유망주</h4>
                    <p className="text-sm text-gray-400 mb-3">현재 주류 테마와 다른 방향에서 기회를 모색하는 종목입니다. 포트폴리오 다각화를 위해 참고하세요.</p>
                    <div className="bg-gray-800/60 p-3 rounded-lg flex flex-col sm:flex-row justify-between items-start gap-3">
                        <div>
                            <h5 className="text-lg font-bold text-white">{counterNarrativePick.stockName}</h5>
                            <p className="font-mono text-sm text-gray-500">{counterNarrativePick.ticker}</p>
                            <p className="text-xs text-gray-300 mt-2">{counterNarrativePick.rationale}</p>
                        </div>
                        <button 
                             onClick={() => onSelectStock(counterNarrativePick.ticker, counterNarrativePick.rationale, counterNarrativePick.stockName)}
                            className="w-full sm:w-auto flex-shrink-0 px-4 py-2 bg-purple-600 text-white text-sm font-semibold rounded-lg hover:bg-purple-700 transition-colors"
                            aria-label={`${counterNarrativePick.stockName} 심층 분석`}
                        >
                            심층 분석
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};