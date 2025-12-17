import React from 'react';
import type { PreMortemAnalysis } from '../types';
import { RiskIcon, AlertIcon, ShieldCheckIcon } from './icons';

interface PreMortemAnalyzerProps {
    analysis: PreMortemAnalysis;
}

export const PreMortemAnalyzer: React.FC<PreMortemAnalyzerProps> = ({ analysis }) => {
    if (!analysis) return null;
    
    return (
        <div className="bg-gray-800/60 rounded-lg border border-gray-700 p-4 space-y-6">
            <header className="text-center">
                 <h3 className="text-xl font-bold text-gray-100">AI Pre-Mortem & 방어 계획</h3>
                 <p className="text-sm text-gray-400">수익보다 중요한 것은 손실을 막는 것입니다.</p>
            </header>

            <div className="bg-gray-900/40 p-4 rounded-lg border-l-4 border-yellow-500/80">
                <div className="flex items-center gap-3 mb-2">
                    <RiskIcon />
                    <h4 className="font-bold text-yellow-300">"만약 우리의 분석이 틀렸다면?" (실패 시나리오)</h4>
                </div>
                <p className="text-gray-300 text-sm">{analysis.failureScenario}</p>
            </div>
            
            <div className="bg-gray-900/40 p-4 rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                    <AlertIcon />
                    <h4 className="font-bold text-orange-300">주목해야 할 실패 신호 (Tripwires)</h4>
                </div>
                <ul className="space-y-2 list-disc list-inside">
                    {analysis.failureSignals?.map((signal, index) => (
                        signal && (
                            <li key={index} className="text-sm text-gray-300">
                                {signal}
                            </li>
                        )
                    ))}
                </ul>
            </div>

            <div className="bg-gray-900/40 p-4 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                    <ShieldCheckIcon />
                    <h4 className="font-bold text-green-300">AI 방어 전략 (자본 보존 프로토콜)</h4>
                </div>
                <p className="text-gray-300 text-sm whitespace-pre-wrap">{analysis.defensiveStrategy}</p>
            </div>
        </div>
    );
};