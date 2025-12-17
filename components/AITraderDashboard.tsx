// components/AITraderDashboard.tsx
import React, { useState } from 'react';
// FIX: Add missing AITradeLogEntry and AITradeDecisionBriefing to imports.
import type { AIPortfolios, AIPortfolioState, AITradeLogs, AITradeLogEntry, AITraderAlert, AIInvestmentStyle, MarketHealth, AITurnType, MarketTarget, AITradeDecisionBriefing } from '../types';
// FIX: Replaced non-existent 'LabIcon' with 'AITradingLabIcon'.
import { AITradingLabIcon, LogoIcon, RefreshIcon, AlertIcon, TrashIcon, StrategyIcon, PyramidIcon, CommunityIcon, ShieldCheckIcon } from './icons';
import { marketInfo } from '../services/marketInfo';

interface AITraderDashboardProps {
    portfolios: AIPortfolios;
    tradeLogs: AITradeLogs;
    activeStyle: AIInvestmentStyle;
    onRunTurn: (turnType: AITurnType) => void;
    isLoading: boolean;
    alerts: AITraderAlert[];
    onSetup: (initialCapital: number, investmentStyle: AIInvestmentStyle) => void;
    onInvestmentStyleChange: (style: AIInvestmentStyle) => void;
    onReset: () => void;
    onRunDiagnosis: () => void;
    aiTurnFeedback: string | null;
    marketStatus?: MarketHealth['status'];
    marketTarget: MarketTarget;
}

// --- SUB-COMPONENTS ---

const DecisionBriefingDisplay: React.FC<{ briefing?: AITradeDecisionBriefing, reason: string }> = ({ briefing, reason }) => {
    if (!briefing) {
        // Fallback for old logs without detailed briefing
        return (
            <div className="p-4 bg-gray-900/50">
                <div className="flex items-start gap-2 text-sm text-gray-300">
                    <LogoIcon className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <p>{reason}</p>
                </div>
            </div>
        );
    }
    return (
        <div className="p-4 bg-gray-900/50 space-y-3">
            <div className="text-sm">
                <h5 className="font-bold text-cyan-300 mb-1">시장 상황 판단</h5>
                <p className="text-gray-300">{briefing.marketSituation}</p>
            </div>
            <div className="text-sm">
                <h5 className="font-bold text-cyan-300 mb-1">후보군 비교 및 선정</h5>
                <p className="text-gray-300">{briefing.candidateComparison}</p>
            </div>
            <div className="text-sm">
                <h5 className="font-bold text-cyan-300 mb-1">핵심 결정 논리</h5>
                <p className="text-gray-300">{briefing.coreReasoning}</p>
            </div>
            <div className="text-sm">
                <h5 className="font-bold text-cyan-300 mb-1">리스크 평가</h5>
                <p className="text-gray-300">{briefing.riskAssessment}</p>
            </div>
        </div>
    );
};


const LogEntry: React.FC<{ log: AITradeLogEntry, marketTarget: MarketTarget }> = ({ log, marketTarget }) => {
    const isBuy = log.type === 'buy';
    const currency = marketInfo[marketTarget].currency;
    const formatOptions = { maximumFractionDigits: marketTarget === 'KR' ? 0 : 2 };

    return (
        <details className="bg-gray-800/60 rounded-lg overflow-hidden">
            <summary className="p-3 flex justify-between items-center cursor-pointer hover:bg-gray-700/50">
                <div className="flex items-center gap-3">
                    <span className={`w-3 h-3 rounded-full ${isBuy ? 'bg-green-500' : 'bg-red-500'}`}></span>
                    <div>
                        <p className="font-semibold text-gray-200">{log.stockName} {isBuy ? '매수' : '매도'}</p>
                        <p className="text-xs text-gray-400">
                            {new Date(log.timestamp).toLocaleString('ko-KR', {
                                month: 'numeric', day: 'numeric',
                                hour: '2-digit', minute: '2-digit', second: '2-digit',
                                hour12: false
                            })}
                        </p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="font-mono text-sm text-gray-200">{log.quantity}주 @ {currency}{log.price.toLocaleString(undefined, formatOptions)}</p>
                </div>
            </summary>
            <DecisionBriefingDisplay briefing={log.decisionBriefing} reason={log.reason} />
        </details>
    );
};

