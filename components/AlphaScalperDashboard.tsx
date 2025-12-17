// components/AlphaScalperDashboard.tsx -> now DayTraderDashboard.tsx
import React from 'react';
import type { useDayTrader } from '../hooks/useDayTrader';
import type { MarketTarget } from '../types';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorDisplay } from './ErrorDisplay';
import { DayTradeIcon, InfoIcon, AlertIcon } from './icons';
import { DayTraderSignalCard } from './AlphaScalperSignalCard';

interface DayTraderDashboardProps {
    scanner: ReturnType<typeof useDayTrader>;
    marketTarget: MarketTarget;
}

export const DayTraderDashboard: React.FC<DayTraderDashboardProps> = ({ scanner, marketTarget }) => {
    const { signals, isLoading, error, handleScan } = scanner;

    const usButtonClass = 'from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600';
    const krButtonClass = 'from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700';
    const buttonClass = marketTarget === 'US' ? usButtonClass : krButtonClass;

    const renderContent = () => {
        if (isLoading) {
            return <div className="mt-8"><LoadingSpinner message="AI가 장중 돌파 신호를 탐색하고 있습니다..." showWittyMessages={true} /></div>;
        }
        if (error) {
            return <ErrorDisplay title="스캔 실패" message={error} onRetry={handleScan} />;
        }
        if (!signals) {
            return (
                <div className="text-center p-10 bg-gray-800/30 rounded-lg space-y-4">
                    <button
                        onClick={handleScan}
                        disabled={isLoading}
                        className={`w-full sm:w-auto px-6 py-3 bg-gradient-to-r ${buttonClass} text-white font-bold rounded-lg shadow-lg transition-transform transform hover:scale-105 disabled:opacity-50`}
                    >
                        실시간 데이트레이딩 신호 탐색
                    </button>
                </div>
            );
        }
        if (signals.length === 0) {
            return (
                <div className="text-center text-gray-500 py-20 px-4 bg-gray-800/30 rounded-lg">
                    <InfoIcon className="h-12 w-12 mx-auto mb-4 text-gray-600" />
                    <h3 className="text-xl font-semibold text-gray-400">포착된 단타 신호 없음</h3>
                    <p className="mt-2">현재 시장에서 유의미한 장중 돌파 신호가 감지되지 않았습니다.</p>
                </div>
            );
        }
        return (
            <div className="space-y-6">
                {signals.map(signal => <DayTraderSignalCard key={signal.ticker} signal={signal} />)}
            </div>
        );
    };

    return (
        <div className="animate-fade-in space-y-8">
            <header className="p-4 bg-gray-800/30 rounded-lg flex flex-col items-center gap-4">
                <div className="inline-block bg-gray-700 p-3 rounded-full">
                    <DayTradeIcon className="h-10 w-10 text-cyan-400" />
                </div>
                <div className="text-center">
                    <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500">
                        AI 데이트레이더 (수급단타왕 모드)
                    </h2>
                    <p className="text-gray-400 mt-1 max-w-3xl mx-auto">
                        장중 단타 및 데이트레이딩을 위한 AI 스캐너입니다. <strong>3차 돌파, 장초반 갭상승, 체결강도 급증</strong> 등 수급단타왕의 핵심 패턴을 실시간으로 포착합니다.
                    </p>
                </div>
                <div className="p-3 bg-yellow-900/40 text-yellow-300 border border-yellow-700 rounded-lg text-center text-sm flex items-center justify-center gap-2">
                    <AlertIcon className="h-5 w-5" />
                    <strong>주의:</strong> 이 기능은 높은 변동성을 다루므로, 숙련된 트레이더에게만 권장됩니다. 빠른 판단과 엄격한 손절 원칙이 필수입니다.
                </div>
            </header>

            {renderContent()}

            {signals && !isLoading && (
                <div className="text-center">
                    <button
                        onClick={handleScan}
                        disabled={isLoading}
                        className="px-6 py-3 bg-gray-700 text-white font-bold rounded-lg shadow-lg hover:bg-gray-600 transition-transform transform hover:scale-105 disabled:opacity-50"
                    >
                        <span>다시 스캔하기</span>
                    </button>
                </div>
            )}
        </div>
    );
};