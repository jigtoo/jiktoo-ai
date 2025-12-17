
// components/CoinStockScannerDashboard.tsx
import React, { useState } from 'react';
import type { MarketTarget, CoinStockSignal } from '../types';
import type { useCoinStockScanner } from '../hooks/useCoinStockScanner';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorDisplay } from './ErrorDisplay';
import { FireIcon, InfoIcon, CheckCircleIcon, BrainIcon, TrendingUpIcon, ChartIcon, StrategyIcon, RefreshIcon } from './icons'; // Added RefreshIcon

interface CoinStockScannerDashboardProps {
    scanner: ReturnType<typeof useCoinStockScanner>;
    marketTarget: MarketTarget;
    // isEmbedded?: boolean; // Removed as it's always full page now
}

const ConfidenceGauge: React.FC<{ score: number }> = ({ score }) => {
    const percentage = Math.max(0, Math.min(100, score));
    const radius = 24;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    let colorClass = 'text-green-400';
    if (score < 75) colorClass = 'text-yellow-400';
    if (score < 50) colorClass = 'text-red-400';

    return (
        <div className="relative w-16 h-16 flex-shrink-0" aria-label={`AI 신뢰도: ${score}점`}>
            <svg className="w-full h-full" viewBox="0 0 56 56">
                <circle className="text-gray-700" strokeWidth="5" stroke="currentColor" fill="transparent" r={radius} cx="28" cy="28" />
                <circle
                    className={colorClass}
                    strokeWidth="5"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r={radius}
                    cx="28"
                    cy="28"
                    style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dashoffset 0.5s ease-in-out' }}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-xl font-bold ${colorClass}`}>{score}</span>
            </div>
        </div>
    );
};

const SignalIcon: React.FC<{ type: CoinStockSignal['detectedSignals'][0]['type'] }> = ({ type }) => {
    switch (type) {
        case 'volume': return <TrendingUpIcon className="h-5 w-5 text-green-400" />;
        case 'pattern': return <ChartIcon className="h-5 w-5 text-purple-400" />;
        case 'moving_average': return <ChartIcon className="h-5 w-5 text-blue-400" />;
        case 'momentum': return <TrendingUpIcon className="h-5 w-5 text-yellow-400" />;
        case 'order_book': return <InfoIcon className="h-5 w-5 text-gray-400" />;
        default: return <InfoIcon className="h-5 w-5 text-gray-400" />;
    }
}

