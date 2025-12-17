// components/NeutralSignalCard.tsx
import React from 'react';
import type { NeutralSignal } from '../types';
import { AlertIcon, BrainIcon, ShieldCheckIcon } from './icons';

export const NeutralSignalCard: React.FC<{ signal: NeutralSignal }> = ({ signal }) => {
    return (
        <div className="border-2 border-yellow-500 bg-yellow-900/20 rounded-xl shadow-2xl">
            <header className="p-3 text-center flex flex-col items-center">
                <p className="text-sm font-bold text-yellow-300">판단 보류 (HOLD)</p>
                <h3 className="text-2xl font-bold text-white">{signal.stockName}</h3>
                <p className="font-mono text-gray-400">{signal.ticker}</p>
                 {signal.warning && (
                    <div className="mt-2 text-xs font-bold text-yellow-800 bg-yellow-400 px-2 py-1 rounded-md self-center flex items-center justify-center gap-1">
                        <AlertIcon className="h-4 w-4" />
                        {signal.warning}
                    </div>
                )}
            </header>
             <div className="p-4 bg-gray-800/50 space-y-3">
                <div className="p-3 bg-gray-900/50 rounded-md border-l-4 border-yellow-500">
                    <h5 className="font-bold text-yellow-300 mb-1 flex items-center gap-2"><BrainIcon className="h-5 w-5"/>AI 보류 사유</h5>
                    <p className="text-sm text-gray-300">{signal.reason}</p>
                </div>
                 <div className="p-3 bg-gray-900/50 rounded-md">
                    <h5 className="font-bold text-gray-300 mb-2 flex items-center gap-2"><ShieldCheckIcon className="h-5 w-5"/>상충되는 리스크 신호</h5>
                    <ul className="space-y-1 list-disc list-inside text-sm text-gray-400">
                        {signal.conflictingSignals.map((conflict, index) => (
                            <li key={index}>{conflict}</li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
};