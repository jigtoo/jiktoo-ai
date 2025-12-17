import React, { useState } from 'react';
import type { AnalysisResult, CatalystAnalysis } from '../types';
import { 
    WatchlistIcon, PlanIcon, InfoIcon, BellIcon, PlusIcon,
    BrainIcon, StrategistIcon, VerdictIcon, ClipboardIcon, HomeIcon, CheckCircleIcon
} from './icons';
import { AlphaSourceBadge } from './AlphaSourceBadge';

const TriggerWatcherDisplay: React.FC<{ triggerSignals: CatalystAnalysis['triggerSignals'] }> = ({ triggerSignals }) => {
    if (!triggerSignals || (!triggerSignals.onSignals.length && !triggerSignals.offSignals.length)) {
        return null;
    }

    return (
        <div className="mt-6 p-4 bg-gray-900/50 rounded-lg border border-gray-700">
            <h4 className="font-bold text-lg text-cyan-300 mb-3 text-center">AI 오토파일럿: 트리거 워처 신호</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* On Signals */}
                <div>
                    <h5 className="font-semibold text-green-400 mb-2">켜짐 신호 (비중↑)</h5>
                    <ul className="space-y-2 text-sm">
                        {triggerSignals.onSignals.map((signal, index) => (
                            signal && (
                                <li key={`on-${index}`} className="p-2 bg-gray-800/60 rounded-md">
                                    <p className="font-bold text-gray-200">{signal.name}</p>
                                    <p className="text-xs text-gray-400">{signal.description}</p>
                                </li>
                            )
                        ))}
                    </ul>
                </div>
                {/* Off Signals */}
                <div>
                    <h5 className="font-semibold text-red-400 mb-2">꺼짐 신호 (비중↓)</h5>
                    <ul className="space-y-2 text-sm">
                        {triggerSignals.offSignals.map((signal, index) => (
                             signal && (
                                <li key={`off-${index}`} className="p-2 bg-gray-800/60 rounded-md">
                                    <p className="font-bold text-gray-200">{signal.name}</p>
                                    <p className="text-xs text-gray-400">{signal.description}</p>
                                </li>
                            )
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
};


export const ExecutiveDecisionBriefing: React.FC<{ 
    result: AnalysisResult; 
    onOpenFormForAnalysis: (analysis: AnalysisResult, isAiGuided: boolean) => void;
    onGoHome?: () => void;
}> = ({ result, onOpenFormForAnalysis, onGoHome }) => {
    const { status, synthesis, stockName, ticker, psychoanalystAnalysis, source } = result;
    const [isWatcherSubscribed, setIsWatcherSubscribed] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);

    const statusConfig = {
        'ActionableSignal': { text: '매수 신호', color: 'bg-green-500 text-white' },
        'Watchlist': { text: '관심 종목', color: 'bg-cyan-500 text-white' },
        'NotActionable': { text: '기준 미달', color: 'bg-yellow-500/20 text-yellow-300' }
    };

    const currentStatus = statusConfig[status] || { text: '상태 미정', color: 'bg-gray-500 text-white' };
    const buyPlan = synthesis.buyPlan;

    const handleCopySummary = () => {
        const summaryText = `
## 직투 AI 위원회 브리핑: ${stockName} (${ticker})

**AI 위원회 최종 결론: ${currentStatus.text}**
${synthesis.finalVerdict.reason}

---

**[AI 심리분석가 (질적 분석)]**
*요약: "${synthesis.psychoanalystSummary}"*

**[AI 전략가 (양적 분석)]**
*요약: "${synthesis.strategistSummary}"*
        `;
        navigator.clipboard.writeText(summaryText.trim());
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
    };

    return (
        <div className="bg-gray-800/80 border border-gray-700 rounded-xl shadow-2xl p-4 sm:p-6 mb-8 animate-fade-in">
            <header className="flex flex-col sm:flex-row justify-between sm:items-start gap-3 mb-4">
                <div className="flex items-center gap-3">
                    {onGoHome && (
                         <button onClick={onGoHome} className="flex items-center gap-2 px-3 py-1.5 bg-gray-600 text-white text-sm font-semibold rounded-md hover:bg-gray-500 transition-colors" aria-label="Back to dashboard">
                            <HomeIcon className="h-4 w-4" />
                            <span>홈으로</span>
                         </button>
                    )}
                    <span className={`px-3 py-1.5 text-sm font-bold rounded-md ${currentStatus.color}`}>
                        {currentStatus.text}
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-bold text-white">{stockName} ({ticker})</h2>
                    <AlphaSourceBadge source={source} />
                </div>
                 <div className="flex items-center gap-2 self-end sm:self-center">
                    <div className="relative group flex items-center gap-1">
                      <button
                          onClick={() => setIsWatcherSubscribed(!isWatcherSubscribed)}
                          className={`flex items-center gap-2 px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${
                              isWatcherSubscribed
                                  ? 'bg-cyan-600 text-white'
                                  : 'bg-gray-600 text-white hover:bg-gray-500'
                          }`}
                      >
                          {isWatcherSubscribed ? <CheckCircleIcon className="h-4 w-4" /> : <BellIcon className="h-4 w-4" />}
                          <span>
                              {isWatcherSubscribed ? '워처 구독 중' : '트리거 워처 구독'}
                          </span>
                      </button>
                       <InfoIcon className="h-4 w-4 text-gray-400 cursor-help" />
                       <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-60 bg-gray-900 text-white text-xs rounded-lg p-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-lg pointer-events-none before:content-[''] before:absolute before:left-1/2 before:top-full before:-translate-x-1/2 before:border-4 before:border-transparent before:border-t-gray-900">
                            <p className="font-bold mb-1 text-cyan-300">AI 오토파일럿: 트리거 워처 구독</p>
                            <p>아래 '켜짐/꺼짐 신호'가 발생하면 AI가 이를 감지하여 알림을 보냅니다. 구독하여 자동 모니터링을 시작하세요.</p>
                        </div>
                    </div>
                    {status === 'ActionableSignal' && buyPlan && (
                        <button onClick={() => onOpenFormForAnalysis(result, true)} className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white text-sm font-semibold rounded-md hover:bg-green-700 transition-colors">
                            <PlusIcon className="h-4 w-4" />
                            AI 추천대로 추가
                        </button>
                    )}
                 </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1 bg-gray-900/50 p-3 rounded-lg border-l-4 border-purple-500">
                    <h4 className="flex items-center gap-2 text-sm font-semibold text-purple-300 mb-1">
                        <BrainIcon className="h-5 w-5" />
                        AI 심리분석가 요약
                    </h4>
                    <p className="text-gray-200 text-sm italic">"{synthesis.psychoanalystSummary}"</p>
                </div>
                <div className="md:col-span-1 bg-gray-900/50 p-3 rounded-lg border-l-4 border-teal-500">
                    <h4 className="flex items-center gap-2 text-sm font-semibold text-teal-300 mb-1">
                        <StrategistIcon className="h-5 w-5" />
                        AI 전략가 요약
                    </h4>
                    <p className="text-gray-200 text-sm italic">"{synthesis.strategistSummary}"</p>
                </div>
                <div className="md:col-span-1 bg-gray-900/50 p-3 rounded-lg border-l-4 border-cyan-500">
                    <h4 className="flex items-center gap-2 text-sm font-semibold text-cyan-400 mb-1">
                        <VerdictIcon />
                        AI 위원회 최종 결론
                    </h4>
                    <p className="text-gray-200 text-sm">{synthesis.finalVerdict.reason}</p>
                </div>
            </div>
            
            <TriggerWatcherDisplay triggerSignals={psychoanalystAnalysis.catalystAnalysis.triggerSignals} />
        </div>
    );
};