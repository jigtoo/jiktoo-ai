import React from 'react';
import type { ActionableGuide, AnalysisResult, MarketTarget, PriceStrategyMapEntry } from '../types';
import { ChecklistIcon, StrategyIcon, BellIcon, ShieldCheckIcon, InfoIcon, HomeIcon, PlusIcon, LinkIcon, CheckCircleIcon, TargetIcon, StopLossIcon, ValueIcon } from './icons';
import { marketInfo } from '../services/marketInfo';

interface ActionableGuideDisplayProps {
    guide: ActionableGuide;
    result: AnalysisResult;
    onOpenFormForAnalysis: (analysis: AnalysisResult, isAiGuided: boolean) => void;
    onGoHome: () => void;
    marketTarget: MarketTarget;
}

const parsePrice = (priceStr: string): number | null => {
    if (!priceStr || typeof priceStr !== 'string') return null;
    const cleaned = priceStr.replace(/,/g, '').match(/[\d.]+/);
    if (!cleaned) return null;
    const num = parseFloat(cleaned[0]);
    return isNaN(num) ? null : num;
};

const isPriceInRange = (price: number, rangeStr: string): boolean => {
    const parts = rangeStr.split('~').map(s => s.trim());
    const min = parsePrice(parts[0]);
    let max = parts.length > 1 ? parsePrice(parts[1]) : null;

    if (parts.length > 1 && (parts[1] === '' || parts[1] === undefined)) {
        max = Infinity;
    }
    
    if (min !== null && max !== null) {
        return price >= min && price <= max;
    }
    if (min !== null) {
        return price >= min;
    }
    if (max !== null) {
        return price <= max;
    }
    return false;
};

