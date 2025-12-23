// components/RecentAnalysisHistory.tsx
import React from 'react';
import type { AnalysisResult, MarketTarget } from '../types';
import { HistoryIcon, InfoIcon, CheckCircleIcon, AlertIcon } from './icons';

interface RecentAnalysisHistoryProps {
    history: AnalysisResult[];
    onView: (result: AnalysisResult) => void;
    marketTarget: MarketTarget;
}

const statusConfig = {
    ActionableSignal: { text: '매수 신호', color: 'text-green-400', icon: <CheckCircleIcon className="h-4 w-4" /> },
    Watchlist: { text: '관심 종목', color: 'text-cyan-400', icon: <AlertIcon className="h-4 w-4" /> },
    NotActionable: { text: '기준 미달', color: 'text-yellow-400', icon: <InfoIcon className="h-4 w-4" /> },
};

export const RecentAnalysisHistory: React.FC<RecentAnalysisHistoryProps> = ({ history, onView, marketTarget }) => {
    return (
        <div className="mt-12 animate-fade-in">
            <div className="flex items-center gap-3 mb-6">
                <HistoryIcon />
                <h2 className="text-2xl font-bold text-gray-200">최근 분석 기록</h2>
            </div>

            {history.length === 0 ? (
                <div className="text-center text-gray-500 py-12 px-4 bg-gray-800/30 rounded-lg">
                    <InfoIcon className="h-12 w-12 mx-auto mb-4 text-gray-600" />
                    <h3 className="text-xl font-semibold text-gray-400">분석 기록이 없습니다.</h3>
                    <p className="mt-2 max-w-md mx-auto">
                        상단의 검색창을 이용해 종목을 분석하면 여기에 기록이 남습니다.
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {history.map(item => {
                        const status = statusConfig[item.status] || { text: item.status, color: 'text-gray-400', icon: <InfoIcon className="h-4 w-4" /> };

                        // Ensure priceTimestamp is a valid date or fallback to current date
                        const dateToDisplay = item.priceTimestamp
                            ? new Date(item.priceTimestamp)
                            : new Date();

                        const formattedDate = !isNaN(dateToDisplay.getTime())
                            ? dateToDisplay.toLocaleDateString('ko-KR')
                            : new Date().toLocaleDateString('ko-KR'); // Fallback if parsed date is invalid

                        return (
                            <div
                                key={item.ticker}
                                className="bg-gray-800/60 border border-gray-700/80 rounded-lg p-3 sm:p-4 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                            >
                                <div className="flex-grow">
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <h3 className="text-lg font-bold text-gray-100">{item.stockName}</h3>
                                        <p className="font-mono text-gray-400">({item.ticker})</p>
                                        <span className={`flex items-center gap-1 px-2 py-0.5 text-xs font-bold rounded-md ${status.color}`}>
                                            {status.icon} {status.text}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">분석일: {formattedDate}</p>
                                </div>
                                <div className="flex-shrink-0 self-end sm:self-center">
                                    <button
                                        onClick={() => onView(item)}
                                        className="px-4 py-2 text-sm font-semibold bg-cyan-600 text-white rounded-md hover:bg-cyan-700 transition-colors"
                                    >
                                        분석 보기
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};