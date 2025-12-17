import React from 'react';
import type { IchimokuAnalysis as IchimokuAnalysisType } from '../types';
import { CloudIcon, CheckCircleIcon, AlertIcon, TrendingUpIcon, EyeIcon } from './icons';

interface IchimokuAnalysisProps {
    analysis: IchimokuAnalysisType;
}

const ScoreGauge: React.FC<{ score: number }> = ({ score }) => {
    const percentage = Math.max(0, Math.min(100, score));
    const radius = 32;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    let colorClass = 'text-green-400';
    if (score < 70) colorClass = 'text-yellow-400';
    if (score < 40) colorClass = 'text-red-400';

    return (
        <div className="relative w-20 h-20 flex items-center justify-center flex-shrink-0">
            <svg className="w-full h-full" viewBox="0 0 72 72">
                <circle className="text-gray-700" strokeWidth="6" stroke="currentColor" fill="transparent" r={radius} cx="36" cy="36" />
                <circle
                    className={colorClass}
                    strokeWidth="6"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r={radius}
                    cx="36"
                    cy="36"
                    style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dashoffset 0.5s ease-in-out' }}
                />
            </svg>
            <span className={`absolute text-xl font-bold ${colorClass}`}>{score}</span>
        </div>
    );
};

const AnalysisItem: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
    <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-1 text-teal-400">{icon}</div>
        <div>
            <p className="font-semibold text-gray-200">{label}</p>
            <p className="text-sm text-gray-400">{value}</p>
        </div>
    </div>
);

export const IchimokuAnalysis: React.FC<IchimokuAnalysisProps> = ({ analysis }) => {
    if (!analysis) return null;

    return (
        <div className="bg-gray-800/60 rounded-lg border border-gray-700 p-4 space-y-4">
            <header className="text-center">
                <h3 className="text-xl font-bold text-gray-100">AI 일목균형표 분석</h3>
                <p className="text-sm text-gray-400">추세의 방향, 강도, 미래를 한눈에 파악합니다.</p>
            </header>
            
            <div className="bg-gray-900/40 p-4 rounded-lg flex flex-col sm:flex-row items-center justify-center gap-4 text-center sm:text-left">
                <div>
                    <h4 className="font-bold text-teal-300 mb-1">추세 건강 점수</h4>
                    <p className="text-xs text-gray-400 max-w-xs">{analysis.summary}</p>
                </div>
                <ScoreGauge score={analysis.trendHealthScore} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-900/40 p-4 rounded-lg space-y-3">
                    <h4 className="font-bold text-teal-300">현재 상태 진단</h4>
                    <AnalysisItem icon={<TrendingUpIcon className="h-5 w-5"/>} label="추세 방향" value={analysis.currentState.trend} />
                    <AnalysisItem icon={<CheckCircleIcon className="h-5 w-5"/>} label="모멘텀" value={analysis.currentState.momentum} />
                    <AnalysisItem icon={<AlertIcon className="h-5 w-5"/>} label="저항 유무" value={analysis.currentState.resistance} />
                </div>
                 <div className="bg-gray-900/40 p-4 rounded-lg space-y-3">
                    <h4 className="font-bold text-teal-300">미래 예측</h4>
                    <AnalysisItem icon={<EyeIcon className="h-5 w-5"/>} label="지지/저항" value={analysis.futureForecast.supportResistance} />
                    <AnalysisItem icon={<CloudIcon className="h-5 w-5"/>} label="추세 변화" value={analysis.futureForecast.trendChangeWarning} />
                </div>
            </div>
        </div>
    );
};
