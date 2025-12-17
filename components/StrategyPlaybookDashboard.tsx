// components/StrategyPlaybookDashboard.tsx
import React, { useState, useMemo } from 'react';
import type { StrategyPlaybook, ActiveSignal, MarketTarget, Signal, NeutralSignal, InvestmentPersona, UserWatchlistItem } from '../types';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorDisplay } from './ErrorDisplay';
import { BrainIcon, BellIcon, PlusIcon, ShieldCheckIcon, RefreshIcon, HistoryIcon, SparklesIcon } from './icons';
import { NeutralSignalCard } from './NeutralSignalCard';
import { PlaybookHistoryLog } from './PlaybookHistoryLog';
import { ActiveSignalCard } from './ActiveSignalCard';
import { StrategyPlaybookCard } from './StrategyPlaybookCard';
import { MonitoringStatusDisplay } from './MonitoringStatusDisplay';

const StrategyPlaybookCardLoader: React.FC<{ item: UserWatchlistItem }> = ({ item }) => (
    <div className="bg-gray-800/50 border border-dashed border-gray-600 rounded-xl shadow-lg animate-pulse p-4 flex flex-col justify-center items-center h-full min-h-[180px]">
        <LoadingSpinner />
        <p className="text-sm font-bold text-gray-400 mt-2">{item.stockName}</p>
        <p className="text-xs text-gray-500">분석 중...</p>
    </div>
);

interface StrategyPlaybookDashboardProps {
    strategyPlaybooks: StrategyPlaybook[] | null;
    isPlaybookLoading: boolean;
    playbookError: string | null;
    playbookGeneratedAt: string | null;
    changeSummary: string | null;
    reviewLog: { stockName: string; decision: string; reason: string; }[];
    activeSignals: Signal[] | null;
    onRunEngine: (force?: boolean) => void;
    marketTarget: MarketTarget;
    onOpenTelegramModal: (signal?: StrategyPlaybook | null) => void;
    onExecuteSignal: (signal: ActiveSignal) => void;
    onSelectStock: (ticker: string, rationale: string, stockName: string) => void;
    isMonitoring: boolean;
    marketStatusMessage: string;
    persona: InvestmentPersona;
    watchlistItems: UserWatchlistItem[];
    processingTicker: string | null;
    countdown: number;
    isCheckingSignals: boolean;
}

function isActionableSignal(signal: Signal): signal is ActiveSignal {
    return 'signalType' in signal;
}

