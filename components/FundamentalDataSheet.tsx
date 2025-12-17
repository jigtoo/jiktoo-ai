import React from 'react';
import type { FundamentalAnalysis } from '../types';
import { DocumentTextIcon } from './icons';

// NEW: Tooltip component for explanations
const Tooltip: React.FC<{ text: string }> = ({ text }) => (
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-gray-900 text-white text-xs rounded-lg p-2.5 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-lg pointer-events-none
                   before:content-[''] before:absolute before:left-1/2 before:top-full before:-translate-x-1/2 
                   before:border-4 before:border-transparent before:border-t-gray-900">
      {text}
    </div>
);

// NEW: Definitions for financial metrics
const metricDescriptions: { [key: string]: string } = {
    'PER': '주가수익비율 (Price Earnings Ratio): 현재 주가를 주당순이익(EPS)으로 나눈 값입니다. 기업이 벌어들이는 이익에 비해 주가가 얼마나 높은지를 나타내며, 낮을수록 저평가된 것으로 간주될 수 있습니다.',
    'PBR': '주가순자산비율 (Price to Book-value Ratio): 현재 주가를 주당순자산(BPS)으로 나눈 값입니다. 기업의 순자산에 비해 주가가 얼마나 높은지를 나타냅니다. 1배 이하면 주가가 기업의 청산가치보다도 낮다는 의미일 수 있습니다.',
    'ROE': '자기자본이익률 (Return On Equity): 기업이 자기자본을 이용하여 얼마나 많은 이익을 창출했는지를 나타내는 지표입니다. 높을수록 자본 효율성이 좋다는 의미입니다.',
    'EPS': '주당순이익 (Earnings Per Share): 기업의 당기순이익을 총 주식 수로 나눈 값입니다. 1주당 얼마의 이익을 창출했는지를 나타내며, 기업의 수익성을 보여주는 핵심 지표입니다.',
    'BPS': '주당순자산가치 (Book-value Per Share): 기업의 총자산에서 부채를 뺀 순자산을 총 주식 수로 나눈 값입니다. 1주당 얼마의 순자산을 가지고 있는지를 나타내며, 기업의 재무 안정성을 보여줍니다.'
};


// UPDATED: MetricCard to include tooltip
const MetricCard: React.FC<{ name: string, value: string }> = ({ name, value }) => {
    const key = name.split('(')[0].trim().toUpperCase();
    const description = metricDescriptions[key];

    return (
        <div className="relative group bg-gray-900/40 p-3 rounded-lg text-center">
            {description && <Tooltip text={description} />}
            <p className={`text-sm text-gray-400 ${description ? 'cursor-help' : ''}`}>{name}</p>
            <p className="text-xl font-bold font-mono text-white">{value}</p>
        </div>
    );
};

export const FundamentalDataSheet: React.FC<{ analysis: FundamentalAnalysis }> = ({ analysis }) => {
    if (!analysis) return null;

    const { summary, keyMetrics, financialStatementHighlights } = analysis;

    return (
        <div className="bg-gray-800/60 rounded-lg border border-gray-700 p-4 space-y-6">
            <header className="text-center">
                <h3 className="text-xl font-bold text-gray-100">AI 펀더멘털 분석</h3>
                <p className="text-sm text-gray-400">기업의 재무 건전성과 핵심 지표를 평가합니다.</p>
            </header>

            <div className="bg-gray-900/40 p-4 rounded-lg border-l-4 border-teal-500/80">
                <div className="flex items-center gap-3 mb-2">
                    <DocumentTextIcon className="h-6 w-6 text-teal-400" />
                    <h4 className="font-bold text-teal-300">종합 펀더멘털 요약</h4>
                </div>
                <p className="text-gray-300 text-sm">{summary}</p>
            </div>

            {keyMetrics && keyMetrics.length > 0 && (
                <div className="bg-gray-900/40 p-4 rounded-lg">
                    <h4 className="font-bold text-teal-300 mb-3 text-center">핵심 재무 지표</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {keyMetrics.map(metric => (
                            <MetricCard key={metric.name} name={metric.name} value={metric.value} />
                        ))}
                    </div>
                </div>
            )}
            
            {financialStatementHighlights && (
                <div className="bg-gray-900/40 p-4 rounded-lg">
                    <h4 className="font-bold text-teal-300 mb-3 text-center">주요 재무제표 하이라이트</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                            <h5 className="font-semibold text-gray-200 mb-2">손익계산서</h5>
                            <ul className="list-disc list-inside space-y-1 text-gray-400">
                                {financialStatementHighlights.income.map((item, i) => <li key={i}>{item}</li>)}
                            </ul>
                        </div>
                        <div>
                            <h5 className="font-semibold text-gray-200 mb-2">재무상태표</h5>
                             <ul className="list-disc list-inside space-y-1 text-gray-400">
                                {financialStatementHighlights.balanceSheet.map((item, i) => <li key={i}>{item}</li>)}
                            </ul>
                        </div>
                        <div>
                            <h5 className="font-semibold text-gray-200 mb-2">현금흐름표</h5>
                             <ul className="list-disc list-inside space-y-1 text-gray-400">
                                {financialStatementHighlights.cashFlow.map((item, i) => <li key={i}>{item}</li>)}
                            </ul>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};