import React from 'react';
import type { PsychologyAnalysis } from '../types';
import { BrainIcon, ScaleIcon, ThermometerIcon, PulseIcon } from './icons';

interface PsychologyAnalyzerProps {
    analysis: PsychologyAnalysis;
}

const Section: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode;}> = ({ icon, title, children }) => (
    <div className="bg-gray-900/40 p-4 rounded-lg">
        <div className="flex items-center gap-3 mb-2">
            {icon}
            <h4 className="font-bold text-purple-300">{title}</h4>
        </div>
        <div className="text-gray-300 text-sm space-y-2">{children}</div>
    </div>
);

export const PsychologyAnalyzer: React.FC<PsychologyAnalyzerProps> = ({ analysis }) => {
    if (!analysis) return null;
    
    const { confidenceScore, confidenceReason, fearGreed, marketNarrative, psychologicalPattern, mediaThermometer } = analysis;

    return (
        <div className="bg-gray-800/60 rounded-lg border border-gray-700 p-4 space-y-6">
            <header className="text-center">
                 <h3 className="text-xl font-bold text-gray-100">시장 심리 나침반</h3>
                 <p className="text-sm text-gray-400">숫자를 넘어 시장의 감정과 이야기를 읽습니다.</p>
            </header>

            <div className="bg-gray-900/50 p-3 rounded-lg text-center">
                <p className="text-sm font-semibold text-gray-400">분석 신뢰도</p>
                <p className="text-3xl font-bold text-cyan-300 my-1">{confidenceScore}<span className="text-lg">/100</span></p>
                <p className="text-xs text-gray-500 italic">"{confidenceReason}"</p>
            </div>

            <Section icon={<PulseIcon className="h-5 w-5 text-purple-400" />} title="두려움 & 탐욕 분석">
                <p>{fearGreed?.summary}</p>
            </Section>
            
            <Section icon={<ScaleIcon className="h-5 w-5 text-purple-400" />} title="시장 내러티브 (주도 세력 vs 반대 세력)">
                <div className="pl-4 border-l-2 border-green-500/50 mb-3">
                    <h5 className="font-semibold text-green-300">주도 세력의 논리 (Protagonist)</h5>
                    <p className="text-gray-400 text-xs">{marketNarrative?.protagonist}</p>
                </div>
                 <div className="pl-4 border-l-2 border-red-500/50">
                    <h5 className="font-semibold text-red-300">반대 세력의 논리 (Antagonist)</h5>
                    <p className="text-gray-400 text-xs">{marketNarrative?.antagonist}</p>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-700/50">
                    <h5 className="font-semibold text-cyan-300">현재 전황</h5>
                    <p className="text-gray-400 text-xs">{marketNarrative?.battleSummary}</p>
                </div>
            </Section>

            <Section icon={<BrainIcon className="h-5 w-5 text-purple-400" />} title="심리적 차트 패턴">
                <h5 className="font-semibold text-gray-200">{psychologicalPattern?.patternName}</h5>
                <p className="text-gray-400 text-xs">{psychologicalPattern?.description}</p>
            </Section>

            <Section icon={<ThermometerIcon className="h-5 w-5 text-purple-400" />} title="미디어 온도계">
                 <h5 className="font-semibold text-gray-200">{mediaThermometer?.level}</h5>
                 <p className="text-gray-400 text-xs">{mediaThermometer?.reason}</p>
            </Section>
        </div>
    );
};