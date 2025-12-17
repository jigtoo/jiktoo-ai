

import React from 'react';
import type { AnomalyItem, MarketTarget } from '../types';
import { LoadingSpinner } from './LoadingSpinner';
import { InfoIcon, PulseIcon } from './icons';
import { ErrorDisplay } from './ErrorDisplay';
import { AnomalyCard } from './AnomalyCard';

interface AnomalyScannerProps {
    anomalies: AnomalyItem[] | null;
    isLoading: boolean;
    error: string | null;
    onScan: () => void;
    onSelectStock: (ticker: string, rationale: string, stockName: string) => void;
    marketTarget: MarketTarget;
}

export const AnomalyScanner: React.FC<AnomalyScannerProps> = ({ anomalies, isLoading, error, onScan, onSelectStock, marketTarget }) => {
    
    const handleScanClick = () => {
        onScan();
    };

    const sortedAnomalies = (anomalies || [])
        .filter(item => item && item.ticker && item.stockName && item.signals && item.signals.length > 0)
        .sort((a, b) => (b.buySignalLikelihood || 0) - (a.buySignalLikelihood || 0));
    
    const usButtonClass = 'from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600';
    const krButtonClass = 'from-cyan-600 to-blue-700 hover:from-cyan-700 hover:to-blue-800';
    const buttonClass = marketTarget === 'US' ? usButtonClass : krButtonClass;

    const renderInitialState = () => (
        <div className="flex-grow flex flex-col justify-center items-center text-center p-4">
            <PulseIcon className="h-12 w-12 mb-4 text-cyan-400" />
            <h3 className="text-xl font-bold text-gray-100">AI 유망주 포착</h3>
            <p className="text-sm text-gray-400 mt-2 max-w-xs mx-auto">
                AI가 시장의 중요한 움직임을 실시간으로 포착하여, 놓치지 말아야 할 기회를 알려드립니다.
            </p>
            <button
                onClick={handleScanClick}
                className={`mt-6 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r ${buttonClass} text-white font-semibold rounded-lg shadow-md transition duration-200 transform hover:scale-105`}
            >
                <PulseIcon className="h-5 w-5"/>
                <span>신호 스캔 시작</span>
            </button>
        </div>
    );
    
    const renderContent = () => {
        if (anomalies === null && !isLoading) {
            return renderInitialState();
        }

        if (isLoading) {
            return <div className="flex-grow flex items-center justify-center"><LoadingSpinner message="유망주 신호를 포착 중..." /></div>;
        }
        
        if (error) {
            return <div className="flex-grow flex items-center justify-center"><ErrorDisplay title="신호 포착 실패" message={error} onRetry={handleScanClick} /></div>;
        }

        if (sortedAnomalies.length === 0) {
            return (
                <div className="flex-grow flex flex-col justify-center items-center text-center text-gray-500">
                    <InfoIcon className="h-8 w-8 mb-2" />
                    <p>현재 포착된 유망주 신호가 없습니다.</p>
                    <button onClick={handleScanClick} className="mt-4 text-sm text-cyan-400 hover:underline">
                        다시 스캔하기
                    </button>
                </div>
            );
        }

        return (
            <div className="flex flex-col h-full">
                 <div className="flex justify-between items-center mb-4 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <PulseIcon className="h-6 w-6 text-cyan-400" />
                        <h2 className="text-lg font-bold text-gray-100">AI 유망주 포착</h2>
                    </div>
                     <button
                        onClick={handleScanClick}
                        disabled={isLoading}
                        className="flex items-center justify-center gap-2 px-3 py-1.5 bg-gray-700 text-white text-xs font-semibold rounded-lg shadow-md hover:bg-gray-600 transition-colors disabled:opacity-50"
                        aria-label="Rescan for anomalies"
                    >
                        <span>재탐색</span>
                    </button>
                </div>
                <div className="flex-grow overflow-y-auto space-y-3 pr-2">
                    {sortedAnomalies.map((item, index) => (
                        <AnomalyCard 
                            key={`${item.ticker}-${index}`}
                            item={item}
                            onSelect={onSelectStock}
                        />
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl shadow-lg p-4 min-h-[300px] h-full flex flex-col">
            {renderContent()}
        </div>
    );
};