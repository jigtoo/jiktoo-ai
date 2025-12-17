

import React, { useState } from 'react';
import type { TenbaggerAnalysis, TenbaggerStock, TenbaggerChangeLogEntry, MarketTarget } from '../types';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorDisplay } from './ErrorDisplay';
import { RocketIcon, StrategyIcon, CheckCircleIcon, AlertIcon, RefreshIcon, InfoIcon, XCircleIcon } from './icons';

interface TenbaggerDashboardProps {
    data: TenbaggerAnalysis | null;
    isLoading: boolean; // For initial fetch
    error: string | null;
    onFetch: () => void; // For initial fetch
    isChecking: boolean; // For status checks
    onCheckStatus: () => void;
    marketTarget: MarketTarget;
    onClearError: () => void;
}

const InitialState: React.FC<{ onFetch: () => void, isLoading: boolean, marketTarget: MarketTarget }> = ({ onFetch, isLoading, marketTarget }) => {
    const usButtonClass = 'from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600';
    const krButtonClass = 'from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700';
    const buttonClass = marketTarget === 'US' ? usButtonClass : krButtonClass;

    return (
        <div className="text-center p-6 bg-gray-800/30 rounded-lg">
            <div className="inline-block bg-gray-700 p-4 rounded-full mb-4">
                <RocketIcon className="h-12 w-12 text-cyan-400" />
            </div>
            <h2 className="text-3xl font-bold text-gray-100 mb-2">텐배거 클럽</h2>
            <p className="text-gray-400 max-w-3xl mx-auto mb-8">
                전설적 투자자들의 원칙을 바탕으로 10배 상승 잠재력을 가진 '텐배거' 후보 10종목을 AI가 직접 선정하고, 지속적으로 관리하며 그 과정을 투명하게 보고합니다.
            </p>
            
            <button 
                onClick={onFetch}
                disabled={isLoading}
                className={`px-8 py-4 bg-gradient-to-r ${buttonClass} text-white font-bold text-lg rounded-lg shadow-lg hover:from-cyan-600 hover:to-blue-700 transition-transform transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed`}
            >
                <span>{isLoading ? '선정 중...' : 'AI 매니저, 텐배거 포트폴리오 구성 시작'}</span>
            </button>
        </div>
    );
};


const ScoreBar: React.FC<{ label: string; score: number }> = ({ label, score }) => {
    const width = `${score}%`;
    let colorClass = 'bg-green-500';
    if (score < 75) colorClass = 'bg-yellow-500';
    if (score < 50) colorClass = 'bg-red-500';

    return (
        <div>
            <div className="flex justify-between items-center text-xs mb-1">
                <span className="font-semibold text-gray-300">{label}</span>
                <span className="font-mono text-gray-400">{score}</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-1.5">
                <div className={`h-1.5 rounded-full ${colorClass}`} style={{ width: width }}></div>
            </div>
        </div>
    );
};

const TenbaggerStockCard: React.FC<{ item: TenbaggerStock }> = ({ item }) => {
    const statusColors: Record<TenbaggerStock['status'], string> = {
        '관리 중': 'bg-green-500/20 text-green-300',
        '주의': 'bg-yellow-500/20 text-yellow-300',
        '탈락': 'bg-red-500/20 text-red-300',
    };
    
    const pnl = item.performanceSinceAdded;
    const pnlColor = pnl > 0 ? 'text-green-400' : pnl < 0 ? 'text-red-400' : 'text-gray-300';
    
    return (
        <div className="bg-gray-800/70 border border-gray-700 rounded-xl overflow-hidden shadow-lg">
            <header className="p-4 bg-gray-900/50 flex justify-between items-start gap-4">
                <div>
                    <h3 className="text-2xl font-bold text-white">{item.stockName}</h3>
                    <p className="font-mono text-gray-400">{item.ticker} • {item.country} • {item.industry}</p>
                    <div className="mt-2 flex items-center gap-4">
                        <span className={`inline-block px-2 py-1 font-semibold rounded-md text-xs ${statusColors[item.status]}`}>
                            {item.status}
                        </span>
                        <div className="text-xs text-gray-400">
                            <span className="font-semibold">추가일:</span> {item.addDate}
                        </div>
                    </div>
                </div>
                 <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-gray-300">추가 후 성과</p>
                    <p className={`text-3xl font-bold ${pnlColor}`}>{pnl >= 0 ? '+' : ''}{pnl.toFixed(1)}%</p>
                    <p className="text-sm font-semibold text-gray-300 mt-2">텐배거 총점</p>
                    <p className="text-4xl font-bold text-cyan-400">{item.tenbaggerScore}</p>
                </div>
            </header>
            <div className="p-4 space-y-4">
                 <div className="p-3 bg-gray-900/40 rounded-lg">
                    <h5 className="font-bold text-cyan-300 mb-1">7대 황금률 스코어카드</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                        <ScoreBar label="폭발적 성장성" score={item.detailedScorecard.explosiveGrowth} />
                        <ScoreBar label="합리적 밸류에이션" score={item.detailedScorecard.reasonableValuation} />
                        <ScoreBar label="혁신성/기술" score={item.detailedScorecard.innovation} />
                        <ScoreBar label="소외도/모멘텀" score={item.detailedScorecard.underTheRadar} />
                        <ScoreBar label="경영진" score={item.detailedScorecard.qualityManagement} />
                        <ScoreBar label="재무 건전성" score={item.detailedScorecard.fortressBalanceSheet} />
                        <ScoreBar label="성장 스토리" score={item.detailedScorecard.compellingStory} />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3 bg-gray-900/40 rounded-lg">
                        <h5 className="font-bold text-green-300 mb-2">핵심 성장 동력</h5>
                        <ul className="list-disc list-inside space-y-1 text-sm text-gray-300">
                            {item.drivers.map((driver, i) => <li key={i}>{driver}</li>)}
                        </ul>
                    </div>
                    <div className="p-3 bg-gray-900/40 rounded-lg">
                         <h5 className="font-bold text-red-300 mb-2">핵심 리스크</h5>
                        <ul className="list-disc list-inside space-y-1 text-sm text-gray-300">
                            {item.risks.map((risk, i) => <li key={i}>{risk}</li>)}
                        </ul>
                    </div>
                </div>
                <details className="bg-gray-900/40 rounded-lg p-3 text-sm text-gray-300">
                    <summary className="font-semibold text-cyan-400 cursor-pointer">AI 종합 분석 요약 보기</summary>
                    <p className="mt-2 pt-2 border-t border-gray-700">{item.summary}</p>
                </details>
            </div>
        </div>
    );
};

