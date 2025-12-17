import React from 'react';
import type { ShortSellingAnalysis } from '../types';
import { ShortSellIcon } from './icons';

interface ShortSellingAnalyzerProps {
    analysis?: ShortSellingAnalysis;
}

export const ShortSellingAnalyzer: React.FC<ShortSellingAnalyzerProps> = ({ analysis }) => {
    if (!analysis) return null;

    const { shortBalanceRatio, lendingBalanceChange, shortInterestVolume, interpretation } = analysis;
    
    const hasData = shortBalanceRatio !== 'N/A' || lendingBalanceChange !== 'N/A' || shortInterestVolume !== 'N/A';

    return (
        <div className="bg-gray-800/60 rounded-lg border border-gray-700 p-4 space-y-4">
            <header className="text-center">
                 <h3 className="text-xl font-bold text-gray-100">공매도 및 수급 분석</h3>
            </header>
            
            {hasData ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-center">
                    <div className="bg-gray-900/40 p-3 rounded-lg">
                        <p className="text-sm text-gray-400">공매도 잔고 비율</p>
                        <p className="text-lg font-bold font-mono text-white">{shortBalanceRatio}</p>
                    </div>
                    <div className="bg-gray-900/40 p-3 rounded-lg">
                        <p className="text-sm text-gray-400">대차잔고 증감</p>
                        <p className="text-lg font-bold font-mono text-white">{lendingBalanceChange}</p>
                    </div>
                    <div className="bg-gray-900/40 p-3 rounded-lg">
                        <p className="text-sm text-gray-400">공매도 거래량</p>
                        <p className="text-lg font-bold font-mono text-white">{shortInterestVolume}</p>
                    </div>
                </div>
            ) : null}

            <div className="bg-gray-900/40 p-4 rounded-lg border-l-4 border-teal-500/80">
                <div className="flex items-center gap-3 mb-2">
                    <ShortSellIcon className="h-6 w-6 text-teal-400" />
                    <h4 className="font-bold text-teal-300">AI 수급 해석</h4>
                </div>
                <p className="text-gray-300 text-sm">{interpretation}</p>
            </div>
        </div>
    );
};
