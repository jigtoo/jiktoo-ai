import React from 'react';
import type { AnomalyItem, AnomalySignal } from '../types';
import { TrendingUpIcon, NewsIcon, ChartIcon, SparklesIcon, FireIcon, AlertIcon } from './icons';

interface AnomalyCardProps {
    item: AnomalyItem;
    onSelect: (ticker: string, rationale: string, stockName: string) => void;
}

const signalConfig: Record<AnomalySignal['type'], { icon: React.ReactNode; color: string }> = {
    'price_action': { icon: <TrendingUpIcon className="h-4 w-4 text-green-400"/>, color: 'text-green-300' },
    'volume': { icon: <ChartIcon className="h-4 w-4 text-blue-400" />, color: 'text-blue-300' },
    'pattern': { icon: <SparklesIcon className="h-4 w-4 text-purple-400" />, color: 'text-purple-300' },
    'news': { icon: <NewsIcon className="h-4 w-4 text-sky-400" />, color: 'text-sky-300' },
    'cta': { icon: <FireIcon className="h-4 w-4 text-cyan-400" />, color: 'text-cyan-300' },
};

export const AnomalyCard: React.FC<AnomalyCardProps> = ({ item, onSelect }) => {
    const firstRationale = item.signals[0]?.text || 'AI 유망주 포착';

    return (
        <div
            onClick={() => onSelect(item.ticker, firstRationale, item.stockName)}
            className="bg-gray-800 border-gray-700/50 border rounded-lg p-3 transition-all duration-200 cursor-pointer hover:bg-gray-700/70 hover:border-cyan-500/50"
        >
            <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-bold text-gray-100">{item.stockName} <span className="font-mono text-gray-400">{item.ticker}</span></h3>
                <p className="text-sm text-gray-400 flex-shrink-0">{item.timestamp}</p>
            </div>
            <div className="space-y-1">
                {item.signals.map((signal, index) => {
                    const config = signalConfig[signal.type] || signalConfig['news'];
                    return (
                         <div key={index} className="flex items-center gap-2">
                            {config.icon}
                            <p className={`text-sm ${config.color}`}>{signal.text}</p>
                        </div>
                    );
                })}
            </div>

            {item.warningFlags && item.warningFlags.length > 0 && (
                <div className="mt-2 pt-2 border-t border-blue-700/50">
                    <h4 className="flex items-center gap-1 text-xs font-bold text-blue-400">
                        <AlertIcon className="h-4 w-4" />
                        AI 주의보
                    </h4>
                    <div className="flex flex-wrap gap-1 mt-1">
                        {item.warningFlags.map((flag, i) => (
                            <span key={i} className="px-1.5 py-0.5 text-xs bg-blue-900/70 text-blue-300 rounded-md">{flag}</span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};