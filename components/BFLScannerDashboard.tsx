
// components/BFLScannerDashboard.tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { useDayTrader } from '../hooks/useDayTrader';
import type { MarketTarget, DayTraderSignal } from '../types';
import { DayTradeIcon, BrainIcon, ChartIcon, InfoIcon, CloseIcon } from './icons';
import { DayTraderSignalCard } from './AlphaScalperSignalCard'; // Reuse existing card
import { CSSTransition, TransitionGroup } from 'react-transition-group';
import type { useBFLScanner } from '../hooks/useBFLScanner';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorDisplay } from './ErrorDisplay';
import { ClosingBellIcon, RefreshIcon, AlertIcon } from './icons';
import { BFLSignalCard } from './BFLSignalCard';

// NEW: Define type for the margin call rebound signal
interface MarginCallSignal {
    stockName: string;
    ticker: string;
    limitUpDate: string; // T-3 date
    rationale: string;
    targetDate: string; // T+3 date for display
}

// NEW: Component for the Margin Call Rebound Scanner
const MarginCallReboundScanner: React.FC<{
    signals: MarginCallSignal[];
    onSelectStock: (ticker: string, rationale: string, stockName: string) => void;
}> = ({ signals, onSelectStock }) => {
    if (signals.length === 0) {
        return null; // Don't render if there are no relevant signals today
    }

    return (
        <div className="mt-12">
            <header className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-100 flex items-center justify-center gap-3">
                    <BrainIcon className="h-6 w-6 text-purple-400" />
                    {signals[0].targetDate} 오전 공략 (T+3 반대매매)
                </h2>
                <p className="text-gray-400 mt-1 max-w-2xl mx-auto">
                    3일 전 상한가에 진입했던 미수 물량이 오늘 아침 강제 청산(반대매매)되며 발생하는 주가 하락을 저점 매수 기회로 활용하는 고급 단기 전략입니다.
                </p>
            </header>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {signals.map(signal => (
                    <div key={signal.ticker} className="bg-gray-800/70 border border-purple-500/50 rounded-xl shadow-lg p-4 flex flex-col justify-between">
                        <div>
                            <h3 className="text-xl font-bold text-white">{signal.stockName}</h3>
                            <p className="font-mono text-gray-400">{signal.ticker}</p>
                            <p className="text-xs text-gray-500 mt-1">상한가 달성일: {signal.limitUpDate}</p>

                            <div className="mt-3 p-3 bg-gray-900/40 rounded-lg border-l-4 border-purple-400">
                                <h4 className="flex items-center gap-2 font-bold text-purple-300 mb-1"><BrainIcon className="h-5 w-5" />AI 전략 브리핑</h4>
                                <p className="text-sm text-gray-300">{signal.rationale}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => onSelectStock(signal.ticker, signal.rationale, signal.stockName)}
                            className="w-full mt-4 px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg shadow-md hover:bg-purple-700 transition-colors"
                        >
                            심층 분석
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};


interface BFLScannerDashboardProps {
    scanner: ReturnType<typeof useBFLScanner>;
    marketTarget: MarketTarget;
    onSelectStock: (ticker: string, rationale: string, stockName: string) => void;
    // isEmbedded?: boolean; // Removed as it's always full page now
}

export const BFLScannerDashboard: React.FC<BFLScannerDashboardProps> = ({ scanner, marketTarget, onSelectStock }) => {
    const { signals, isLoading, error, handleScan, handleLoadSample, dataType, lastScanTime } = scanner;
    const [showMarginCallWarning, setShowMarginCallWarning] = useState(false);

    // NEW: Mock data for the margin call rebound feature
    const [marginCallSignals, setMarginCallSignals] = useState<MarginCallSignal[]>([]);

    useEffect(() => {
        // This simulates a backend process that identifies candidates for the T+3 strategy
        if (marketTarget === 'KR') {
            const today = new Date();
            const targetDate = new Date(today); // T+3 is today for this simulation

            // To find T (limit-up date), we need to go back 3 business days.
            // This is a simplified logic and doesn't account for holidays.
            let businessDaysToGo = 3;
            const tDate = new Date(today);
            while (businessDaysToGo > 0) {
                tDate.setDate(tDate.getDate() - 1);
                const dayOfWeek = tDate.getDay();
                if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday or Saturday
                    businessDaysToGo--;
                }
            }

            const targetDateString = targetDate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });

            setMarginCallSignals([
                {
                    stockName: "한미반도체",
                    ticker: "042700.KS",
                    limitUpDate: tDate.toLocaleDateString('ko-KR'),
                    rationale: `${targetDateString} 오전, 개인 미수 반대매매 물량 출회로 인한 시초가 하락 시, 단기 저점 매수 기회를 포착하는 전략입니다.`,
                    targetDate: targetDateString,
                },
            ]);
        } else {
            setMarginCallSignals([]);
        }
    }, [marketTarget]);

    useEffect(() => {
        if (marketTarget !== 'KR') {
            setShowMarginCallWarning(false);
            return;
        }

        const checkTime = () => {
            const kstTime = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
            const hour = kstTime.getHours();
            const minute = kstTime.getMinutes();
            // Show warning between 15:15 and 15:30 KST
            const isMarginCallTime = (hour === 15 && minute >= 15 && minute <= 30);
            setShowMarginCallWarning(isMarginCallTime);
        };

        checkTime();
        const intervalId = setInterval(checkTime, 30000); // Check every 30 seconds

        return () => clearInterval(intervalId);
    }, [marketTarget]);

    const usButtonClass = 'from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600';
    const krButtonClass = 'from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700';
    const buttonClass = marketTarget === 'US' ? usButtonClass : krButtonClass;

    const renderInitialState = () => (
        <div className="text-center p-10 bg-gray-800/30 rounded-lg space-y-4">
            <p className="text-gray-400">AI의 실시간 분석을 실행하여 종가배팅 기회를 포착하세요.</p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
                <button
                    onClick={() => handleScan()}
                    disabled={isLoading}
                    className={`w-full sm:w-auto px-6 py-3 bg-gradient-to-r ${buttonClass} text-white font-bold rounded-lg shadow-lg transition-transform transform hover:scale-105 ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                    종가배팅 스캔 실행
                </button>
            </div>
        </div>
    );

    const renderContent = () => {
        if (isLoading && !signals) {
            return <div className="mt-8"><LoadingSpinner message="AI가 Behavior-Flow Long 조건에 맞는 종목을 찾고 있습니다..." showWittyMessages={true} /></div>;
        }
        if (error) {
            return <ErrorDisplay title="스캔 실패" message={error} onRetry={handleScan} />;
        }
        if (!signals) {
            return renderInitialState();
        }
        if (signals.length === 0) {
            return (
                <div className="text-center text-gray-500 py-20 px-4 bg-gray-800/30 rounded-lg space-y-4">
                    <InfoIcon className="h-12 w-12 mx-auto mb-4 text-gray-600" />
                    <h3 className="text-xl font-semibold text-gray-400">포착된 신호 없음</h3>
                    <p className="mt-2">현재 시장에서 종가배팅 기준에 맞는 종목을 찾지 못했습니다.</p>
                    <p className="text-sm text-gray-500">종가배팅은 장 마감 직전(15:20~15:30)에 가장 효과적입니다.</p>
                </div>
            );
        }
        return (
            <div className="space-y-6">
                {signals.map(signal => <BFLSignalCard key={signal.ticker} signal={signal} onSelect={onSelectStock} />)}
            </div>
        );
    };

    // FullHeader is now always rendered as the component is no longer embedded
    const FullHeader = () => (
        <header className="p-4 bg-gray-800/30 rounded-lg flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-center sm:text-left">
                <div className="inline-block bg-gray-700 p-3 rounded-full mb-3">
                    <ClosingBellIcon className="h-10 w-10 text-cyan-400" />
                </div>
                <h2 className="text-3xl font-bold text-gray-100">AI 종가배팅 스캐너</h2>
                <p className="text-gray-400 mt-1 max-w-3xl">
                    전업투자자 '홍인기'의 전략을 기반으로, AI가 당일 주도주 중 마감 직전 가장 강력한 종목을 포착하여 익일 시초가 갭상승을 노리는 종가배팅 플랜을 제공합니다.
                </p>
            </div>
            {signals && ( // Show refresh button only if there are signals
                <div className="flex-shrink-0">
                    <button
                        type="button"
                        onClick={() => handleScan()}
                        disabled={isLoading}
                        className={`flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 text-white font-semibold rounded-lg shadow-md transition-colors ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-600 cursor-pointer'}`}
                    >
                        <RefreshIcon className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
                        <span>재탐색</span>
                    </button>
                    {lastScanTime && (
                        <div className={`p-2 rounded-md text-center text-xs w-full ${dataType === 'sample' ? 'bg-yellow-900/40 text-yellow-300' : 'bg-gray-900/50 text-gray-400'}`}>
                            <p>마지막 스캔: {new Date(lastScanTime).toLocaleString('ko-KR')}</p>
                            <p>({dataType === 'sample' ? '샘플 데이터' : '실시간 데이터'})</p>
                        </div>
                    )}
                </div>
            )}
        </header>
    );

    // EmbeddedHeader is removed as the component is no longer embedded
    // const EmbeddedHeader = () => (
    //     <div className="flex justify-between items-center gap-4 mb-4">
    //         {signals ? (
    //              <div className="flex items-center gap-2">
    //                  <button
    //                     type="button"
    //                     onClick={() => handleScan()}
    //                     disabled={isLoading}
    //                     className={`flex items-center justify-center gap-1 px-3 py-1.5 bg-gray-700 text-white text-xs font-semibold rounded-lg shadow-md transition-colors ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-600 cursor-pointer'}`}
    //                 >
    //                     <RefreshIcon className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
    //                     <span>재탐색</span>
    //                 </button>
    //                 {lastScanTime && (
    //                      <div className={`p-1.5 rounded-md text-center text-xs ${dataType === 'sample' ? 'bg-yellow-900/40 text-yellow-300' : 'bg-gray-900/50 text-gray-400'}`}>
    //                         <p>({dataType === 'sample' ? '샘플' : '실시간'}) {new Date(lastScanTime).toLocaleTimeString('ko-KR')}</p>
    //                     </div>
    //                 )}
    //             </div>
    //         ) : <div />}
    //     </div>
    // );


    return (
        <div className="animate-fade-in space-y-8">
            <FullHeader /> {/* Always render the full header */}

            {showMarginCallWarning && (
                <div className="p-3 bg-yellow-900/40 text-yellow-200 border border-yellow-700/50 rounded-lg flex items-center gap-3 text-sm">
                    <AlertIcon className="h-5 w-5 flex-shrink-0" />
                    <p>
                        현재 <strong>개인 미수 반대매매 마감 시간(15:20)</strong>입니다. 변동성 확대에 유의하며 주도주 저가 매수 기회를 포착하세요.
                    </p>
                </div>
            )}

            {renderContent()}

            {marketTarget === 'KR' && <MarginCallReboundScanner signals={marginCallSignals} onSelectStock={onSelectStock} />}
        </div>
    );
};