const SourceLink: React.FC<{ source: { name: string; url: string } }> = ({ source }) => (
    <a href={source.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-400 hover:underline">
        <LinkIcon /> {source.name}
    </a>
);

const Section: React.FC<{ title: string; icon?: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean }> = ({ title, icon, children, defaultOpen = false }) => (
    <details className="bg-gray-800/70 border border-gray-700 rounded-xl shadow-lg" open={defaultOpen}>
        <summary className="p-4 flex items-center gap-3 cursor-pointer text-xl font-bold text-gray-100 hover:bg-gray-700/50 rounded-t-xl transition-colors">
            {icon}
            <span>{title}</span>
        </summary>
        <div className="p-4 pt-2 border-t border-gray-700/50">
            {children}
        </div>
    </details>
);

const StrategyTable: React.FC<{ strategyMap: PriceStrategyMapEntry[], currentPrice: number, currency: string, marketTarget: MarketTarget }> = ({ strategyMap, currentPrice, currency, marketTarget }) => {
    if (!strategyMap || strategyMap.length === 0) {
        return <p className="text-gray-400 text-center py-8">가격 구간별 전략 맵 데이터가 없습니다.</p>;
    }
    const formatOptions = { maximumFractionDigits: marketTarget === 'KR' ? 0 : 2 };

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-300">
                <thead className="text-xs text-gray-400 uppercase bg-gray-900/50">
                    <tr>
                        <th scope="col" className="px-4 py-3">구분</th>
                        <th scope="col" className="px-4 py-3">가격대</th>
                        <th scope="col" className="px-4 py-3">전략 (비중)</th>
                        <th scope="col" className="px-4 py-3">손절 기준</th>
                        <th scope="col" className="px-4 py-3">1차 목표</th>
                    </tr>
                </thead>
                <tbody>
                    {strategyMap.map((zone, index) => {
                        const inRange = currentPrice > 0 && isPriceInRange(currentPrice, zone.priceRange);
                        return (
                            <tr key={index} className={`border-b border-gray-700 transition-colors ${inRange ? 'bg-cyan-900/50' : 'hover:bg-gray-800/50'}`}>
                                <td className="px-4 py-3 font-semibold text-white relative">
                                    {inRange && (
                                        <div className="absolute left-0 top-0 h-full w-1 bg-cyan-400" title={`현재가(${currency}${currentPrice.toLocaleString(undefined, formatOptions)})가 이 구간에 있습니다.`}></div>
                                    )}
                                    <span className="ml-2">{zone.zone}</span>
                                </td>
                                <td className="px-4 py-3 font-mono">{zone.priceRange}</td>
                                <td className="px-4 py-3">{zone.strategyWeight}</td>
                                <td className="px-4 py-3 text-red-400">{zone.stopLossCriteria}</td>
                                <td className="px-4 py-3 text-green-400">{zone.firstTarget}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};


export const ActionableGuideDisplay: React.FC<ActionableGuideDisplayProps> = ({ guide, result, onOpenFormForAnalysis, onGoHome, marketTarget }) => {
    const { oneLineSummary, checklist, strategyMap, onOffTriggers, riskManagement, factCheck } = guide;
    const { stockName, ticker, synthesis, referencePrice } = result;
    
    const currency = marketInfo[marketTarget].currency;
    
    let currentPrice: number;
    if (typeof referencePrice === 'number') {
        currentPrice = referencePrice;
    } else if (typeof referencePrice === 'string') {
        const cleaned = referencePrice.replace(/[^\d.-]/g, "");
        currentPrice = cleaned ? parseFloat(cleaned) : 0;
    } else {
        currentPrice = 0;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <header className="bg-gray-800/80 border border-gray-700 rounded-xl shadow-2xl p-4 sm:p-6 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-3">
                    <h2 className="text-2xl sm:text-3xl font-bold text-white">{stockName} ({ticker})</h2>
                     <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                         <button onClick={onGoHome} className="px-3 py-1.5 text-sm font-semibold bg-gray-600 text-white rounded-md hover:bg-gray-500">
                             <HomeIcon className="h-4 w-4 sm:hidden" />
                             <span className="hidden sm:inline">홈으로</span>
                         </button>
                         {synthesis.buyPlan && (
                            <button onClick={() => onOpenFormForAnalysis(result, true)} className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white text-sm font-semibold rounded-md hover:bg-green-700">
                                <PlusIcon className="h-4 w-4" />
                                <span>AI 가이드 매수</span>
                            </button>
                         )}
                    </div>
                </div>
                <div className="p-4 bg-gray-900/50 rounded-lg border-l-4 border-cyan-500">
                    <h3 className="text-lg font-bold text-cyan-300 mb-1">한 줄 결론</h3>
                    <p className="text-gray-200">"{oneLineSummary}"</p>
                </div>
            </header>

            {/* Checklist */}
            <Section title="지금 할 일 (체크리스트)" icon={<ChecklistIcon />} defaultOpen>
                <div className="space-y-3">
                    {checklist.map((item, index) => (
                        <div key={index} className="flex items-start gap-3 p-2 bg-gray-900/40 rounded-md">
                            <CheckCircleIcon className="h-5 w-5 text-gray-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-grow">
                                <p className="font-semibold text-gray-200">{item.category}</p>
                                <p className="text-sm text-gray-400">{item.task}</p>
                                {item.sources && item.sources.length > 0 && (
                                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                                        {item.sources.map((s, i) => <SourceLink key={i} source={s} />)}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </Section>

            {/* Strategy Map */}
            <Section title="가격 구간별 전략 맵">
                 <StrategyTable
                    strategyMap={strategyMap}
                    currentPrice={currentPrice}
                    currency={currency}
                    marketTarget={marketTarget}
                />
            </Section>

            {/* On/Off Triggers */}
            <Section title="켜짐/꺼짐 트리거 (비중↑/↓ 신호)" icon={<BellIcon />}>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3 bg-green-900/30 rounded-lg">
                        <h4 className="font-bold text-green-300 mb-2">켜짐 (비중 ↑)</h4>
                        <ul className="space-y-2 list-disc list-inside">
                            {onOffTriggers.on.map((trigger, index) => (
                                <li key={index} className="text-sm text-gray-300">
                                    {trigger.description}
                                    {trigger.sources && trigger.sources.length > 0 && <div className="flex flex-wrap gap-x-2 gap-y-1 mt-1">{trigger.sources.map((s, i) => <SourceLink key={i} source={s} />)}</div>}
                                </li>
                            ))}
                        </ul>
                    </div>
                     <div className="p-3 bg-red-900/30 rounded-lg">
                        <h4 className="font-bold text-red-300 mb-2">꺼짐 (비중 ↓)</h4>
                        <ul className="space-y-2 list-disc list-inside">
                            {onOffTriggers.off.map((trigger, index) => (
                                <li key={index} className="text-sm text-gray-300">
                                    {trigger.description}
                                    {trigger.sources && trigger.sources.length > 0 && <div className="flex flex-wrap gap-x-2 gap-y-1 mt-1">{trigger.sources.map((s, i) => <SourceLink key={i} source={s} />)}</div>}
                                </li>
                            ))}
                        </ul>
                    </div>
                 </div>
            </Section>
            
            {/* Risk Management */}
            <Section title="포트폴리오 & 리스크 관리" icon={<ShieldCheckIcon />}>
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="p-3 bg-gray-900/40 rounded-md"><dt className="font-semibold text-gray-300">총 비중 범위</dt><dd className="text-gray-400">{riskManagement.totalWeightRange}</dd></div>
                    <div className="p-3 bg-gray-900/40 rounded-md"><dt className="font-semibold text-gray-300">시간 프레임</dt><dd className="text-gray-400">{riskManagement.timeframe}</dd></div>
                    <div className="p-3 bg-gray-900/40 rounded-md"><dt className="font-semibold text-gray-300">헤지 전략</dt><dd className="text-gray-400">{riskManagement.hedging}</dd></div>
                    <div className="p-3 bg-gray-900/40 rounded-md"><dt className="font-semibold text-gray-300">뉴스 소스 규율</dt><dd className="text-gray-400">{riskManagement.newsSourceDiscipline}</dd></div>
                </dl>
            </Section>
            
             {/* Fact Check */}
            <Section title="주의 & 팩트 체크 메모" icon={<InfoIcon />}>
                <div className="space-y-3">
                     {factCheck.map((item, index) => (
                        <div key={index} className="p-3 bg-gray-900/40 rounded-md">
                            <p className="text-sm text-gray-300">{item.content}</p>
                             {item.sources && item.sources.length > 0 && (
                                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 border-t border-gray-700/50 pt-2">
                                    {item.sources.map((s, i) => <SourceLink key={i} source={s} />)}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </Section>

        </div>
    );
};