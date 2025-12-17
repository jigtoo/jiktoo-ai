


import React, { useState } from 'react';
import type { SuccessStoryItem, AnalysisResult } from '../types';
import { LoadingSpinner } from './LoadingSpinner';
import { InfoIcon, TradingPlaybookIcon, TrendingUpIcon, ChartIcon, StrategyIcon, TrendingDownIcon } from './icons';
import { ErrorDisplay } from './ErrorDisplay';

interface TradingPlaybookDashboardProps {
    stories: SuccessStoryItem[];
    isLoading: boolean;
    error: string | null;
    onReanalyze: (ticker: string, stockName: string) => void;
    onViewSnapshot: (analysis: AnalysisResult) => void;
    onRefresh?: () => void;
}

const statusConfig: { [key: string]: { color: string; bgColor: string; } } = {
    '매수 보류': { color: 'text-red-300', bgColor: 'bg-red-900/40' },
    '신중한 매수 구간': { color: 'text-yellow-300', bgColor: 'bg-yellow-900/40' },
    '적극적 매수 구간': { color: 'text-green-300', bgColor: 'bg-green-900/40' },
};

const StoryCard: React.FC<{ item: SuccessStoryItem; onReanalyze: () => void; onViewSnapshot: () => void; }> = ({ item, onReanalyze, onViewSnapshot }) => {
    const marketStyle = statusConfig[item.marketCondition] || statusConfig['신중한 매수 구간'];

    return (
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg flex flex-col justify-between h-full shadow-lg hover:border-cyan-500/50 transition-colors transform hover:-translate-y-1">
            <div className="p-4">
                <div className="grid grid-cols-[1fr_auto] items-start gap-2">
                    <div>
                        <h4 className="text-lg font-bold text-cyan-300">{item.stockName}</h4>
                        <p className="font-mono text-sm text-gray-500">{item.ticker}</p>
                    </div>
                    <span className={`flex-shrink-0 px-2 py-0.5 text-xs font-semibold rounded ${marketStyle.bgColor} ${marketStyle.color}`}>
                        {item.marketCondition}
                    </span>
                </div>
                <p className="mt-2 text-xs text-gray-400">돌파일: {item.breakoutDate}</p>
            </div>

            {/* Key Learnings - MOVED TO TOP */}
            <div className="px-4 pb-4">
                <div className="bg-gray-900/50 p-3 rounded-md border-l-4 border-cyan-500">
                    <h5 className="flex items-center gap-2 font-semibold text-cyan-300 mb-1">
                        <StrategyIcon className="h-5 w-5" />
                        핵심 학습 포인트
                    </h5>
                    <p className="text-xs text-gray-300">{item.keyLearnings}</p>
                </div>
            </div>

            <div className="p-4 pt-0 space-y-4">
                {/* Performance Metrics */}
                <div className="grid grid-cols-2 gap-2 text-center text-xs">
                    <div className="bg-gray-700/40 p-2 rounded-md">
                        <p className="font-semibold text-gray-400">최고 수익률</p>
                        <p className={`font-bold text-lg flex items-center justify-center gap-1 ${(item.performanceMetrics.maxGainPercent ?? 0) > 0 ? 'text-green-400' : 'text-gray-200'}`}>
                            <TrendingUpIcon className="h-4 w-4" />
                            {(item.performanceMetrics.maxGainPercent ?? 0).toFixed(1)}%
                        </p>
                    </div>
                    <div className="bg-gray-700/40 p-2 rounded-md">
                        <p className="font-semibold text-gray-400">고점 대비 하락률</p>
                        <p className={`font-bold text-lg flex items-center justify-center gap-1 ${(item.performanceMetrics.drawdownFromPeakPercent ?? 0) < 0 ? 'text-red-400' : 'text-gray-200'}`}>
                            <TrendingDownIcon className="h-4 w-4" />
                            {(item.performanceMetrics.drawdownFromPeakPercent ?? 0).toFixed(1)}%
                        </p>
                    </div>
                </div>
                <div className="text-center text-xs text-gray-400">
                    1차 목표 도달까지: <span className="font-bold text-white">{item.performanceMetrics.timeToTarget || '미도달'}</span>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2">
                    <button
                        onClick={onViewSnapshot}
                        className="w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-gray-600/20 text-gray-300 text-sm font-semibold rounded-md hover:bg-gray-600/40 hover:text-white transition-colors"
                    >
                        <ChartIcon />
                        돌파 시점 분석 보기
                    </button>
                    <button
                        onClick={onReanalyze}
                        className="w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-cyan-600/20 text-cyan-300 text-sm font-semibold rounded-md hover:bg-cyan-600/40 hover:text-white transition-colors"
                    >
                        <span>현재 시점 재분석</span>
                    </button>
                </div>
            </div>
        </div>
    );
};


