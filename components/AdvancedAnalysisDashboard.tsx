
// components/AdvancedAnalysisDashboard.tsx
import React, { useState } from 'react';
// FIX: Added missing type imports
import type { ChiefAnalystInsightResult, MultiDimensionalAnalysis, CreativeConnectionMatrix, IntegratedWisdom } from '../types';
import { BrainIcon } from './icons';

interface AdvancedAnalysisDashboardProps {
    advancedData: {
        chiefAnalystInsight: ChiefAnalystInsightResult;
        multiDimensional: MultiDimensionalAnalysis;
        creativeConnections: CreativeConnectionMatrix;
        integratedWisdom: IntegratedWisdom;
        finalRecommendation: string;
        confidenceScore: number;
    };
}

const ScoreGauge: React.FC<{ score: number }> = ({ score }) => {
    const percentage = Math.max(0, Math.min(100, score || 0));
    const radius = 32;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    let colorClass = 'text-green-400';
    if (score < 75) colorClass = 'text-yellow-400';
    if (score < 50) colorClass = 'text-red-400';

    return (
        <div className="relative w-24 h-24 flex items-center justify-center">
            {/* FIX: Removed reference to undefined 'config' variable which was causing a crash. */}
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
                    style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dashoffset 0.8s ease-out' }}
                />
            </svg>
            <span className={`absolute text-2xl font-bold ${colorClass}`}>{Math.round(score || 0)}</span>
        </div>
    );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-gray-800 rounded p-4">
        <h4 className="font-semibold text-cyan-400 mb-2">{title}</h4>
        <div className="text-gray-300 text-sm space-y-2">{children}</div>
    </div>
);


export const AdvancedAnalysisDashboard: React.FC<AdvancedAnalysisDashboardProps> = ({ advancedData }) => {
    const [activeTab, setActiveTab] = useState<'insight' | 'details'>('insight');
    
    if (!advancedData) return null;

    const { chiefAnalystInsight, multiDimensional, creativeConnections, integratedWisdom, finalRecommendation } = advancedData;

    const TabButton: React.FC<{ tabId: 'insight' | 'details', children: React.ReactNode }> = ({ tabId, children }) => (
        <button
            onClick={() => setActiveTab(tabId)}
            className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tabId ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
        >
            {children}
        </button>
    );

    return (
        <div className="mt-8 space-y-6 animate-fade-in">
            <div className="bg-gradient-to-r from-purple-900 via-blue-900 to-gray-900 rounded-lg p-6 border border-cyan-500/30">
                <div className="flex items-center gap-4 mb-4">
                    <BrainIcon className="h-10 w-10 text-cyan-300"/>
                    <div>
                         <h2 className="text-2xl font-bold text-white">수석 AI 애널리스트 브리핑</h2>
                         <p className="text-gray-300">10가지 사고 공식에 기반한 심층 분석 결과입니다.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="flex flex-col items-center text-center">
                        <ScoreGauge score={chiefAnalystInsight.score} />
                        <h4 className="font-semibold text-white text-sm mt-2">🧠 핵심 통찰 점수</h4>
                        <p className="text-xs text-gray-400">AI가 여러 정보를 종합하여 핵심을 꿰뚫는 능력</p>
                    </div>
                     <div className="flex flex-col items-center text-center">
                        <ScoreGauge score={multiDimensional.score} />
                        <h4 className="font-semibold text-white text-sm mt-2">🌐 입체적 분석 점수</h4>
                        <p className="text-xs text-gray-400">시간, 공간, 인과 등 다양한 관점에서 분석하는 능력</p>
                    </div>
                     <div className="flex flex-col items-center text-center">
                        <ScoreGauge score={creativeConnections.score} />
                        <h4 className="font-semibold text-white text-sm mt-2">🔗 연결고리 발견 점수</h4>
                        <p className="text-xs text-gray-400">숨겨진 데이터 간의 연관성을 찾아내는 능력</p>
                    </div>
                    <div className="flex flex-col items-center text-center">
                        <ScoreGauge score={integratedWisdom.score} />
                        <h4 className="font-semibold text-white text-sm mt-2">⚖️ 최종 판단 신뢰도</h4>
                        <p className="text-xs text-gray-400">지식, 이해, 지혜를 통합하여 균형잡힌 결론을 내리는 능력</p>
                    </div>
                </div>

                <div className="bg-gray-800/50 p-4 rounded-lg border-l-4 border-orange-400">
                    <h3 className="font-bold text-orange-300 mb-2">최종 결론 및 실행 계획</h3>
                    <p className="text-gray-200 leading-relaxed whitespace-pre-wrap">{finalRecommendation}</p>
                </div>
            </div>

            <div className="flex space-x-1 bg-gray-800 rounded-lg p-1">
                <TabButton tabId="insight">🧠 핵심 통찰 분석</TabButton>
                <TabButton tabId="details">📊 상세 분석 데이터</TabButton>
            </div>

            {activeTab === 'insight' && (
                <Section title="통찰 분석 상세">
                    <p><strong>핵심 통찰:</strong> {chiefAnalystInsight.insight}</p>
                    <p><strong>점수 산정 근거:</strong> {chiefAnalystInsight.reasoning}</p>
                </Section>
            )}
            
             {activeTab === 'details' && (
                <div className="space-y-4">
                    <Section title="입체적 분석 (MDA)">
                        <p>{multiDimensional.insights.join(' ')}</p>
                    </Section>
                    <Section title="연결고리 발견 (CC)">
                         <p><strong>공통점:</strong> {creativeConnections.intersection.join(', ')}</p>
                         <p><strong>차이점:</strong> {creativeConnections.difference.join(', ')}</p>
                         <p><strong>전이효과:</strong> {creativeConnections.transfer.join(', ')}</p>
                    </Section>
                </div>
            )}
        </div>
    );
};
