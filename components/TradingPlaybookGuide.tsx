import React from 'react';
import type { TradingPlaybook } from '../types';
import { StrategyIcon, CheckCircleIcon, XCircleIcon } from './icons';

interface TradingPlaybookGuideProps {
    playbook: TradingPlaybook;
}

export const TradingPlaybookGuide: React.FC<TradingPlaybookGuideProps> = ({ playbook }) => {
    const { strategyName, strategyType, description, entryConditions, exitConditions } = playbook;

    return (
        <div className="bg-gray-800/70 border border-gray-700 rounded-xl shadow-lg">
            <header className="p-4 bg-gray-900/50 rounded-t-xl text-center">
                 <h3 className="text-xl font-bold text-gray-100">AI 추천 플레이북: {strategyName}</h3>
                 <span className="px-2 py-1 mt-1 inline-block bg-gray-700 text-gray-300 text-xs font-bold rounded-full">{strategyType}</span>
            </header>
            <div className="p-4 space-y-4">
                <div className="p-3 bg-gray-900/40 rounded-lg border-l-4 border-cyan-500">
                    <h4 className="flex items-center gap-2 font-bold text-cyan-300 mb-1">
                        <StrategyIcon className="h-5 w-5" /> AI 전략 요약
                    </h4>
                    <p className="text-sm text-gray-300">{description}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3 bg-green-900/30 rounded-lg">
                        <h4 className="font-bold text-green-300 mb-2">진입 조건</h4>
                        <ul className="space-y-2">
                            {entryConditions.map((condition, index) => (
                                <li key={index} className="flex items-start gap-2 text-sm text-gray-200">
                                    <CheckCircleIcon className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                                    <span>{condition}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="p-3 bg-red-900/30 rounded-lg">
                        <h4 className="font-bold text-red-300 mb-2">청산/손절 조건</h4>
                         <ul className="space-y-2">
                            {exitConditions.map((condition, index) => (
                                <li key={index} className="flex items-start gap-2 text-sm text-gray-200">
                                    <XCircleIcon className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                                    <span>{condition}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};