// components/MorningBriefingDashboard.tsx
import React, { useState } from 'react';
import { useMorningBriefing } from '../hooks/useMorningBriefing';
import type { MarketTarget } from '../types';
import { LoadingSpinner } from './LoadingSpinner';
import { SunIcon, ChevronDownIcon, ChevronUpIcon } from './icons';

interface MorningBriefingDashboardProps {
    marketTarget: MarketTarget;
}

export const MorningBriefingDashboard: React.FC<MorningBriefingDashboardProps> = ({ marketTarget }) => {
    const { briefing, isLoading, error, generateBriefing } = useMorningBriefing(marketTarget, null, null);
    const [isExpanded, setIsExpanded] = useState(true);

    if (isLoading) {
        return <LoadingSpinner message="모닝 브리핑을 불러오는 중..." />;
    }

    if (error) {
        return (
            <div className="bg-gradient-to-br from-red-900/20 to-red-800/10 border border-red-700/50 rounded-xl p-6 text-center">
                <p className="text-red-400 mb-4">{error}</p>
                <button
                    onClick={generateBriefing}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                    재시도
                </button>
            </div>
        );
    }

    if (!briefing) {
        return (
            <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/30 border border-gray-700/50 rounded-xl p-8 text-center">
                <SunIcon className="h-16 w-16 mx-auto mb-4 text-yellow-500/50" />
                <h3 className="text-xl font-semibold text-gray-300 mb-2">오늘의 모닝 브리핑이 아직 생성되지 않았습니다</h3>
                <p className="text-gray-500 mb-6">매일 아침 자동으로 생성됩니다</p>
                <button
                    onClick={generateBriefing}
                    className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold rounded-lg transition-all transform hover:scale-105"
                >
                    지금 생성하기
                </button>
            </div>
        );
    }

    return (
        <div className="animate-fade-in space-y-4">
            {/* Header */}
            <header className="text-center mb-6">
                <div className="inline-block bg-gradient-to-br from-yellow-500/20 to-orange-500/20 p-3 rounded-full mb-4">
                    <SunIcon className="h-12 w-12 text-yellow-400" />
                </div>
                <h2 className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
                    모닝 브리핑
                </h2>
                <p className="text-gray-400 mt-2">AI가 분석한 오늘의 시장 전망</p>
            </header>

            {/* Main Briefing Card - Accordion Style */}
            <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/60 border border-gray-700/50 rounded-xl overflow-hidden shadow-2xl">
                {/* Accordion Header */}
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-700/30 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <h3 className="text-xl font-bold text-yellow-400">{briefing.title}</h3>
                    </div>
                    {isExpanded ? (
                        <ChevronUpIcon className="h-6 w-6 text-gray-400" />
                    ) : (
                        <ChevronDownIcon className="h-6 w-6 text-gray-400" />
                    )}
                </button>

                {/* Accordion Content */}
                {isExpanded && (
                    <div className="px-6 pb-6 space-y-6 animate-fade-in">
                        {/* Summary */}
                        <div className="bg-gradient-to-br from-blue-900/20 to-purple-900/10 border border-blue-700/30 rounded-lg p-4">
                            <h4 className="text-sm font-semibold text-blue-400 mb-2 uppercase tracking-wide">요약</h4>
                            <p className="text-gray-300 leading-relaxed">{briefing.summary}</p>
                        </div>

                        {/* Key Points */}
                        <div className="space-y-3">
                            <h4 className="text-sm font-semibold text-orange-400 uppercase tracking-wide flex items-center gap-2">
                                <span className="w-1 h-4 bg-orange-500 rounded-full"></span>
                                핵심 포인트
                            </h4>
                            <div className="space-y-2">
                                {briefing.keyPoints.map((point, index) => (
                                    <div
                                        key={index}
                                        className="flex items-start gap-3 bg-gradient-to-r from-gray-800/60 to-gray-900/40 border border-gray-700/40 rounded-lg p-3 hover:border-orange-500/50 transition-colors"
                                    >
                                        <div className="flex-shrink-0 w-6 h-6 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                            {index + 1}
                                        </div>
                                        <p className="text-gray-300 leading-relaxed flex-1">{point}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between pt-4 border-t border-gray-700/50">
                            <span className="text-xs text-gray-500">
                                생성 시간: {new Date().toLocaleString('ko-KR')}
                            </span>
                            <button
                                onClick={generateBriefing}
                                className="text-xs text-yellow-400 hover:text-yellow-300 transition-colors"
                            >
                                새로고침
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
