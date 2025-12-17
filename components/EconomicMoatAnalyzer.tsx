
import React from 'react';
import type { EconomicMoatAnalysis } from '../types';
import { CastleIcon, CheckCircleIcon } from './icons';

interface EconomicMoatAnalyzerProps {
    analysis: EconomicMoatAnalysis;
}

export const EconomicMoatAnalyzer: React.FC<EconomicMoatAnalyzerProps> = ({ analysis }) => {
    if (!analysis) return null;
    
    const { rating, ratingReason, sources, sustainability } = analysis;

    const ratingConfig = {
        'Wide': { text: '넓음', color: 'bg-green-500 text-white' },
        'Narrow': { text: '좁음', color: 'bg-yellow-500/20 text-yellow-300' },
        'None': { text: '없음', color: 'bg-red-500 text-white' }
    };
    
    const currentRating = ratingConfig[rating] || { text: rating, color: 'bg-gray-500 text-white' };

    return (
        <div className="bg-gray-800/60 rounded-lg border border-gray-700 p-4 space-y-6">
            <header className="text-center">
                 <h3 className="text-xl font-bold text-gray-100">경제적 해자(Moat) 분석</h3>
                 <p className="text-sm text-gray-400">기업의 이익을 10년 이상 지켜줄 수 있는가?</p>
            </header>

            <div className="bg-gray-900/40 p-4 rounded-lg text-center">
                <h4 className="font-bold text-teal-300 mb-2">해자 등급</h4>
                <div className={`inline-block px-4 py-2 text-lg font-bold rounded-md ${currentRating.color}`}>
                    {currentRating.text}
                </div>
                <p className="text-sm text-gray-400 mt-2 italic">"{ratingReason}"</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-900/40 p-4 rounded-lg">
                    <h4 className="font-bold text-teal-300 mb-3">해자의 원천</h4>
                    <ul className="space-y-2">
                        {sources.map((source, index) => (
                            <li key={index} className="flex items-center gap-2 text-sm text-gray-200">
                                <CheckCircleIcon className="h-5 w-5 text-green-400 flex-shrink-0" />
                                <span>{source}</span>
                            </li>
                        ))}
                    </ul>
                </div>
                 <div className="bg-gray-900/40 p-4 rounded-lg">
                    <h4 className="font-bold text-teal-300 mb-2">해자의 지속가능성</h4>
                    <p className="text-sm text-gray-300">{sustainability}</p>
                </div>
            </div>
        </div>
    );
};
