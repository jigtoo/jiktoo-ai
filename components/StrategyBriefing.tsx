
import React from 'react';
import type { StrategicOutlook, MarketTarget } from '../types';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorDisplay } from './ErrorDisplay';
import { StrategyIcon, HistoryIcon, ScaleIcon, CalendarIcon, BrainIcon, TrendingUpIcon, AlertIcon, TrendingDownIcon } from './icons';

interface StrategicOutlookDashboardProps {
    outlook: StrategicOutlook | null;
    isLoading: boolean;
    error: string | null;
    onFetch: () => void;
    marketTarget: MarketTarget;
}

const InitialState: React.FC<{ onFetch: () => void, isLoading: boolean, marketTarget: MarketTarget }> = ({ onFetch, isLoading, marketTarget }) => {
    const usButtonClass = 'from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600';
    const krButtonClass = 'from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700';
    const buttonClass = marketTarget === 'US' ? usButtonClass : krButtonClass;

    return (
        <div className="text-center p-6 bg-gray-800/30 rounded-lg">
            <div className="inline-block bg-gray-700 p-4 rounded-full mb-4">
                <StrategyIcon className="h-12 w-12 text-cyan-400" />
            </div>
            <h2 className="text-3xl font-bold text-gray-100 mb-2">직투 나침반: AI 주간 전략 전망</h2>
            <p className="text-gray-400 max-w-3xl mx-auto mb-8">
                AI 수석 전략가가 지난주 시장을 복기하고, 다가올 주의 핵심 변수를 분석하여 당신의 투자 방향을 제시하는 주간 리포트를 생성합니다.
            </p>
            <button
                onClick={onFetch}
                disabled={isLoading}
                className={`px-8 py-4 bg-gradient-to-r ${buttonClass} text-white font-bold text-lg rounded-lg shadow-lg transition-transform transform hover:scale-105 disabled:opacity-50`}
            >
                <span>{isLoading ? 'AI 분석 중...' : '이번 주 전략 전망 리포트 생성'}</span>
            </button>
        </div>
    );
};

const ReportCard: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
    <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700 h-full">
        <h3 className="flex items-center gap-3 text-xl font-bold text-gray-200 mb-3">
            {icon}
            {title}
        </h3>
        <div className="space-y-3 text-sm text-gray-300 leading-relaxed">
            {children}
        </div>
    </div>
);

export const StrategyBriefingDashboard: React.FC<StrategicOutlookDashboardProps> = ({ outlook, isLoading, error, onFetch, marketTarget }) => {

    if (isLoading) {
        return <div className="mt-20"><LoadingSpinner message="AI 수석 전략가가 주간 시장 데이터를 분석하고 있습니다..." showWittyMessages={true} /></div>;
    }

    if (error) {
        return <ErrorDisplay title="전략 전망 생성 실패" message={error} onRetry={onFetch} />;
    }

    if (!outlook) {
        return <InitialState onFetch={onFetch} isLoading={isLoading} marketTarget={marketTarget} />;
    }
    
    const stanceConfig = {
        '공격적 매수': 'bg-green-500/20 border-green-500 text-green-300',
        '선별적 매수': 'bg-cyan-500/20 border-cyan-500 text-cyan-300',
        '관망 및 현금 확보': 'bg-yellow-500/20 border-yellow-500 text-yellow-300',
        '위험 관리': 'bg-red-500/20 border-red-500 text-red-300',
    };
    const stanceStyle = stanceConfig[outlook.aiStrategy.recommendedStance] || 'bg-gray-500/20 border-gray-500 text-gray-300';
    
    const importanceColor = {
        high: 'border-red-500',
        medium: 'border-yellow-500',
        low: 'border-blue-500',
    };

    return (
        <div className="space-y-8 animate-fade-in">
            <header className="text-center p-4 bg-gray-800/30 rounded-lg">
                <h2 className="text-3xl font-bold text-gray-100">직투 나침반: AI 주간 전략 전망</h2>
                <p className="text-gray-400">{outlook.title}</p>
            </header>
            
            <div className="p-6 bg-gray-800/70 border-l-4 border-cyan-500 rounded-lg">
                <h3 className="flex items-center gap-2 text-xl font-bold text-cyan-300 mb-2">
                    <BrainIcon />
                    AI 전략 요약
                </h3>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <p className="text-gray-200 text-base leading-relaxed flex-grow">"{outlook.aiStrategy.summary}"</p>
                    <div className={`flex-shrink-0 p-3 rounded-md text-center border ${stanceStyle}`}>
                        <p className="text-sm font-semibold">추천 스탠스</p>
                        <p className="font-bold text-lg">{outlook.aiStrategy.recommendedStance}</p>
                    </div>
                </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                <ReportCard icon={<HistoryIcon />} title="지난 주 시장 복기">
                    <p>{outlook.marketReview.summary}</p>
                    <div className="grid grid-cols-2 gap-4 pt-3">
                        <div>
                            <h4 className="flex items-center gap-1.5 font-semibold text-green-400 mb-1"><TrendingUpIcon/>주도 섹터</h4>
                            <div className="flex flex-wrap gap-1">
                                {outlook.marketReview.leadingSectors.map(s => <span key={s} className="px-2 py-0.5 text-xs bg-gray-700 rounded-md">{s}</span>)}
                            </div>
                        </div>
                         <div>
                            <h4 className="flex items-center gap-1.5 font-semibold text-red-400 mb-1"><TrendingDownIcon/>부진 섹터</h4>
                            <div className="flex flex-wrap gap-1">
                                {outlook.marketReview.laggingSectors.map(s => <span key={s} className="px-2 py-0.5 text-xs bg-gray-700 rounded-md">{s}</span>)}
                            </div>
                        </div>
                    </div>
                </ReportCard>

                <ReportCard icon={<ScaleIcon />} title="글로벌 매크로 & 리스크">
                    <p>{outlook.macroOutlook.summary}</p>
                     <div className="pt-3 space-y-2">
                         {outlook.macroOutlook.keyRisks.map(risk => (
                            <div key={risk.title}>
                                <h4 className="flex items-center gap-1.5 font-semibold text-yellow-400"><AlertIcon className="h-4 w-4"/>{risk.title}</h4>
                                <p className="text-xs text-gray-400 pl-5">{risk.description}</p>
                            </div>
                         ))}
                    </div>
                </ReportCard>

                <ReportCard icon={<CalendarIcon />} title="이번 주 핵심 관전 포인트">
                    <p>{outlook.weekAhead.summary}</p>
                     <div className="pt-3 space-y-2">
                        {outlook.weekAhead.keyEvents.map(event => (
                            <div key={event.event} className={`p-2 bg-gray-900/40 rounded-md border-l-4 ${importanceColor[event.importance]}`}>
                                <p className="font-semibold text-gray-200">{event.event}</p>
                                <p className="text-xs text-gray-500">{event.date}</p>
                            </div>
                        ))}
                     </div>
                </ReportCard>
                 <ReportCard icon={<StrategyIcon />} title="AI 추천 집중 섹터">
                     <p>위의 모든 분석을 종합하여, 이번 주 가장 유망할 것으로 판단되는 섹터입니다.</p>
                     <div className="pt-3 flex flex-wrap gap-2">
                        {outlook.aiStrategy.focusSectors.map(s => <span key={s} className="px-3 py-1 text-base font-bold bg-cyan-600/50 text-white rounded-md">{s}</span>)}
                     </div>
                </ReportCard>
            </div>
        </div>
    );
};