const PortfolioDisplay: React.FC<{ portfolio: AIPortfolioState, marketTarget: MarketTarget }> = ({ portfolio, marketTarget }) => {
    const currency = marketInfo[marketTarget].currency;
    const formatOptions = { maximumFractionDigits: marketTarget === 'KR' ? 0 : 2 };
    const pnlColor = portfolio.profitOrLoss >= 0 ? 'text-green-400' : 'text-red-400';

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="bg-gray-900/40 p-3 rounded-lg"><p className="text-sm text-gray-400">총 자산</p><p className="font-bold text-lg text-white">{currency}{portfolio.currentValue.toLocaleString(undefined, formatOptions)}</p></div>
                <div className="bg-gray-900/40 p-3 rounded-lg"><p className="text-sm text-gray-400">보유 현금</p><p className="font-bold text-lg text-white">{currency}{portfolio.cash.toLocaleString(undefined, formatOptions)}</p></div>
                <div className="bg-gray-900/40 p-3 rounded-lg"><p className="text-sm text-gray-400">총 손익</p><p className={`font-bold text-lg ${pnlColor}`}>{portfolio.profitOrLoss >= 0 ? '+' : ''}{currency}{portfolio.profitOrLoss.toLocaleString(undefined, formatOptions)}</p></div>
                <div className="bg-gray-900/40 p-3 rounded-lg"><p className="text-sm text-gray-400">수익률</p><p className={`font-bold text-lg ${pnlColor}`}>{portfolio.profitOrLossPercent.toFixed(2)}%</p></div>
            </div>

            <div>
                <h4 className="text-sm font-semibold text-gray-300 mb-2">보유 종목</h4>
                {portfolio.holdings.length > 0 ? (
                    <div className="space-y-2">
                        {portfolio.holdings.map(item => (
                            <div key={item.id} className="p-3 bg-gray-800/50 rounded-md flex justify-between items-center">
                                <div>
                                    <p className="font-semibold text-gray-200">{item.stockName}</p>
                                    <p className="text-xs font-mono text-gray-400">{item.ticker}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-mono text-right">{item.quantity}주</p>
                                    <p className="text-xs font-mono text-right text-gray-400">@{currency}{item.entryPrice.toLocaleString(undefined, formatOptions)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-center text-gray-500 py-4">보유 종목이 없습니다.</p>
                )}
            </div>
        </div>
    );
};

const SetupForm: React.FC<{ onSetup: (capital: number) => void, marketTarget: MarketTarget }> = ({ onSetup, marketTarget }) => {
    const [capital, setCapital] = useState(marketTarget === 'KR' ? '10000000' : '10000');
    const currency = marketInfo[marketTarget].currency;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSetup(Number(capital));
    };

    return (
        <div className="text-center p-6 bg-gray-800/30 rounded-lg">
            <AITradingLabIcon className="h-12 w-12 mx-auto mb-4 text-cyan-400" />
            <h3 className="text-xl font-semibold text-gray-300">AI 트레이딩 랩 실험 시작</h3>
            <p className="mt-2 text-sm text-gray-400">AI에게 운용을 맡길 가상 자본금을 설정해주세요.</p>
            <form onSubmit={handleSubmit} className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-2">
                <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">{currency}</span>
                    <input
                        type="number"
                        value={capital}
                        onChange={(e) => setCapital(e.target.value)}
                        className="w-full sm:w-48 pl-8 pr-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:ring-cyan-500 focus:border-cyan-500"
                        required
                    />
                </div>
                <button type="submit" className="w-full sm:w-auto px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold rounded-lg hover:from-cyan-600 hover:to-blue-700">설정 완료</button>
            </form>
        </div>
    );
};


// --- MAIN COMPONENT ---
export const AITraderDashboard: React.FC<AITraderDashboardProps> = ({
    portfolios,
    tradeLogs,
    activeStyle,
    onRunTurn,
    isLoading,
    // alerts, // Unused
    onSetup,
    onInvestmentStyleChange,
    onReset,
    onRunDiagnosis,
    aiTurnFeedback,
    // marketStatus, // Unused
    marketTarget
}) => {
    const portfolio = portfolios[activeStyle];
    const logs = tradeLogs[activeStyle];
    const [confirmingReset, setConfirmingReset] = useState(false);

    const handleSetup = (capital: number) => {
        onSetup(capital, activeStyle);
    }

    const usButtonClass = 'from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600';
    const krButtonClass = 'from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700';
    const buttonClass = marketTarget === 'US' ? usButtonClass : krButtonClass;

    const styleNameMap: Record<AIInvestmentStyle, string> = {
        conservative: '안정형',
        balanced: '균형형',
        aggressive: '공격 성장형'
    };

    return (
        <div className="animate-fade-in space-y-8">
            <header className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div className="flex items-center gap-3">
                    <AITradingLabIcon />
                    <div>
                        <h2 className="text-3xl font-bold text-gray-200">AI 트레이딩 랩</h2>
                        <p className="text-sm text-gray-400">다양한 AI 페르소나에게 가상 자본금을 부여하여, 나만의 투자 아이디어를 실험하고 검증하는 공간입니다.</p>
                    </div>
                </div>
            </header>

            {/* Strategy Selector */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 p-3 bg-gray-800/50 rounded-lg">
                <div className="flex items-center gap-2 p-1 bg-gray-900/50 rounded-lg">
                    {(Object.keys(portfolios) as AIInvestmentStyle[]).map(style => (
                        <button
                            key={style}
                            onClick={() => onInvestmentStyleChange(style)}
                            className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${activeStyle === style ? 'bg-cyan-600/50 text-white' : 'text-gray-400 hover:bg-gray-700'}`}
                        >
                            {styleNameMap[style]}
                        </button>
                    ))}
                </div>
                {portfolio && <button onClick={() => setConfirmingReset(true)} className="flex items-center gap-2 px-3 py-1.5 bg-red-900/40 text-red-300 text-xs font-semibold rounded-md hover:bg-red-900/70 hover:text-white"><TrashIcon className="h-4 w-4" />초기화</button>}
            </div>

            {!portfolio ? (
                <SetupForm onSetup={handleSetup} marketTarget={marketTarget} />
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                    {/* Left Column - Portfolio & Actions */}
                    <div className="lg:col-span-3 space-y-6">
                        <PortfolioDisplay portfolio={portfolio} marketTarget={marketTarget} />

                        <div className="p-4 bg-gray-800/80 rounded-lg border border-gray-700">
                            <h4 className="font-bold text-gray-200 mb-3 text-center">AI 수동 실행</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <button onClick={() => onRunTurn('general')} disabled={isLoading} className={`flex items-center justify-center gap-2 px-4 py-3 text-white font-bold rounded-lg shadow-md transition-colors disabled:opacity-50 ${buttonClass}`}>
                                    <StrategyIcon className="h-5 w-5" /><span>일반</span>
                                </button>
                                <button onClick={() => onRunTurn('rebalance')} disabled={isLoading} className={`flex items-center justify-center gap-2 px-4 py-3 text-white font-bold rounded-lg shadow-md transition-colors disabled:opacity-50 ${buttonClass}`}>
                                    <CommunityIcon className="h-5 w-5" /><span>리밸런싱</span>
                                </button>
                                <button onClick={() => onRunTurn('pyramiding')} disabled={isLoading} className={`flex items-center justify-center gap-2 px-4 py-3 text-white font-bold rounded-lg shadow-md transition-colors disabled:opacity-50 ${buttonClass}`}>
                                    <PyramidIcon className="h-5 w-5" /><span>피라미딩</span>
                                </button>
                            </div>
                            {isLoading && (
                                <div className="mt-4 text-center text-sm text-cyan-300 flex items-center justify-center gap-2">
                                    <RefreshIcon className="h-4 w-4 animate-spin" />
                                    AI가 최적의 수를 계산하고 있습니다...
                                </div>
                            )}
                        </div>
                        <button onClick={onRunDiagnosis} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 text-white font-semibold rounded-lg hover:bg-gray-600">
                            <ShieldCheckIcon className="h-5 w-5" />
                            AI 전략 자가 진단 실행
                        </button>
                    </div>

                    {/* Right Column - Logs & Feedback */}
                    <div className="lg:col-span-2 space-y-6">
                        <div>
                            <h3 className="text-lg font-bold text-gray-200 mb-2">AI 매매 기록</h3>
                            <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                                {logs.length > 0 ? logs.map(log => <LogEntry key={log.id} log={log} marketTarget={marketTarget} />) : <p className="text-sm text-center text-gray-500 py-8">매매 기록이 없습니다.</p>}
                            </div>
                        </div>

                        {aiTurnFeedback && (
                            <div className="p-4 bg-gray-800/80 rounded-lg border-l-4 border-cyan-500">
                                <h4 className="flex items-center gap-2 font-bold text-cyan-300 mb-2"><LogoIcon className="h-5 w-5" /> AI 결정 요약</h4>
                                <p className="text-sm text-gray-300">{aiTurnFeedback}</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
            {confirmingReset && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" onClick={() => setConfirmingReset(false)}>
                    <div className="bg-gray-800 border border-red-700 rounded-xl shadow-2xl p-6 w-full max-w-sm m-4 text-center" onClick={e => e.stopPropagation()}>
                        <AlertIcon className="h-12 w-12 mx-auto text-yellow-400 mb-4" />
                        <h3 className="text-xl font-bold text-white mb-2">정말로 초기화하시겠습니까?</h3>
                        <p className="text-sm text-gray-300 mb-6">모든 포트폴리오와 매매 기록이 삭제되며, 되돌릴 수 없습니다.</p>
                        <div className="flex gap-4">
                            <button onClick={() => setConfirmingReset(false)} className="w-full px-6 py-2 bg-gray-600 text-white font-bold rounded-lg hover:bg-gray-500">취소</button>
                            <button onClick={() => { onReset(); setConfirmingReset(false); }} className="w-full px-6 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700">초기화 확인</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};