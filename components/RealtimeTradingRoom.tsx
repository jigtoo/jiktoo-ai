// components/RealtimeTradingRoom.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import type { useDayTrader } from '../hooks/useDayTrader';
import type { MarketTarget, DayTraderSignal } from '../types';
import { DayTradeIcon, BrainIcon, ChartIcon, InfoIcon, CloseIcon } from './icons';
import { DayTraderSignalCard } from './AlphaScalperSignalCard'; // Reuse existing card
import { CSSTransition, TransitionGroup } from 'react-transition-group';

const LiveSignalFeed: React.FC<{ signals: DayTraderSignal[] }> = ({ signals }) => {
    const feedRef = useRef<HTMLDivElement>(null);
    const [selectedSignal, setSelectedSignal] = useState<DayTraderSignal | null>(null);

    useEffect(() => {
        if (feedRef.current) {
            feedRef.current.scrollTop = 0;
        }
    }, [signals]);
    
    const sortedSignals = [...signals].sort((a,b) => b.aiConfidence - a.aiConfidence);

    return (
        <div className="bg-gray-900/50 rounded-lg h-full flex flex-col">
            <h3 className="text-lg font-bold text-gray-200 p-3 border-b border-gray-700/50 flex-shrink-0">실시간 신호 피드</h3>
            <div ref={feedRef} className="flex-grow overflow-y-auto p-3 space-y-3">
                 {sortedSignals.length > 0 ? (
                    sortedSignals.map(signal => (
                        <div key={signal.ticker} className="animate-fade-in">
                            <DayTraderSignalCard signal={signal} />
                        </div>
                    ))
                ) : (
                    <div className="flex items-center justify-center h-full text-center text-gray-500">
                        <p>현재 포착된 단타 신호가 없습니다...</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const AICommentaryPanel: React.FC<{ signals: DayTraderSignal[] }> = ({ signals }) => {
    const [commentary, setCommentary] = useState<string[]>(["AI 코멘터리 시스템 가동..."]);
    
    useEffect(() => {
        if (signals.length > 0) {
            const latestSignal = signals[signals.length - 1];
            const newComment = `${new Date().toLocaleTimeString()} - [${latestSignal.stockName}] 신규 돌파 신호 포착. 신뢰도: ${latestSignal.aiConfidence}. ${latestSignal.rationale}`;
            setCommentary(prev => [newComment, ...prev.slice(0, 10)]);
        }
    }, [signals]);

    return (
        <div className="bg-gray-900/50 rounded-lg h-full flex flex-col">
            <h3 className="text-lg font-bold text-gray-200 p-3 border-b border-gray-700/50 flex-shrink-0">AI 코멘터리</h3>
            <div className="flex-grow overflow-y-auto p-3 space-y-2 text-sm">
                {commentary.map((c, i) => (
                    <p key={i} className="text-gray-300 animate-fade-in">{c}</p>
                ))}
            </div>
        </div>
    );
}

interface RealtimeTradingRoomProps {
    dayTrader: ReturnType<typeof useDayTrader>;
    marketTarget: MarketTarget;
}

export const RealtimeTradingRoom: React.FC<RealtimeTradingRoomProps> = ({ dayTrader, marketTarget }) => {
    const { signals, isLoading, error, handleScan } = dayTrader;
    
    useEffect(() => {
        // Start scanning as soon as the component mounts
        handleScan();
    }, [handleScan]);

    return (
        <div className="fixed inset-0 bg-gray-900 z-50 flex flex-col animate-fade-in font-sans">
            <header className="flex-shrink-0 bg-gray-800/80 backdrop-blur-sm border-b border-gray-700 p-3 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <DayTradeIcon className="h-8 w-8 text-cyan-400" />
                    <div>
                        <h1 className="text-2xl font-bold text-white">실시간 트레이딩 룸</h1>
                        <p className="text-xs text-gray-400">오직 단타 매매에만 집중하는 몰입형 환경입니다.</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleScan}
                        disabled={isLoading}
                        className="px-4 py-2 bg-gray-700 text-white font-semibold rounded-lg hover:bg-gray-600 disabled:opacity-50"
                    >
                        {isLoading ? '스캔 중...' : '수동 재탐색'}
                    </button>
                    <Link
                        to="/"
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700"
                    >
                        <CloseIcon className="h-5 w-5" />
                        <span>나가기</span>
                    </Link>
                </div>
            </header>

            <main className="flex-1 p-3 grid grid-cols-1 lg:grid-cols-3 gap-3 min-h-0">
                <div className="lg:col-span-1 min-h-0">
                    <LiveSignalFeed signals={signals || []} />
                </div>
                <div className="lg:col-span-2 min-h-0 grid grid-rows-2 gap-3">
                    <div className="bg-gray-900/50 rounded-lg flex items-center justify-center text-gray-500">
                        <ChartIcon className="h-10 w-10 mb-2" />
                        <p>미니 차트 및 호가창 (개발 예정)</p>
                    </div>
                     <div className="min-h-0">
                       <AICommentaryPanel signals={signals || []} />
                    </div>
                </div>
            </main>
        </div>
    );
};