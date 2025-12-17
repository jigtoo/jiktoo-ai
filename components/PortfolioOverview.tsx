

import React, { useState, useEffect } from 'react';
import type { PortfolioOverviewAnalysis, PortfolioCompositionItem, MarketTarget } from '../types';
import { InfoIcon, LogoIcon, EditIcon, CheckCircleIcon, CloseIcon } from './icons';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorDisplay } from './ErrorDisplay';
import { marketInfo } from '../services/marketInfo';


const HealthScoreGauge: React.FC<{ score: number }> = ({ score }) => {
    const percentage = Math.max(0, Math.min(100, score));
    const radius = 32;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    let colorClass = 'text-green-400';
    if (score < 70) colorClass = 'text-yellow-400';
    if (score < 40) colorClass = 'text-red-400';

    return (
        <div className="relative w-20 h-20 flex items-center justify-center">
            <svg className="w-full h-full" viewBox="0 0 72 72">
                <circle className="text-gray-700" strokeWidth="6" stroke="currentColor" fill="transparent" r={radius} cx="36" cy="36" />
                <circle
                    className={colorClass}
                    strokeWidth="6"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r={radius}
                    cx="36"
                    cy="36"
                    style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dashoffset 0.5s ease-in-out' }}
                />
            </svg>
            <span className={`absolute text-xl font-bold ${colorClass}`}>{score}</span>
        </div>
    );
};

const DonutChart: React.FC<{ data: PortfolioCompositionItem[] }> = ({ data }) => {
    if (!data || data.length === 0) return <div className="flex items-center justify-center h-full text-gray-500">데이터 없음</div>;

    // --- Chart Logic Improvement ---
    const cashItem = data.find(item => item.name === '현금');
    const stockItems = data.filter(item => item.name !== '현금');
    
    const sortedStocks = [...stockItems].sort((a, b) => b.percentage - a.percentage || b.value - a.value);

    const visibleItems: PortfolioCompositionItem[] = [];
    let otherPercentage = 0;
    
    const maxVisibleStocks = cashItem ? 4 : 5;

    sortedStocks.forEach(item => {
        if (visibleItems.length < maxVisibleStocks && item.percentage > 2) {
            visibleItems.push(item);
        } else {
            otherPercentage += item.percentage;
        }
    });

    if (otherPercentage > 0) {
        visibleItems.push({ name: '기타', value: 0, percentage: otherPercentage });
    }

    if (cashItem) {
        visibleItems.push(cashItem);
    }
    
    const finalDisplayItems = visibleItems.sort((a, b) => b.percentage - a.percentage || b.value - a.value || a.name.localeCompare(b.name));

    // --- End of Improvement ---

    const radius = 60;
    const circumference = 2 * Math.PI * radius;
    let accumulatedPercentage = 0;

    const colors = ['#22D3EE', '#818CF8', '#F472B6', '#34D399', '#FBBF24', '#93C5FD', '#A78BFA'];

    return (
        <div className="flex items-center gap-4 flex-wrap justify-center">
            <svg width="140" height="140" viewBox="0 0 140 140">
                <g transform="rotate(-90 70 70)">
                    {finalDisplayItems.map((item, index) => {
                        const segmentLength = circumference * item.percentage / 100;
                        const dasharray = `${segmentLength} ${circumference - segmentLength}`;
                        const dashoffset = -(circumference * accumulatedPercentage / 100);
                        accumulatedPercentage += item.percentage;
                        
                        return (
                            <circle
                                key={`${item.name}-${item.percentage}`}
                                cx="70"
                                cy="70"
                                r={radius}
                                fill="transparent"
                                stroke={colors[index % colors.length]}
                                strokeWidth="20"
                                strokeDasharray={dasharray}
                                strokeDashoffset={dashoffset}
                            />
                        );
                    })}
                </g>
            </svg>
            <div className="text-sm space-y-1">
                {finalDisplayItems.map((item, index) => (
                    <div key={`${item.name}-${item.percentage}-legend`} className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: colors[index % colors.length] }}></span>
                        <span className="text-gray-300 truncate max-w-[100px]">{item.name}</span>
                        <span className="font-mono text-gray-400">{item.percentage.toFixed(1)}%</span>
                    </div>
                ))}
            </div>
        </div>
    );
};


interface PortfolioOverviewProps {
    overview: PortfolioOverviewAnalysis | null;
    portfolioCash: number;
    isLoading: boolean;
    onRefresh: () => void;
    onUpdateCash: (newCash: number) => void;
    marketTarget: MarketTarget;
}

