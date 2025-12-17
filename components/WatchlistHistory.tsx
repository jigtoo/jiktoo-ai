


import React, { useState } from 'react';
import type { WatchlistHistoryItem, AnalysisResult, MarketTarget } from '../types';
import { TrashIcon, InfoIcon, WatchlistIcon, ChartIcon, RefreshIcon, CheckCircleIcon, AlertIcon, XCircleIcon } from './icons';
import { marketInfo } from '../services/marketInfo';

interface WatchlistHistoryProps {
    history: WatchlistHistoryItem[];
    onRemove: (ticker: string) => void;
    onSelectStock: (ticker: string, rationale: string, stockName: string) => void;
    onViewSnapshot: (analysis: AnalysisResult) => void;
    marketTarget: MarketTarget;
}

const SignalStatusVisualizer: React.FC<{
    currentPrice: number;
    entryPrice: number;
    stopLossPrice: number;
    currency: string;
    marketTarget: MarketTarget;
}> = ({ currentPrice, entryPrice, stopLossPrice, currency, marketTarget }) => {

    const formatOptions = { maximumFractionDigits: marketTarget === 'KR' ? 0 : 2 };

    let status: '유효' | '추격매수 위험' | '손절선 이탈' = '유효';
    let statusColor = 'bg-green-900/50 text-green-300';
    let statusIcon = <CheckCircleIcon className="h-4 w-4" />;
    let statusReason = `현재가가 매수 진입점(${entryPrice.toLocaleString(undefined, formatOptions)}원) 근처에 있어 신호가 유효합니다.`;

    // 추격매수 위험: 진입가보다 5% 이상 상승 시
    if (currentPrice > entryPrice * 1.05) {
        status = '추격매수 위험';
        statusColor = 'bg-yellow-900/50 text-yellow-300';
        statusIcon = <AlertIcon className="h-4 w-4" />;
        statusReason = `현재가가 추천 매수 진입점보다 5% 이상 상승하여 추격 매수의 위험이 있습니다.`;
    }

    // 손절선 이탈
    if (currentPrice < stopLossPrice) {
        status = '손절선 이탈';
        statusColor = 'bg-red-900/50 text-red-300';
        statusIcon = <XCircleIcon className="h-4 w-4" />;
        statusReason = `현재가가 손절매 가격(${stopLossPrice.toLocaleString(undefined, formatOptions)}원) 아래로 하락하여 매수 신호가 소멸되었습니다.`;
    }

    const range = entryPrice - stopLossPrice;
    const progress = range > 0 ? Math.max(0, Math.min(100, ((currentPrice - stopLossPrice) / range) * 100)) : 0;

    return (
        <div className="mt-3 pt-3 border-t border-gray-700/50 space-y-3">
            <div className="flex items-center justify-between text-xs">
                <div className="text-left">
                    <p className="text-red-500 font-semibold">손절매 가격</p>
                    <p className="font-mono text-red-400">{stopLossPrice.toLocaleString(undefined, formatOptions)}{currency}</p>
                </div>
                <div className="text-right">
                    <p className="text-green-500 font-semibold">매수 진입점</p>
                    <p className="font-mono text-green-400">{entryPrice.toLocaleString(undefined, formatOptions)}{currency}</p>
                </div>
            </div>
            <div className="relative w-full h-2 bg-gray-600 rounded-full">
                <div className="h-full bg-gradient-to-r from-red-500 to-green-500 rounded-full" />
                <div
                    className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full border-2 border-gray-900 shadow-lg"
                    style={{ left: `${progress}%` }}
                    title={`현재 기준가: ${currentPrice.toLocaleString(undefined, formatOptions)}${currency}`}
                />
            </div>
            <div className={`p-2 rounded-md flex items-center gap-2 text-xs ${statusColor}`}>
                <div className="flex-shrink-0">{statusIcon}</div>
                <div>
                    <span className="font-bold">{status}:</span>
                    <span className="ml-1">{statusReason}</span>
                </div>
            </div>
        </div>
    );
};


