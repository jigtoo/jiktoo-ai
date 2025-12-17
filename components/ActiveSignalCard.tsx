// components/ActiveSignalCard.tsx
import React from 'react';
import type { ActiveSignal } from '../types';
import { BrainIcon, TargetIcon, StopLossIcon, PlusIcon, BellIcon } from './icons';

export const ActiveSignalCard: React.FC<{ signal: ActiveSignal; onExecute: (signal: ActiveSignal) => void; }> = ({ signal, onExecute }) => {
    const isBuy = signal.signalType === 'BUY';
    const cardColor = isBuy ? 'border-green-500 bg-green-900/20' : 'border-red-500 bg-red-900/20';
    const textColor = isBuy ? 'text-green-300' : 'text-red-300';
    const buttonColor = isBuy ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700';
    const title = isBuy ? '결정적 매수 시그널' : '결정적 헷지 시그널';

    return (
        <div className={`border-2 rounded-xl shadow-2xl animate-pulse-strong ${cardColor}`}>
            <header className="p-3 text-center flex flex-col items-center">
                <div className={`flex items-center gap-2 text-sm font-bold ${textColor}`}>
                    <BellIcon className="h-5 w-5 animate-ping"/>
                    <span>{title}</span>
                </div>
                <h3 className="text-2xl font-bold text-white">{signal.stockName}</h3>
                <p className="font-mono text-gray-400">{signal.ticker}</p>
            </header>
            <div className="p-4 bg-gray-800/50 space-y-3">
                <div className="p-3 bg-gray-900/50 rounded-md border-l-4 border-cyan-500">
                    <h5 className="font-bold text-cyan-300 mb-1 flex items-center gap-2"><BrainIcon className="h-5 w-5" />{isBuy ? 'AI 작전 계획' : 'AI 헷지 근거'}</h5>
                    <p className="text-sm text-gray-300">{signal.tradingPlan.planRationale}</p>
                </div>
                
                <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-gray-900/50 p-2 rounded"><p className="text-xs text-gray-400">진입가</p><p className="font-mono font-bold text-green-300">{signal.tradingPlan.entryPrice}</p></div>
                    <div className="bg-gray-900/50 p-2 rounded"><p className="text-xs text-gray-400">손절가</p><p className="font-mono font-bold text-red-400">{signal.tradingPlan.stopLoss}</p></div>
                    <div className="bg-gray-900/50 p-2 rounded"><p className="text-xs text-gray-400">목표가</p><p className="font-mono font-bold text-cyan-300">{signal.tradingPlan.targets[0]}</p></div>
                </div>
                
                <button onClick={() => onExecute(signal)} className={`w-full flex items-center justify-center gap-2 px-3 py-2 text-white font-bold rounded-md transition-colors ${buttonColor}`}>
                    <PlusIcon className="h-5 w-5" />
                    <span>포트폴리오에 추가</span>
                </button>
            </div>
        </div>
    );
};