import React from 'react';
import type { CatalystStrengthAnalysis } from '../types';
import { FireIcon, SparklesIcon, TrendingUpIcon, BrainIcon } from './icons';

interface CatalystStrengthAnalyzerProps {
    analysis: CatalystStrengthAnalysis;
}

const ScoreGauge: React.FC<{ score: number; label: string }> = ({ score, label }) => {
    const percentage = Math.max(0, Math.min(100, score));
    const radius = 28;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    let colorClass = 'text-green-400';
    if (score < 75) colorClass = 'text-yellow-400';
    if (score < 50) colorClass = 'text-red-400';

    return (
        <div className="flex flex-col items-center">
            <div className="relative w-20 h-20 flex items-center justify-center">
                <svg className="w-full h-full" viewBox="0 0 64 64">
                    <circle className="text-gray-700" strokeWidth="6" stroke="currentColor" fill="transparent" r={radius} cx="32" cy="32" />
                    <circle
                        className={colorClass}
                        strokeWidth="6"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="transparent"
                        r={radius}
                        cx="32"
                        cy="32"
                        style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dashoffset 0.5s ease-in-out' }}
                    />
                </svg>
                <span className={`absolute text-xl font-bold ${colorClass}`}>{score}</span>
            </div>
            <p className="text-sm font-semibold text-gray-300 mt-2">{label}</p>
        </div>
    );
};

export const CatalystStrengthAnalyzer: React.FC<CatalystStrengthAnalyzerProps> = ({ analysis }) => {
    if (!analysis) return null;

    const { strength, persistence, virality, summary } = analysis;

    return (
        <div className="bg-gray-800/60 rounded-lg border border-gray-700 p-4 space-y-6">
            <header className="text-center">
                <h3 className="text-xl font-bold text-gray-100">재료 강도 & 지속성 분석기</h3>
                <p className="text-sm text-gray-400">재료의 '양'이 아닌 '질'을 평가합니다.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div className="bg-gray-900/40 p-3 rounded-lg">
                     <div className="flex items-center justify-center gap-2 text-sm font-semibold text-red-300 mb-2"><FireIcon /><span>강도</span></div>
                    <ScoreGauge score={strength} label="Strength" />
                </div>
                <div className="bg-gray-900/40 p-3 rounded-lg">
                    <div className="flex items-center justify-center gap-2 text-sm font-semibold text-green-300 mb-2"><TrendingUpIcon /><span>지속성</span></div>
                    <ScoreGauge score={persistence} label="Persistence" />
                </div>
                <div className="bg-gray-900/40 p-3 rounded-lg">
                    <div className="flex items-center justify-center gap-2 text-sm font-semibold text-blue-300 mb-2"><SparklesIcon /><span>확산성</span></div>
                    <ScoreGauge score={virality} label="Virality" />
                </div>
            </div>
            
            <div className="bg-gray-900/40 p-4 rounded-lg border-l-4 border-purple-500/80">
                <div className="flex items-center gap-3 mb-2">
                    <BrainIcon className="h-6 w-6 text-purple-400" />
                    <h4 className="font-bold text-purple-300">AI 종합 평가</h4>
                </div>
                <p className="text-gray-300 text-sm">{summary}</p>
            </div>

        </div>
    );
};