const SignalCard: React.FC<{ signal: CoinStockSignal }> = ({ signal }) => {
    return (
        <div className="bg-gray-800/70 border border-gray-700 rounded-xl shadow-lg animate-fade-in">
            <header className="p-4 flex justify-between items-start gap-4 bg-gray-900/50 rounded-t-xl">
                <div>
                    <h3 className="text-xl font-bold text-white">{signal.stockName}</h3>
                    <p className="font-mono text-gray-400">{signal.ticker}</p>
                    <p className="text-lg font-bold text-cyan-300 mt-1">{signal.currentPrice}</p>
                </div>
                <div className="text-center">
                    <ConfidenceGauge score={signal.aiConfidence} />
                    <p className="text-xs font-bold text-gray-400 mt-1">AI 신뢰도</p>
                </div>
            </header>
            <div className="p-4 space-y-4">
                <div>
                    <h4 className="font-bold text-gray-200 mb-2">포착된 조기 신호</h4>
                    <div className="space-y-2">
                        {signal.detectedSignals.map((s, i) => (
                            <div key={i} className="flex items-start gap-3 p-2 bg-gray-900/40 rounded-md">
                                <div className="flex-shrink-0 mt-0.5"><SignalIcon type={s.type} /></div>
                                <p className="text-sm text-gray-300">{s.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="p-3 bg-gray-900/40 rounded-lg border-l-4 border-cyan-500">
                    <h4 className="flex items-center gap-2 font-bold text-cyan-300 mb-1"><StrategyIcon className="h-5 w-5" />AI 전략 브리핑</h4>
                    <p className="text-sm text-gray-300">{signal.strategyBrief}</p>
                </div>
            </div>
        </div>
    )
};


export const CoinStockScannerDashboard: React.FC<CoinStockScannerDashboardProps> = ({ scanner, marketTarget }) => {
    const { signals, isLoading, error, handleScan, handleLoadSample, dataType } = scanner;
    const [lastScanTime, setLastScanTime] = useState<string | null>(null);

    const usButtonClass = 'from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600';
    const krButtonClass = 'from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700';
    const buttonClass = marketTarget === 'US' ? usButtonClass : krButtonClass;

    const handleRealScan = () => {
        setLastScanTime(new Date().toLocaleString('ko-KR'));
        handleScan();
    };

    const renderInitialState = () => (
        <div className="text-center p-10 bg-gray-800/30 rounded-lg space-y-4">
            <p className="text-gray-400">AI의 실시간 분석을 실행하여 코인주 기회를 포착하세요.</p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
                <button
                    onClick={handleRealScan}
                    disabled={isLoading}
                    className={`w-full sm:w-auto px-6 py-3 bg-gradient-to-r ${buttonClass} text-white font-bold rounded-lg shadow-lg transition-transform transform hover:scale-105 disabled:opacity-50`}
                >
                    실시간 스캔 실행
                </button>
            </div>
        </div>
    );

    const renderContent = () => {
        if (isLoading) {
            return <div className="mt-8"><LoadingSpinner message="AI가 급등 전 조기 신호를 탐색 중입니다..." showWittyMessages={true} /></div>;
        }

        if (error) {
            return <ErrorDisplay title="스캔 실패" message={error} onRetry={handleRealScan} />;
        }

        if (!signals) {
            return renderInitialState();
        }

        if (signals.length === 0) {
            return (
                <div className="text-center text-gray-500 py-20 px-4 bg-gray-800/30 rounded-lg">
                    <InfoIcon className="h-12 w-12 mx-auto mb-4 text-gray-600" />
                    <h3 className="text-xl font-semibold text-gray-400">포착된 신호 없음</h3>
                    <p className="mt-2">현재 시장에서 유의미한 저가주 급등 조기 신호가 감지되지 않았습니다.</p>
                </div>
            );
        }

        return (
            <div className="space-y-6">
                {signals.map(signal => <SignalCard key={signal.ticker} signal={signal} />)}
            </div>
        );
    };

    // FullHeader is now always rendered as the component is no longer embedded
    const FullHeader = () => (
        <header className="p-4 bg-gray-800/30 rounded-lg flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-center sm:text-left">
                <div className="inline-block bg-gray-700 p-3 rounded-full mb-4">
                    <FireIcon className="h-10 w-10 text-orange-400" />
                </div>
                <h2 className="text-3xl font-bold text-gray-100">AI 코인주 스캐너</h2>
                <p className="text-gray-400 mt-2 max-w-3xl mx-auto">
                    고위험 고수익을 추구하는 투자자를 위해, AI가 제공된 연구 자료를 바탕으로 급등 전 매집 흔적과 같은 조기 신호를 보이는 저가 소형주(코인주)를 탐색합니다.
                </p>
            </div>
            {signals && ( // Show refresh button only if there are signals
                <div className="flex-shrink-0">
                    <button
                        onClick={handleRealScan}
                        disabled={isLoading}
                        className={`flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 text-white font-semibold rounded-lg shadow-md hover:bg-gray-600 transition-colors disabled:opacity-50`}
                    >
                        <RefreshIcon className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
                        <span>재탐색</span>
                    </button>
                </div>
            )}
        </header>
    );

    return (
        <div className="animate-fade-in space-y-8">
            <FullHeader /> {/* Always render the full header */}


            {dataType === 'live' && lastScanTime && !isLoading && !error && (
                <div className="p-3 bg-green-900/40 text-green-300 border border-green-700 rounded-lg text-center text-sm flex items-center justify-center gap-2">
                    <CheckCircleIcon className="h-5 w-5" />
                    실시간 스캔 결과 ({lastScanTime})
                </div>
            )}

            {renderContent()}

            {signals && !isLoading && (
                <div className="text-center mt-4">
                    <button
                        onClick={handleRealScan}
                        disabled={isLoading}
                        className={`px-6 py-3 bg-gray-700 text-white font-bold rounded-lg shadow-lg hover:bg-gray-600 transition-transform transform hover:scale-105 disabled:opacity-50`}
                    >
                        <span>다시 스캔하기</span>
                    </button>
                </div>
            )}
        </div>
    );
};