export const PortfolioOverview: React.FC<PortfolioOverviewProps> = ({ overview, portfolioCash, isLoading, onRefresh, onUpdateCash, marketTarget }) => {
    const [isEditingCash, setIsEditingCash] = useState(false);
    const [cashInput, setCashInput] = useState(portfolioCash.toString());
    const currency = marketInfo[marketTarget].currency;


    useEffect(() => {
        if (!isEditingCash) {
            setCashInput(portfolioCash.toString());
        }
    }, [portfolioCash, isEditingCash]);

    const handleSaveCash = () => {
        const newCash = parseFloat(cashInput);
        if (!isNaN(newCash) && newCash >= 0) {
            onUpdateCash(newCash);
            setIsEditingCash(false);
        } else {
            alert('유효한 현금 금액을 입력해주세요.');
        }
    };

    const handleCancelEdit = () => {
        setIsEditingCash(false);
        setCashInput(portfolioCash.toString());
    };

    if (isLoading) {
        return (
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl shadow-lg p-6 min-h-[180px] flex items-center justify-center">
                <LoadingSpinner message="포트폴리오 종합 진단 중..." />
            </div>
        );
    }

    if (!overview) {
        return (
             <div className="bg-gray-800/50 border border-gray-700 rounded-xl shadow-lg p-6 min-h-[180px]">
                <ErrorDisplay
                    title="종합 진단 실패"
                    message="포트폴리오 총평 데이터를 불러오는 데 실패했습니다."
                    onRetry={onRefresh}
                />
            </div>
        );
    }
    
    const totalValue = (overview?.composition ?? []).reduce((sum, item) => sum + item.value, 0);
    const formatOptions = { maximumFractionDigits: marketTarget === 'KR' ? 0 : 2 };

    return (
        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/40 border border-gray-700 rounded-xl shadow-2xl p-6">
            <div className="flex items-center justify-center gap-2 mb-4">
                 <h3 className="text-xl font-bold text-center text-gray-200">AI 포트폴리오 총평</h3>
                 <span title="AI가 개별 종목을 넘어, 포트폴리오 전체의 건강 상태를 종합적으로 분석하여 점수, 진단, 자산 구성으로 보여줍니다.">
                    <InfoIcon className="h-5 w-5 text-gray-500 cursor-help" />
                 </span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-center">
                {/* Health Score & Values */}
                <div className="lg:col-span-2 flex flex-col md:flex-row lg:flex-col items-center text-center gap-6">
                    <div className="flex-shrink-0">
                        <h4 className="text-base font-bold text-gray-300 mb-2">건강 점수</h4>
                        <HealthScoreGauge score={overview?.healthScore ?? 0} />
                    </div>
                    <div className="w-full">
                        <div className="bg-gray-900/40 p-3 rounded-md">
                            <h4 className="text-sm text-gray-400">총 평가자산</h4>
                            <p className="text-2xl font-bold text-cyan-300">{currency}{totalValue.toLocaleString(undefined, formatOptions)}</p>
                        </div>
                         <div className="bg-gray-900/40 p-3 rounded-md mt-3">
                            <h4 className="text-sm text-gray-400">보유 현금</h4>
                            {isEditingCash ? (
                                <div className="flex items-center justify-center gap-1 mt-1">
                                    <input
                                        type="number"
                                        value={cashInput}
                                        onChange={(e) => setCashInput(e.target.value)}
                                        className="w-36 bg-gray-800 border border-gray-600 rounded-md px-2 py-1 text-white text-xl text-center focus:ring-cyan-500 focus:border-cyan-500"
                                        autoFocus
                                        onKeyDown={(e) => { if (e.key === 'Enter') handleSaveCash(); if (e.key === 'Escape') handleCancelEdit(); }}
                                    />
                                    <button onClick={handleSaveCash} className="p-1 text-green-400 hover:bg-green-900/50 rounded-full"><CheckCircleIcon className="h-6 w-6" /></button>
                                    <button onClick={handleCancelEdit} className="p-1 text-red-400 hover:bg-red-900/50 rounded-full"><CloseIcon className="h-6 w-6" /></button>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center gap-2">
                                    <p className="text-2xl font-bold text-white">{currency}{portfolioCash.toLocaleString(undefined, formatOptions)}</p>
                                    <button onClick={() => setIsEditingCash(true)} className="p-1 text-gray-500 hover:text-cyan-400 transition-colors" aria-label="보유 현금 수정">
                                        <EditIcon className="h-5 w-5" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                
                {/* AI Summary */}
                <div className="lg:col-span-3 grid grid-cols-1 gap-6">
                     <div>
                        <h4 className="flex items-center gap-2 text-base font-bold text-gray-300 mb-2">
                            <LogoIcon className="h-5 w-5" />
                            AI 종합 진단
                        </h4>
                        <div className="text-gray-300 text-sm bg-gray-900/40 p-4 rounded-md border-l-4 border-cyan-500">
                            <p className="leading-relaxed">{overview?.summary ?? '진단 정보를 불러올 수 없습니다.'}</p>
                        </div>
                    </div>

                    {/* Composition Chart */}
                    <div className="flex flex-col items-center">
                         <h4 className="text-base font-bold text-gray-300 mb-2">자산 구성</h4>
                         <DonutChart data={overview?.composition ?? []} />
                    </div>
                </div>
            </div>
        </div>
    );
};