export const TradingPlaybookDashboard: React.FC<TradingPlaybookDashboardProps> = ({ stories, isLoading, error, onReanalyze, onViewSnapshot, onRefresh }) => {
    const [sortBy, setSortBy] = useState<'date' | 'performance'>('date');

    const sortedStories = [...(stories || [])].sort((a, b) => {
        if (sortBy === 'performance') {
            return (b.performanceMetrics.maxGainPercent ?? 0) - (a.performanceMetrics.maxGainPercent ?? 0);
        }
        // Default to date
        return new Date(b.breakoutDate).getTime() - new Date(a.breakoutDate).getTime();
    });

    const tabStyle = "px-4 py-2 text-sm font-semibold rounded-md transition-colors";
    const activeTabStyle = "bg-cyan-600/50 text-white";
    const inactiveTabStyle = "text-gray-400 hover:bg-gray-700";

    return (
        <div className="animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-4">
                <div className="flex items-center gap-3">
                    <TradingPlaybookIcon className="h-8 w-8 text-cyan-400" />
                    <div>
                        <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">AI 트레이딩 플레이북</h2>
                        <p className="text-sm text-gray-400">과거의 성공 사례를 통해 AI의 투자 전략을 검증하고, 이기는 원칙을 학습합니다.</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 p-1 bg-gray-800/80 rounded-lg">
                    <button onClick={() => setSortBy('date')} className={`${tabStyle} ${sortBy === 'date' ? activeTabStyle : inactiveTabStyle}`}>
                        최신순
                    </button>
                    <button onClick={() => setSortBy('performance')} className={`${tabStyle} ${sortBy === 'performance' ? activeTabStyle : inactiveTabStyle}`}>
                        성과순
                    </button>
                </div>
            </div>

            {isLoading && <LoadingSpinner message="성공 기록을 분석하고 복기하는 중입니다..." showWittyMessages={true} />}

            {error && (
                <ErrorDisplay
                    title="플레이북 로드 실패"
                    message={error}
                    onRetry={onRefresh}
                />
            )}

            {!isLoading && !error && sortedStories.length === 0 && (
                <div className="text-center text-gray-500 py-12 px-4 bg-gray-800/30 rounded-lg">
                    <InfoIcon className="h-12 w-12 mx-auto mb-4 text-gray-600" />
                    <h3 className="text-xl font-semibold text-gray-400">아직 플레이북이 없습니다.</h3>
                    <p className="mt-2">관심 종목이 피봇 포인트를 돌파하면 여기에 자동으로 케이스 스터디가 생성됩니다.</p>
                </div>
            )}

            {!isLoading && !error && sortedStories.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {sortedStories.map((story, index) => (
                        <StoryCard
                            key={`${story.ticker}-${index}`}
                            item={story}
                            onReanalyze={() => onReanalyze(story.ticker, story.stockName)}
                            onViewSnapshot={() => story.originalAnalysisSnapshot && onViewSnapshot(story.originalAnalysisSnapshot)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};