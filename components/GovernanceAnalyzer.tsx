import React from 'react';
import type { GovernanceAnalysis } from '../types';
import { HandshakeIcon, CheckCircleIcon, AlertIcon } from './icons';

interface GovernanceAnalyzerProps {
    analysis: GovernanceAnalysis;
}

const ScoreGauge: React.FC<{ score: number }> = ({ score }) => {
    const percentage = Math.max(0, Math.min(100, score));
    let colorClass = 'text-green-400';
    if (score < 75) colorClass = 'text-yellow-400';
    if (score < 50) colorClass = 'text-red-400';

    return (
        <div className={`relative inline-flex items-center justify-center text-4xl font-bold ${colorClass}`}>
            {score}
            <span className="text-lg text-gray-400">/100</span>
        </div>
    );
};

export const GovernanceAnalyzer: React.FC<GovernanceAnalyzerProps> = ({ analysis }) => {
    if (!analysis) return null;

    const { score, summary, positiveFactors, negativeFactors } = analysis;

    return (
        <div className="bg-gray-800/60 rounded-lg border border-gray-700 p-4 space-y-6">
            <header className="text-center">
                 <h3 className="text-xl font-bold text-gray-100">지배구조 및 주주환원 분석</h3>
                 <p className="text-sm text-gray-400">'코리아 디스카운트'의 핵심, 주주와 함께 성장하는 기업인가?</p>
            </header>

            <div className="bg-gray-900/40 p-4 rounded-lg text-center">
                <h4 className="font-bold text-teal-300 mb-2">종합 점수</h4>
                <ScoreGauge score={score} />
                <p className="text-sm text-gray-400 mt-2 italic">"{summary}"</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-900/40 p-4 rounded-lg">
                    <h4 className="font-bold text-green-300 mb-3">긍정적 요인</h4>
                    <ul className="space-y-2">
                        {positiveFactors.map((factor, index) => (
                            <li key={index} className="flex items-start gap-2 text-sm text-gray-200">
                                <CheckCircleIcon className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                                <span>{factor}</span>
                            </li>
                        ))}
                    </ul>
                </div>
                 <div className="bg-gray-900/40 p-4 rounded-lg">
                    <h4 className="font-bold text-red-300 mb-3">부정적 요인</h4>
                    <ul className="space-y-2">
                        {negativeFactors.map((factor, index) => (
                            <li key={index} className="flex items-start gap-2 text-sm text-gray-200">
                                <AlertIcon className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                                <span>{factor}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
};