const LogIcon: React.FC<{ type: TenbaggerChangeLogEntry['type'] }> = ({ type }) => {
    switch (type) {
        case '추가': return <CheckCircleIcon className="h-5 w-5 text-green-400" />;
        case '제거': return <XCircleIcon className="h-5 w-5 text-red-400" />;
        case '상태 변경': return <RefreshIcon className="h-5 w-5 text-yellow-400" />;
        case '코멘트':
        default: return <InfoIcon className="h-5 w-5 text-blue-400" />;
    }
};

const ManagerLog: React.FC<{ log: TenbaggerChangeLogEntry[] }> = ({ log }) => {
    if (!log || log.length === 0) {
        return <div className="text-center text-sm text-gray-500 p-4 bg-gray-800/50 rounded-lg">변경 기록이 없습니다.</div>;
    }

    return (
        <div className="space-y-4 max-h-[1200px] overflow-y-auto pr-2">
            {log.map((entry, index) => {
                if (!entry) {
                    return null;
                }
                return (
                    <div key={index} className="flex items-start gap-3 p-3 bg-gray-800/50 rounded-lg">
                        <div className="flex-shrink-0 mt-1"><LogIcon type={entry.type} /></div>
                        <div>
                            <p className="text-sm font-semibold text-gray-200">
                                {entry.stockName} <span className="font-mono text-xs text-gray-500">{entry.ticker !== 'N/A' && `(${entry.ticker})`}</span>
                            </p>
                            <p className="text-xs text-gray-400 mt-1">{entry.summary}</p>
                            <p className="text-xs text-gray-500 text-right mt-2">{new Date(entry.date).toLocaleDateString('ko-KR')}</p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export const TenbaggerDashboard: React.FC<TenbaggerDashboardProps> = ({ data, isLoading, error, onFetch, isChecking, onCheckStatus, marketTarget, onClearError }) => {
    if (isLoading) {
        return <div className="mt-20"><LoadingSpinner message="전설적 투자자의 원칙에 따라 텐배거 후보를 엄선하는 중입니다..." showWittyMessages={true} /></div>;
    }

    if (error && !data) {
        return <ErrorDisplay title="텐배거 클럽 오류" message={error} onRetry={onFetch} onClose={onClearError} />;
    }

    if (!data) {
        return <InitialState onFetch={onFetch} isLoading={isLoading || isChecking} marketTarget={marketTarget} />;
    }
    
    const usButtonClass = 'from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600';
    const krButtonClass = 'from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700';
    const buttonClass = marketTarget === 'US' ? usButtonClass : krButtonClass;

    return (
        <div className="space-y-8 animate-fade-in">
            <header className="flex flex-col sm:flex-row justify-between items-center gap-4 p-4 bg-gray-800/30 rounded-lg border border-gray-700">
                <div>
                    <h2 className="text-3xl font-bold text-gray-100">텐배거 클럽 관리</h2>
                    <p className="text-gray-400">AI 포트폴리오 매니저가 후보들을 지속적으로 추적하고 관리합니다.</p>
                </div>
                <button
                    onClick={onCheckStatus}
                    disabled={isChecking}
                    className={`flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r ${buttonClass} text-white font-bold rounded-lg shadow-lg transition-transform transform hover:scale-105 disabled:opacity-50 disabled:cursor-wait`}
                >
                    {isChecking ? <RefreshIcon className="animate-spin h-5 w-5" /> : <StrategyIcon className="h-5 w-5"/>}
                    <span>{isChecking ? '포트폴리오 점검 중...' : 'AI 매니저, 포트폴리오 점검 및 리밸런싱'}</span>
                </button>
            </header>

            {error && (
                 <ErrorDisplay title="텐배거 클럽 업데이트 오류" message={error} onRetry={onCheckStatus} onClose={onClearError} />
            )}

            <div className="p-6 bg-gray-800/70 border-l-4 border-cyan-500 rounded-lg">
                <h3 className="text-xl font-bold text-cyan-300 mb-2">매니저 총평</h3>
                <p className="text-gray-300 whitespace-pre-wrap">{data.managerCommentary}</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                    <h3 className="text-xl font-bold text-gray-300 mb-4">매니저 로그</h3>
                    <ManagerLog log={data.changeLog} />
                </div>
                
                <div className="lg:col-span-2 space-y-6">
                     {data.stocks && data.stocks.map(stock => (
                        <TenbaggerStockCard key={stock.ticker} item={stock} />
                     ))}
                </div>
            </div>
        </div>
    );
};