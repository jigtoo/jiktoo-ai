import React from 'react';
import type { useSupplyEagle } from '../hooks/useSupplyEagle';
import type { MarketTarget } from '../types';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorDisplay } from './ErrorDisplay';
import { InfoIcon } from './icons';

interface SupplyEagleDashboardProps {
    scanner: ReturnType<typeof useSupplyEagle>;
    marketTarget: MarketTarget;
}

export const SupplyEagleDashboard: React.FC<SupplyEagleDashboardProps> = ({ scanner, marketTarget }) => {
    const { results, isLoading, error, runScan } = scanner;

    const usButtonClass = 'from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600';
    const krButtonClass = 'from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700';
    const buttonClass = marketTarget === 'US' ? usButtonClass : krButtonClass;

    const renderContent = () => {
        if (isLoading) {
            return <div className="mt-8"><LoadingSpinner message="AI가 바닥권 수급 매집주(수급 독수리)를 탐색하고 있습니다..." showWittyMessages={true} /></div>;
        }
        if (error) {
            return <ErrorDisplay title="스캔 실패" message={error} onRetry={runScan} />;
        }
        if (!results) {
            return (
                <div className="text-center p-10 bg-gray-800/30 rounded-lg space-y-4">
                    <button
                        onClick={runScan}
                        disabled={isLoading}
                        className={`w-full sm:w-auto px-6 py-3 bg-gradient-to-r ${buttonClass} text-white font-bold rounded-lg shadow-lg transition-transform transform hover:scale-105 disabled:opacity-50`}
                    >
                        수급 독수리 스캔 시작 (바닥권 매집 포착)
                    </button>
                </div>
            );
        }
        if (results.length === 0) {
            return (
                <div className="text-center text-gray-500 py-20 px-4 bg-gray-800/30 rounded-lg">
                    <InfoIcon className="h-12 w-12 mx-auto mb-4 text-gray-600" />
                    <h3 className="text-xl font-semibold text-gray-400">포착된 수급 독수리 없음</h3>
                    <p className="mt-2">현재 바닥권에서 뚜렷한 기관/외인 매집이 포착되지 않았습니다.</p>
                </div>
            );
        }
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {results.map((signal, idx) => (
                    <div key={idx} className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700 hover:border-cyan-500 transition-all shadow-lg">
                        <div className="p-5">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-xl font-bold text-white">{signal.stockName}</h3>
                                    <span className="text-sm text-gray-400">{signal.ticker}</span>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${signal.status === 'ReadyToFly' ? 'bg-red-900 text-red-200 animate-pulse' : 'bg-blue-900 text-blue-200'}`}>
                                    {signal.status === 'ReadyToFly' ? '🦅 비상 준비' : '🥚 매집 중'}
                                </span>
                            </div>

                            <div className="space-y-3 mb-4">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-400">매집 주체</span>
                                    <span className="text-cyan-400 font-bold">{signal.buyerType}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-400">매집 기간</span>
                                    <span className="text-white">{signal.accumulationPeriod}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-400">추정 평단</span>
                                    <span className="text-yellow-400">{signal.avgPrice}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-400">현재가</span>
                                    <span className="text-white font-mono">{signal.currentPrice}</span>
                                </div>
                            </div>

                            <div className="bg-gray-700/30 p-3 rounded-lg text-sm text-gray-300 mb-4">
                                {signal.rationale}
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-500">AI 확신도</span>
                                <div className="flex items-center gap-2">
                                    <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
                                            style={{ width: `${signal.aiConfidence}%` }}
                                        />
                                    </div>
                                    <span className="text-sm font-bold text-cyan-400">{signal.aiConfidence}%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="animate-fade-in space-y-8">
            <header className="p-4 bg-gray-800/30 rounded-lg flex flex-col items-center gap-4">
                <div className="inline-block bg-gray-700 p-3 rounded-full">
                    <span className="text-4xl">🦅</span>
                </div>
                <div className="text-center">
                    <h2 className="text-3xl font-bold text-gray-100">수급 독수리 스캐너</h2>
                    <p className="text-gray-400 mt-1 max-w-3xl mx-auto">
                        "독수리는 바닥에서 날아오릅니다." 기관과 외국인이 바닥권에서 조용히 매집 중인 종목을 포착하여, 시세 분출 직전의 기회를 잡으세요.
                    </p>
                </div>
            </header>

            {renderContent()}

            {results && !isLoading && (
                <div className="text-center">
                    <button
                        onClick={runScan}
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
