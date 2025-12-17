

import React from 'react';
import type { CatalystAnalysis, CatalystItem, QualitativeRisk } from '../types';
import { CatalystIcon, NarrativeIcon, QualitativeRiskIcon, StrategyIcon } from './icons';

interface CatalystAnalyzerProps {
    analysis: CatalystAnalysis;
}

const sentimentConfig = {
    '긍정적': 'bg-green-500/20 text-green-300 border-green-500/30',
    '중립': 'bg-gray-500/20 text-gray-300 border-gray-500/30',
    '부정적': 'bg-red-500/20 text-red-300 border-red-500/30',
};

export const CatalystAnalyzer: React.FC<CatalystAnalyzerProps> = ({ analysis }) => {
    if (!analysis) return null;
    
    const sentimentStyle = sentimentConfig[analysis.narrativeSentiment] || sentimentConfig['중립'];

    return (
        <div className="bg-gray-800/60 rounded-lg border border-gray-700 p-4 space-y-6">
            <header className="text-center">
                 <h3 className="text-xl font-bold text-gray-100">미래 성장 촉매제 & 내러티브 분석</h3>
                 <p className="text-sm text-gray-400">대가의 영역: 숫자를 넘어 이야기와 미래를 봅니다.</p>
            </header>

            {/* Narrative Section */}
            <div className="bg-gray-900/40 p-4 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                    <NarrativeIcon />
                    <h4 className="font-bold text-indigo-300">시장 내러티브</h4>
                    <span className={`ml-auto px-2 py-0.5 text-xs font-semibold rounded-full border ${sentimentStyle}`}>
                        {analysis.narrativeSentiment}
                    </span>
                </div>
                <p className="text-gray-300 text-sm">{analysis.narrativeSummary}</p>
            </div>
            
            {/* Historical Precedent Section */}
            {analysis.historicalPrecedent && (
                 <div className="bg-gray-900/40 p-4 rounded-lg">
                    <div className="flex items-center gap-3 mb-2">
                        <StrategyIcon className="h-6 w-6 text-cyan-400" />
                        <h4 className="font-bold text-cyan-300">과거 데이터 기반 성공 확률 분석</h4>
                    </div>
                    <div className="text-center bg-gray-800/50 p-3 rounded-md">
                         <p className="text-gray-300 text-sm leading-relaxed">{analysis.historicalPrecedent.precedentDescription}</p>
                         <p className="text-3xl font-bold text-cyan-400 mt-2">{analysis.historicalPrecedent.successRate}</p>
                    </div>
                </div>
            )}

            {/* Catalysts Section */}
            {analysis.catalysts && analysis.catalysts.length > 0 && (
                <div className="bg-gray-900/40 p-4 rounded-lg">
                    <div className="flex items-center gap-3 mb-3">
                        <CatalystIcon />
                        <h4 className="font-bold text-purple-300">핵심 성장 촉매제</h4>
                    </div>
                    <div className="space-y-3">
                        {analysis.catalysts?.map((item: CatalystItem, index: number) => (
                            item && (
                                <div key={index} className="pl-4 border-l-2 border-purple-500/50">
                                    <h5 className="font-semibold text-gray-200">{item.catalystTitle}</h5>
                                    <p className="text-gray-400 text-sm">{item.catalystDescription}</p>
                                </div>
                            )
                        ))}
                    </div>
                </div>
            )}

            {/* Qualitative Risks Section */}
            {analysis.qualitativeRisks && analysis.qualitativeRisks.length > 0 && (
                <div className="bg-gray-900/40 p-4 rounded-lg">
                     <div className="flex items-center gap-3 mb-3">
                        <QualitativeRiskIcon />
                        <h4 className="font-bold text-orange-300">정성적 리스크 (Scuttlebutt)</h4>
                    </div>
                     <div className="space-y-3">
                        {analysis.qualitativeRisks?.map((item: QualitativeRisk, index: number) => (
                            item && (
                                <div key={index} className="pl-4 border-l-2 border-orange-500/50">
                                    <h5 className="font-semibold text-gray-200">{item.riskTitle}</h5>
                                    <p className="text-gray-400 text-sm">{item.riskDescription}</p>
                                </div>
                            )
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};