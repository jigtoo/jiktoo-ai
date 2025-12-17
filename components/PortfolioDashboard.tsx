

import React, { useState } from 'react';
import type { PortfolioItem, PortfolioItemAnalysis, PortfolioOverviewAnalysis, MarketTarget, AIBriefing, PortfolioImmunityAnalysis } from '../types';
import type { useRiskDashboard } from '../hooks/useRiskDashboard';
import { LoadingSpinner } from './LoadingSpinner';
import { PlusIcon, PortfolioIcon, InfoIcon, EditIcon, TrashIcon, BrainIcon } from './icons';
import { PortfolioOverview } from './PortfolioOverview';
import { ErrorDisplay } from './ErrorDisplay';
import { marketInfo } from '../services/marketInfo';
import { PortfolioImmunityDashboard } from './PortfolioImmunityDashboard';
import { RiskDashboard } from './RiskDashboard';

interface PortfolioDashboardProps {
    portfolioItems: PortfolioItem[];
    portfolioCash: number;
    analysis: PortfolioItemAnalysis[];
    overview: PortfolioOverviewAnalysis | null;
    isAnalysisLoading: boolean;
    isOverviewLoading: boolean;
    error: string | null;
    onRefresh: () => void;
    onOpenForm: (item?: Partial<PortfolioItem>) => void;
    onDeletePosition: (id: string) => void;
    onUpdateCash: (newCash: number) => void;
    marketTarget: MarketTarget;
    triggerAutopilotForStock: (itemId: string, triggerEvent: string) => void;
    isBriefingLoading: boolean;
    onViewBriefing: (item: PortfolioItem) => void;
    immunityAnalysis: PortfolioImmunityAnalysis | null;
    isImmunityAnalysisLoading: boolean;
    onSelectStock: (ticker: string, rationale: string, stockName: string) => void;
    riskDashboardData: ReturnType<typeof useRiskDashboard>;
}

const PortfolioItemRow: React.FC<{
    item: PortfolioItem;
    analysis?: PortfolioItemAnalysis;
    onOpenForm: (item: PortfolioItem) => void;
    onDeletePosition: (id: string) => void;
    marketTarget: MarketTarget;
    triggerAutopilot: (itemId: string, triggerEvent: string) => void;
    isBriefingLoading: boolean;
    onViewBriefing: (item: PortfolioItem) => void;
}> = ({ item, analysis, onOpenForm, onDeletePosition, marketTarget, triggerAutopilot, isBriefingLoading, onViewBriefing }) => {
    const currency = marketInfo[marketTarget].currency;
    const formatOptions = { maximumFractionDigits: marketTarget === 'KR' ? 0 : 2 };

    if (item.executionStatus === 'executing') {
        return (
            <tr className="border-b border-gray-700/50 bg-blue-900/20 animate-pulse">
                <td className="px-4 py-3">
                    <div className="font-semibold text-white">{item.stockName}</div>
                    <div className="font-mono text-xs text-gray-500">{item.ticker}</div>
                </td>
                <td colSpan={4} className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2 text-sm text-cyan-300">
                        <LoadingSpinner className="w-8 h-8" />
                        <span>AI 최적 실행 중... (체결가 탐색)</span>
                    </div>
                </td>
                <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2 opacity-50">
                        <button disabled className="p-1 text-gray-600"><EditIcon className="h-4 w-4" /></button>
                        <button disabled className="p-1 text-gray-600"><TrashIcon className="h-4 w-4" /></button>
                        <button disabled className="p-1 text-gray-600"><BrainIcon className="h-4 w-4" /></button>
                    </div>
                </td>
            </tr>
        );
    }

    const pnl = analysis?.profitOrLoss ?? 0;
    const pnlPercent = analysis?.profitOrLossPercent ?? 0;

    const pnlColor = pnl >= 0 ? 'text-green-400' : 'text-red-400';

    const autopilotStatusText = () => {
        switch (item.autopilotStatus) {
            case 'analyzing':
                return (
                    <div className="flex items-center gap-2 text-xs text-yellow-300">
                        <div className="w-16 h-8 flex items-center justify-center">
                            <LoadingSpinner />
                        </div>
                        <span className="flex-grow">이벤트 감지! AI 분석 중...</span>
                    </div>
                );
            case 'briefing_ready':
                return (
                    <div className="p-2 bg-gray-900/50 rounded-md">
                        <div className="flex items-center gap-2 text-xs font-bold text-cyan-300">
                            <BrainIcon className="h-4 w-4" />
                            <span>AI 오토파일럿 브리핑</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1 line-clamp-2">"{item.aiBriefing?.summary}"</p>
                        <button onClick={() => onViewBriefing(item)} className="text-xs text-cyan-400 hover:underline mt-1">자세히 보기</button>
                    </div>
                );
            case 'monitoring':
            default:
                return <p className="text-xs text-gray-500 italic">AI가 모니터링 중...</p>;
        }
    };

    return (
        <tr className={`border-b border-gray-700/50 hover:bg-gray-800/50 transition-colors duration-200 ${item.autopilotStatus === 'briefing_ready' ? 'bg-blue-900/20' : ''}`}>
            <td className="px-4 py-3">
                <div className="font-semibold text-white">{item.stockName}</div>
                <div className="font-mono text-xs text-gray-500">{item.ticker}</div>
            </td>
            <td className="px-4 py-3 align-middle">
                {autopilotStatusText()}
            </td>
            <td className="px-4 py-3 text-right font-mono">{item.quantity.toLocaleString()}</td>
            <td className="px-4 py-3 text-right font-mono">{item.entryPrice.toLocaleString(undefined, formatOptions)}</td>
            <td className={`px-4 py-3 text-right font-mono ${pnlColor}`}>
                {analysis ? `${pnlPercent >= 0 ? '+' : ''}${pnlPercent.toFixed(2)}%` : '-'}
            </td>
            <td className="px-4 py-3 text-center">
                <div className="flex items-center justify-center gap-2">
                    <button onClick={() => onOpenForm(item)} className="p-1 text-gray-400 hover:text-cyan-400" title="수정"><EditIcon className="h-4 w-4" /></button>
                    <button onClick={() => onDeletePosition(item.id)} className="p-1 text-gray-400 hover:text-red-400" title="삭제"><TrashIcon className="h-4 w-4" /></button>
                    <div className="relative group">
                        <button
                            onClick={() => triggerAutopilot(item.id, '사용자 수동 재분석 요청')}
                            className="p-1 text-gray-400 hover:text-yellow-400 disabled:opacity-50"
                            title="AI 재분석"
                            disabled={isBriefingLoading}
                        >
                            <BrainIcon className={`h-4 w-4 ${isBriefingLoading ? 'animate-pulse' : ''}`} />
                        </button>
                    </div>
                </div>
            </td>
        </tr>
    );
};

