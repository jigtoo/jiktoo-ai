import React from 'react';
import type { DossierInsights as DossierInsightsType } from '../types';
import { ChecklistIcon, AlertIcon, InfoIcon } from './icons';

interface DossierInsightsProps {
    insights: DossierInsightsType;
}

export const DossierInsights: React.FC<DossierInsightsProps> = ({ insights }) => {
    const { signalReliability, entryChecklist, commonTraps } = insights;
    
    return (
        <div className="bg-gray-800/70 border border-gray-700 rounded-xl shadow-lg">
             <header className="p-4 bg-gray-900/50 rounded-t-xl text-center">
                 <h3 className="text-xl font-bold text-gray-100">추가 인사이트 & 체크리스트</h3>
            </header>
            <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-3 bg-gray-900/40 rounded-lg">
                    <h4 className="flex items-center gap-2 font-bold text-gray-200 mb-2"><InfoIcon /> 신호 신뢰도</h4>
                    <ul className="space-y-2 text-sm">
                        {signalReliability.map((item, index) => (
                            <li key={index} className="flex justify-between">
                                <span className="text-gray-400">{item.name}</span>
                                <span className="font-semibold text-cyan-300">{item.value}</span>
                            </li>
                        ))}
                    </ul>
                </div>
                 <div className="p-3 bg-gray-900/40 rounded-lg">
                    <h4 className="flex items-center gap-2 font-bold text-gray-200 mb-2"><ChecklistIcon /> 진입 전 체크리스트</h4>
                    <ul className="space-y-2 list-disc list-inside text-sm text-gray-300">
                        {entryChecklist.map((item, index) => (
                            <li key={index}>{item}</li>
                        ))}
                    </ul>
                </div>
                <div className="p-3 bg-gray-900/40 rounded-lg">
                    <h4 className="flex items-center gap-2 font-bold text-gray-200 mb-2"><AlertIcon /> 흔한 함정 & 회피법</h4>
                    <ul className="space-y-3 text-sm">
                        {commonTraps.map((item, index) => (
                            <li key={index}>
                                <p className="font-semibold text-yellow-300">{item.trap}</p>
                                <p className="text-gray-400">→ {item.avoidance}</p>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
};