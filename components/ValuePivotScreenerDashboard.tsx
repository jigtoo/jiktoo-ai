// components/ValuePivotScreenerDashboard.tsx
import React from 'react';
import type { useValuePivotScreener } from '../hooks/useValuePivotScreener';
import type { ValuePivotScreenerResult } from '../types';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorDisplay } from './ErrorDisplay';
import { FoundationIcon, CheckCircleIcon, XCircleIcon, BrainIcon } from './icons';

interface ValuePivotScreenerDashboardProps extends ReturnType<typeof useValuePivotScreener> {
    onSelectStock: (ticker: string, rationale: string, stockName: string) => void;
}

const ScorePill: React.FC<{ label: string; score: number; max: number; passed: boolean }> = ({ label, score, max, passed }) => (
    <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold ${passed ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'}`}>
        {passed ? <CheckCircleIcon className="h-5 w-5" /> : <XCircleIcon className="h-5 w-5" />}
        <span>{label}: {score}/{max}</span>
    </div>
);

const ResultCard: React.FC<{ result: ValuePivotScreenerResult; onSelect: () => void }> = ({ result, onSelect }) => {
    const { structuralChangeScore: scs, policyAlignmentScore: pas } = result;
    const isCandidate = scs.total >= 2 && pas.total >= 1;

    return (
        <div className={`p-4 bg-gray-800/70 border rounded-xl shadow-lg transition-all transform hover:-translate-y-1 ${isCandidate ? 'border-cyan-500/80 hover:border-cyan-400' : 'border-gray-700'}`}>
            <header className="flex justify-between items-start">
                <div>
                    <h3 className="text-xl font-bold text-white">{result.stockName}</h3>
                    <p className="font-mono text-gray-400">{result.ticker}</p>
                </div>
                {isCandidate && (
                    <span className="px-3 py-1 text-sm font-bold bg-cyan-600 text-white rounded-full">후보 선정</span>
                )}
            </header>

            <div className="my-3 p-3 bg-gray-900/50 rounded-lg border-l-4 border-cyan-500">
                <h4 className="flex items-center gap-2 font-bold text-cyan-300 mb-1"><BrainIcon className="h-5 w-5" /> AI 요약</h4>
                <p className="text-sm text-gray-300">{result.summary}</p>
            </div>

            <div className="flex flex-wrap gap-2 my-3">
                <ScorePill label="구조 변화" score={scs.total} max={3} passed={scs.total >= 2} />
                <ScorePill label="정책 정합성" score={pas.total} max={1} passed={pas.total >= 1} />
            </div>

            <details className="text-xs">
                <summary className="cursor-pointer text-gray-400 hover:text-white">판단 근거 상세보기</summary>
                <div className="mt-2 p-2 bg-gray-900/50 rounded-md space-y-1">
                    <p className={scs.capexVsDepreciation.pass ? 'text-green-300' : 'text-red-300'}>{scs.capexVsDepreciation.pass ? '✅' : '❌'} CAPEX &gt; 감가상각비: {scs.capexVsDepreciation.details}</p>
                    <p className={scs.businessMixShift.pass ? 'text-green-300' : 'text-red-300'}>{scs.businessMixShift.pass ? '✅' : '❌'} 사업 전환: {scs.businessMixShift.details}</p>
                    <p className={scs.irPivotMention.pass ? 'text-green-300' : 'text-red-300'}>{scs.irPivotMention.pass ? '✅' : '❌'} IR 언급: {scs.irPivotMention.details}</p>
                    <p className={pas.pass ? 'text-green-300' : 'text-red-300'}>{pas.pass ? '✅' : '❌'} 정책 부합: {pas.details}</p>
                </div>
            </details>

            <button
                onClick={onSelect}
                className="w-full mt-4 px-4 py-2 bg-gray-600 text-white font-semibold rounded-lg shadow-md hover:bg-gray-500 transition-colors"
            >
                심층 분석 보기
            </button>
        </div>
    );
};

export const ValuePivotScreenerDashboard: React.FC<ValuePivotScreenerDashboardProps> = ({ results, isLoading, error, runScan, onSelectStock }) => {
    return (
        <div className="animate-fade-in space-y-8">
            <header className="text-center">
                <h2 className="text-3xl font-bold text-gray-100">가치-피벗 스크리너</h2>
                <p className="text-gray-400 max-w-3xl mx-auto mt-2">
                    "탄탄한 기업은 자기 돈을 미래로 이동시킨다." 이 철학에 따라, AI가 기업 내부의 구조적 변화와 자본 배분 방향 전환의 흔적을 포착하여 미래 가치가 상승할 가능성이 높은 기업을 발굴합니다.
                </p>
            </header>

            <div className="p-4 bg-gray-800/50 border border-gray-700 rounded-xl shadow-lg space-y-4">
                <h3 className="text-xl font-bold text-white text-center">스캔 대상 선택</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                        onClick={() => runScan('full')}
                        disabled={isLoading}
                        className="w-full px-6 py-4 bg-cyan-600 text-white font-bold rounded-lg shadow-lg hover:bg-cyan-700 transition-transform transform hover:scale-105 disabled:opacity-50"
                    >
                        전체 시장 스캔
                    </button>
                    <button
                        onClick={() => runScan('watchlist')}
                        disabled={isLoading}
                        className="w-full px-6 py-4 bg-purple-600 text-white font-bold rounded-lg shadow-lg hover:bg-purple-700 transition-transform transform hover:scale-105 disabled:opacity-50"
                    >
                        관심종목 필터링
                    </button>
                </div>
            </div>

            {isLoading && <LoadingSpinner message="AI가 기업의 내부 변화를 추적하고 분석하는 중..." />}
            {error && <ErrorDisplay title="스캔 실패" message={error} />}

            {results && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {results.map(result => (
                        <ResultCard key={result.ticker} result={result} onSelect={() => onSelectStock(result.ticker, result.summary, result.stockName)} />
                    ))}
                </div>
            )}
        </div>
    );
};