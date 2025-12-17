import React from 'react';
import type { AlertExplanationLog } from '../types';
import { LightbulbIcon, BrainIcon } from './icons';

const ExplanationItem: React.FC<{ log: AlertExplanationLog }> = ({ log }) => {
    return (
        <div className="bg-gray-800/60 p-4 rounded-lg border border-gray-700 space-y-4">
            {/* Main explanation */}
            <div className="bg-gray-900/50 p-3 rounded-lg border-l-4 border-yellow-500">
                <div className="flex justify-between items-start">
                    <h4 className="flex items-center gap-2 font-bold text-yellow-300 mb-1">
                        <BrainIcon className="h-5 w-5" />
                        AI 판단 요약 (XAI)
                    </h4>
                    <div className="text-right">
                        <p className="text-xs text-gray-400">토픽 유사도</p>
                        <p className="font-bold text-lg text-yellow-300">{(log.similarity_score * 100).toFixed(1)}%</p>
                    </div>
                </div>
                <p className="text-sm text-gray-200 italic mt-1">"{log.explanation}"</p>
            </div>
            
            {/* Keywords */}
            <div>
                <h5 className="text-sm font-semibold text-gray-300 mb-2">핵심 판단 근거 키워드</h5>
                <div className="flex flex-wrap gap-2">
                    {log.top_keywords.map(keyword => (
                        <span key={keyword} className="px-2 py-1 bg-cyan-900/70 text-cyan-300 text-xs font-semibold rounded-md">
                            {keyword}
                        </span>
                    ))}
                </div>
            </div>

            {/* Supporting Sentences */}
            <div>
                 <h5 className="text-sm font-semibold text-gray-300 mb-2">근거 문장 (데이터 출처)</h5>
                 <div className="space-y-2 text-sm text-gray-400 pl-4 border-l-2 border-gray-600">
                    {log.supporting_sentences.map((sentence, index) => (
                        <blockquote key={index} className="italic">"{sentence}"</blockquote>
                    ))}
                 </div>
            </div>
        </div>
    );
};

export const ExplainableAiTracker: React.FC<{ data: AlertExplanationLog[] }> = ({ data }) => {
    return (
        <div>
            <h3 className="text-2xl font-bold text-gray-200 mb-4 border-b-2 border-gray-700 pb-2 flex items-center gap-3">
                <LightbulbIcon className="h-6 w-6 text-yellow-400" />
                <span>5단계: 설명 가능한 판단 근거 (XAI)</span>
            </h3>
            <div className="space-y-6">
                {data.map(log => <ExplanationItem key={log.id} log={log} />)}
            </div>
        </div>
    );
};