export const PortfolioDashboard: React.FC<PortfolioDashboardProps> = (props) => {
    const {
        portfolioItems, portfolioCash, analysis, overview, isAnalysisLoading, isOverviewLoading, error,
        onRefresh, onOpenForm, onDeletePosition, onUpdateCash, marketTarget,
        triggerAutopilotForStock, isBriefingLoading, onViewBriefing,
        immunityAnalysis, isImmunityAnalysisLoading, onSelectStock,
        riskDashboardData,
    } = props;

    const usButtonClass = 'from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600';
    const krButtonClass = 'from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700';
    const buttonClass = marketTarget === 'US' ? usButtonClass : krButtonClass;

    const isLoading = isAnalysisLoading || isOverviewLoading;
    const currency = marketInfo[marketTarget].currency;

    const renderContent = () => {
        if (isLoading && portfolioItems.length > 0) {
            return <div className="py-20"><LoadingSpinner message="포트폴리오를 분석 중입니다..." /></div>;
        }

        if (error) {
            return <ErrorDisplay title="포트폴리오 분석 실패" message={error} onRetry={onRefresh} className="my-8" />;
        }

        if (portfolioItems.length === 0) {
            return (
                <div className="text-center text-gray-500 py-20 px-4 bg-gray-800/30 rounded-lg">
                    <InfoIcon className="h-16 w-16 mx-auto mb-4 text-gray-600" />
                    <h3 className="text-xl font-semibold text-gray-400">포트폴리오가 비어있습니다.</h3>
                    <p className="mt-2">위의 '포지션 추가' 버튼을 눌러 첫 종목을 등록하거나, '탐색' 탭에서 분석 후 추가해보세요.</p>
                </div>
            );
        }

        const analysisMap = new Map(analysis.map(a => [a.id, a]));

        return (
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-300">
                    <thead className="text-xs text-gray-400 uppercase bg-gray-900/50">
                        <tr>
                            <th scope="col" className="px-4 py-3">종목</th>
                            <th scope="col" className="px-4 py-3 w-2/5">AI 오토파일럿 상태</th>
                            <th scope="col" className="px-4 py-3 text-right">수량</th>
                            <th scope="col" className="px-4 py-3 text-right">평균단가({currency})</th>
                            <th scope="col" className="px-4 py-3 text-right">수익률(%)</th>
                            <th scope="col" className="px-4 py-3 text-center">관리</th>
                        </tr>
                    </thead>
                    <tbody>
                        {portfolioItems.map(item => (
                            <PortfolioItemRow
                                key={item.id}
                                item={item}
                                analysis={analysisMap.get(item.id)}
                                onOpenForm={onOpenForm}
                                onDeletePosition={onDeletePosition}
                                marketTarget={marketTarget}
                                triggerAutopilot={triggerAutopilotForStock}
                                isBriefingLoading={isBriefingLoading}
                                onViewBriefing={onViewBriefing}
                            />
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className="animate-fade-in space-y-8">
            <header className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div className="flex items-center gap-3">
                    <PortfolioIcon />
                    <h2 className="text-3xl font-bold text-gray-200">내 포트폴리오</h2>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={onRefresh}
                        disabled={isLoading}
                        className="px-4 py-2 bg-gray-700 text-white font-semibold rounded-lg hover:bg-gray-600 disabled:opacity-50"
                    >
                        새로고침
                    </button>
                    <button
                        onClick={() => onOpenForm()}
                        className={`flex items-center gap-2 px-4 py-2 bg-gradient-to-r ${buttonClass} text-white font-semibold rounded-lg`}
                    >
                        <PlusIcon className="h-5 w-5" />
                        <span>포지션 추가</span>
                    </button>
                </div>
            </header>

            <PortfolioOverview
                overview={overview} portfolioCash={portfolioCash} isLoading={isOverviewLoading}
                onRefresh={onRefresh} onUpdateCash={onUpdateCash} marketTarget={marketTarget}
            />

            <RiskDashboard
                riskData={riskDashboardData.riskData}
                isLoading={riskDashboardData.isLoading}
                error={riskDashboardData.error}
                onRefresh={riskDashboardData.onRefresh}
                portfolioItems={portfolioItems}
            />

            {isImmunityAnalysisLoading ? (
                <div className="py-10"><LoadingSpinner message="포트폴리오 면역 시스템 분석 중..." /></div>
            ) : immunityAnalysis ? (
                <PortfolioImmunityDashboard
                    analysis={immunityAnalysis}
                    onSelectStock={onSelectStock}
                />
            ) : null}

            <div className="bg-gray-800/50 border border-gray-700 rounded-xl shadow-lg">
                {renderContent()}
            </div>
        </div>
    );
};