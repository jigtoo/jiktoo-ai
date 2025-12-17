import React from 'react';
import type { AITraderDiagnosis, AIInvestmentStyle } from '../types';
import { CloseIcon, LogoIcon, CheckCircleIcon, AlertIcon, StrategyIcon } from './icons';
import { LoadingSpinner } from './LoadingSpinner';

interface AITraderDiagnosisModalProps {
    isOpen: boolean;
    onClose: () => void;
    diagnosis: AITraderDiagnosis | null;
    isLoading: boolean;
    investmentStyle: AIInvestmentStyle;
}

const DiagnosisScoreGauge: React.FC<{ score: number }> = ({ score }) => {
    const percentage = Math.max(0, Math.min(100, score));
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    let colorClass = 'text-green-400';
    if (score < 75) colorClass = 'text-yellow-400';
    if (score < 50) colorClass = 'text-red-400';

    return (
        <div className="relative w-24 h-24 flex items-center justify-center">
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
            <span className={`absolute text-2xl font-bold ${colorClass}`}>{score}</span>
        </div>
    );
};

const styleNameMap: Record<AIInvestmentStyle, string> = {
  conservative: '안정형',
  balanced: '균형형',
  aggressive: '공격 성장형'
};

export const AITraderDiagnosisModal: React.FC<AITraderDiagnosisModalProps> = ({ isOpen, onClose, diagnosis, isLoading, investmentStyle }) => {
    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" 
            onClick={onClose}
        >
            <div 
                className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-3xl m-4 flex flex-col" 
                style={{maxHeight: '90vh'}} 
                onClick={e => e.stopPropagation()}
            >
                <header className="p-4 flex justify-between items-center border-b border-gray-700 flex-shrink-0">
                     <div className="flex items-center gap-3">
                        <StrategyIcon className="h-6 w-6 text-teal-400"/>
                        <h2 className="text-xl font-bold text-white">
                            AI 트레이더 자가 진단 리포트 ({styleNameMap[investmentStyle]})
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-600">
                        <CloseIcon className="h-6 w-6" />
                    </button>
                </header>
                
                <div className="p-6 overflow-y-auto">
                   {isLoading && <LoadingSpinner message="AI 수석 전략가가 현재 전략을 분석하고 있습니다..." />}
                   {!isLoading && diagnosis && (
                        <div className="space-y-6">
                            <div className="flex flex-col md:flex-row items-center gap-6 p-4 bg-gray-800/50 rounded-lg">
                                <div className="flex-shrink-0">
                                    <h4 className="text-base font-bold text-gray-300 mb-2 text-center">전략 점수</h4>
                                    <DiagnosisScoreGauge score={diagnosis.diagnosisScore} />
                                </div>
                                <div>
                                     <h4 className="flex items-center gap-2 text-base font-bold text-gray-300 mb-2">
                                        <LogoIcon className="h-5 w-5" />
                                        수석 전략가 종합 진단
                                    </h4>
                                    <div className="text-gray-300 text-sm bg-gray-900/40 p-3 rounded-md border-l-4 border-cyan-500">
                                        <p className="leading-relaxed">{diagnosis.summary}</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Strengths */}
                                <div className="space-y-3">
                                    <h4 className="text-lg font-bold text-green-400">강점</h4>
                                    <ul className="space-y-2">
                                        {diagnosis.strengths.map((item, index) => (
                                            <li key={index} className="flex items-start gap-3">
                                                <CheckCircleIcon className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5"/>
                                                <span className="text-gray-300 text-sm">{item}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                {/* Weaknesses */}
                                <div className="space-y-3">
                                    <h4 className="text-lg font-bold text-yellow-400">약점</h4>
                                     <ul className="space-y-2">
                                        {diagnosis.weaknesses.map((item, index) => (
                                            <li key={index} className="flex items-start gap-3">
                                                <AlertIcon className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5"/>
                                                <span className="text-gray-300 text-sm">{item}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>

                            {/* Recommendations */}
                            <div className="space-y-4 pt-6 border-t border-gray-700">
                                <h4 className="text-xl font-bold text-center text-teal-300">AI 전략 제안</h4>
                                {diagnosis.recommendations.map((item, index) => (
                                    <div key={index} className="bg-gray-800/60 p-4 rounded-lg border border-gray-700">
                                        <h5 className="flex items-center gap-2 font-bold text-gray-100 mb-1">
                                            <StrategyIcon className="h-5 w-5 text-teal-400"/>
                                            {item.title}
                                        </h5>
                                        <p className="text-gray-300 text-sm pl-7">{item.description}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                   )}
                </div>
            </div>
        </div>
    );
};