export const StrategyPlaybookDashboard: React.FC<StrategyPlaybookDashboardProps> = (props) => {
    const {
        strategyPlaybooks, isPlaybookLoading, playbookError, playbookGeneratedAt,
        changeSummary, reviewLog, activeSignals,
        onRunEngine, marketTarget, onOpenTelegramModal, onExecuteSignal,
        isMonitoring, marketStatusMessage, persona, onSelectStock,
        watchlistItems, processingTicker, countdown, isCheckingSignals
    } = props;
    
    const [showHistory, setShowHistory] = useState(false);

    const { actionableBuySignals, actionableSellSignals, neutralSignals } = useMemo(() => {
        const actionableSigs = props.activeSignals?.filter(isActionableSignal) ?? [];
        const neutralSigs = props.activeSignals?.filter((s): s is NeutralSignal => !isActionableSignal(s)) ?? [];
        
        return {
          actionableBuySignals: actionableSigs.filter(s => s.signalType === 'BUY'),
          actionableSellSignals: actionableSigs.filter(s => s.signalType === 'SELL'),
          neutralSignals: neutralSigs,
        };
    }, [props.activeSignals]);

    const renderedPlaybookTickers = useMemo(() => new Set((strategyPlaybooks || []).map(p => p.ticker)), [strategyPlaybooks]);
    const pendingWatchlistItems = useMemo(() => 
        watchlistItems.filter(item => !renderedPlaybookTickers.has(item.ticker)),
        [watchlistItems, renderedPlaybookTickers]
    );
    
    if (!strategyPlaybooks && isPlaybookLoading && !processingTicker) {
        return <LoadingSpinner message="AI 전략가가 플레이북을 생성 중..." />;
    }

    return (
        <div className="space-y-12">
            {playbookError && <ErrorDisplay title="플레이북 엔진 오류" message={playbookError} onRetry={() => onRunEngine(true)} />}

            {/* --- Active Signal Monitoring Section --- */}
            <section>
                 <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-100 flex items-center justify-center gap-3">
                        <BellIcon className="h-6 w-6 text-cyan-400" />
                        실시간 신호 감시
                    </h2>
                    <p className="text-gray-400 mt-1 max-w-2xl mx-auto">AI 감시병(Sentry)이 플레이북의 실행 조건을 24시간 감시하여 결정적 순간을 포착합니다.</p>
                </div>

                <div className="max-w-md mx-auto space-y-4 mb-8">
                     <MonitoringStatusDisplay
                        isMonitoring={isMonitoring}
                        isChecking={isCheckingSignals}
                        countdown={countdown}
                        message={marketStatusMessage}
                    />
                </div>

                {activeSignals && activeSignals.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {actionableBuySignals.map(signal => <ActiveSignalCard key={signal.ticker} signal={signal} onExecute={onExecuteSignal} />)}
                        {neutralSignals.map(signal => <NeutralSignalCard key={signal.ticker} signal={signal} />)}
                    </div>
                ) : (
                    <div className="text-center text-gray-500 py-10 bg-gray-800/30 rounded-lg">
                        <p>감시 중인 플레이북에서 활성화된 신호가 없습니다.</p>
                    </div>
                )}
            </section>
            
            {/* Playbook Dashboard */}
            <section>
                <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-100 flex items-center justify-center gap-3">
                        <SparklesIcon className="h-6 w-6 text-cyan-400" />
                        AI 스윙 전략 플레이북
                    </h2>
                    <p className="text-gray-400 mt-1 max-w-2xl mx-auto">AI 전략가(Strategist)가 고승률 전략에 부합하는 종목을 발굴하고 작전 계획을 수립합니다.</p>
                     {playbookGeneratedAt && (
                        <p className="text-xs text-gray-500 mt-1">마지막 생성: {new Date(playbookGeneratedAt).toLocaleString('ko-KR')}</p>
                    )}
                </div>
                
                <div className="max-w-md mx-auto space-y-4 mb-8">
                    <div className="w-full space-y-2">
                        <button onClick={() => setShowHistory(p => !p)} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-white font-semibold rounded-lg shadow-md hover:bg-gray-700">
                            <HistoryIcon className="h-5 w-5" />
                            <span>{showHistory ? '결정 로그 숨기기' : 'AI 결정 로그 보기'}</span>
                        </button>
                        <button onClick={() => onOpenTelegramModal(null)} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 disabled:opacity-50" disabled={isPlaybookLoading}>
                            <BellIcon className="h-5 w-5" />
                            <span>전체 신호 텔레그램 구독</span>
                        </button>
                    </div>
                </div>
                
                {showHistory && <PlaybookHistoryLog log={reviewLog} />}

                {(strategyPlaybooks && strategyPlaybooks.length > 0) || isPlaybookLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {(strategyPlaybooks || []).map(playbook => <StrategyPlaybookCard key={playbook.id} playbook={playbook} onSelect={() => onSelectStock(playbook.ticker, playbook.strategySummary, playbook.stockName)} />)}
                        {isPlaybookLoading && pendingWatchlistItems.map(item => {
                            if (item.ticker === processingTicker) {
                                return <StrategyPlaybookCardLoader key={item.ticker} item={item} />;
                            }
                            return null;
                        })}
                    </div>
                ) : (
                    <div className="text-center text-gray-500 py-10 bg-gray-800/30 rounded-lg">
                        <p>현재 AI가 수립한 스윙 트레이딩 플레이북이 없습니다.</p>
                    </div>
                )}
            </section>
        </div>
    );
};