export const WatchlistHistory: React.FC<WatchlistHistoryProps> = ({ history, onRemove, onSelectStock, onViewSnapshot, marketTarget }) => {

    const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);

    const handleRemoveClick = (e: React.MouseEvent, ticker: string) => {
        e.stopPropagation();
        setConfirmingDelete(ticker);
    };

    const handleConfirmRemove = (e: React.MouseEvent, ticker: string) => {
        e.stopPropagation();
        onRemove(ticker);
        setConfirmingDelete(null);
    };

    const handleCancelRemove = (e: React.MouseEvent) => {
        e.stopPropagation();
        setConfirmingDelete(null);
    };

    const handleViewSnapshot = (e: React.MouseEvent, analysis: AnalysisResult) => {
        e.stopPropagation();
        onViewSnapshot(analysis);
    };

    const currency = marketInfo[marketTarget].currency;
    const formatOptions = { maximumFractionDigits: marketTarget === 'KR' ? 0 : 2 };

    return (
        <div className="mt-12 animate-fade-in">
            <div className="flex items-center gap-3 mb-6">
                <WatchlistIcon />
                <h2 className="text-2xl font-bold text-gray-200">매수신호 포착 기록</h2>
            </div>

            {history.length === 0 ? (
                <div className="text-center text-gray-500 py-12 px-4 bg-gray-800/30 rounded-lg">
                    <InfoIcon className="h-12 w-12 mx-auto mb-4 text-gray-600" />
                    <h3 className="text-xl font-semibold text-gray-400">저장된 종목이 없습니다.</h3>
                    <p className="mt-2 max-w-md mx-auto">
                        '탐색' 탭에서 종목을 분석하고 '매수 신호'로 판정되면 여기에 자동으로 추가됩니다.
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {history.map(item => {
                        const { analysis, savedDate } = item;
                        const { ticker, stockName, status, referencePrice } = analysis;
                        const buyPlan = analysis.synthesis?.buyPlan;

                        let currentPrice: number;
                        if (typeof referencePrice === 'number') {
                            currentPrice = referencePrice;
                        } else if (typeof referencePrice === 'string') {
                            const cleaned = referencePrice.replace(/[^0-9.-]+/g, "");
                            currentPrice = cleaned ? parseFloat(cleaned) : 0;
                        } else {
                            currentPrice = 0;
                        }

                        const isActionable = status === 'ActionableSignal' && buyPlan && buyPlan.recommendedPrice && buyPlan.stopLossPrice;

                        return (
                            <div
                                key={ticker}
                                className="bg-gray-800/60 border border-gray-700/80 rounded-lg p-3 sm:p-4 shadow-md"
                            >
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                    <div className="flex-grow">
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <span className={`flex items-center gap-1 px-2 py-0.5 text-xs font-bold rounded-md bg-green-600/80 text-white`}>
                                                <CheckCircleIcon className="h-4 w-4" /> 매수 신호
                                            </span>
                                            <h3 className="text-lg font-bold text-gray-100">{stockName}</h3>
                                            <p className="font-mono text-gray-400">({ticker})</p>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">저장일: {savedDate}</p>
                                    </div>
                                    <div className="flex items-center gap-2 self-start sm:self-center flex-shrink-0">
                                        {confirmingDelete === ticker ? (
                                            <>
                                                <button onClick={(e) => handleConfirmRemove(e, ticker)} className="px-3 py-1.5 text-xs font-bold bg-red-600 text-white rounded-md">삭제 확인</button>
                                                <button onClick={handleCancelRemove} className="px-3 py-1.5 text-xs font-semibold bg-gray-500 text-white rounded-md">취소</button>
                                            </>
                                        ) : (
                                            <>
                                                <button
                                                    onClick={() => onSelectStock(ticker, `히스토리에서 재분석: ${stockName}`, stockName)}
                                                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors"
                                                    title="현재 시점에서 이 종목을 다시 분석합니다."
                                                >
                                                    <RefreshIcon className="h-4 w-4" />
                                                    <span>재분석</span>
                                                </button>
                                                <button
                                                    onClick={(e) => handleViewSnapshot(e, analysis)}
                                                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors"
                                                    title="저장 시점의 분석 리포트를 다시 봅니다."
                                                >
                                                    <ChartIcon className="h-4 w-4" />
                                                    <span>스냅샷</span>
                                                </button>
                                                <button
                                                    onClick={(e) => handleRemoveClick(e, ticker)}
                                                    className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-900/30 rounded-full transition-colors"
                                                    aria-label="Remove from history"
                                                >
                                                    <TrashIcon className="h-4 w-4" />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                                    <div>
                                        <p className="text-gray-500 font-semibold">현재 기준가</p>
                                        <p className="font-mono text-gray-200">{currentPrice > 0 ? `${currentPrice.toLocaleString(undefined, formatOptions)}${currency}` : 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-green-500 font-semibold">매수 진입점</p>
                                        <p className="font-mono text-green-400">{buyPlan?.recommendedPrice?.toLocaleString(undefined, formatOptions)}{currency}</p>
                                    </div>
                                    <div>
                                        <p className="text-red-500 font-semibold">손절매 가격</p>
                                        <p className="font-mono text-red-400">{buyPlan?.stopLossPrice?.toLocaleString(undefined, formatOptions)}{currency}</p>
                                    </div>
                                </div>
                                {isActionable && currentPrice > 0 && (
                                    <SignalStatusVisualizer
                                        currentPrice={currentPrice}
                                        entryPrice={buyPlan.recommendedPrice!}
                                        stopLossPrice={buyPlan.stopLossPrice!}
                                        currency={currency}
                                        marketTarget={marketTarget}
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};