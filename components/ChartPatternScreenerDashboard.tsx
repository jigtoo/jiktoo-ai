
// components/ChartPatternScreenerDashboard.tsx
import React from 'react';
import type { useChartPatternScreener } from '../hooks/useChartPatternScreener';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorDisplay } from './ErrorDisplay';
import { CrosshairIcon, InfoIcon, RefreshIcon } from './icons'; // Added RefreshIcon for consistency with other standalones
import { ScreenerResultCard } from './ScreenerResultCard';
import type { ScreenerTimeframe } from '../types';

interface ChartPatternScreenerDashboardProps {
    screener: ReturnType<typeof useChartPatternScreener>;
    // isEmbedded?: boolean; // Removed as it's always full page now
}

export const ChartPatternScreenerDashboard: React.FC<ChartPatternScreenerDashboardProps> = ({ screener }) => {
    const { results, isLoading, error, runScan, timeframe, setTimeframe } = screener;

    const TimeframeSelector: React.FC = () => {
        const timeframes: { key: ScreenerTimeframe; label: string }[] = [
            { key: 'Intraday', label: '분봉' },
            { key: 'Daily', label: '일봉' },
            { key: 'Weekly', label: '주봉' },
            { key: 'Monthly', label: '월봉' },
        ];

        return (
            <div className="flex justify-center p-1 bg-gray-900/50 rounded-lg">
                {timeframes.map(tf => (
                    <button
                        key={tf.key}
                        onClick={() => {
                            if (!isLoading) {
                                setTimeframe(tf.key);
                            }
                        }}
                        disabled={isLoading}
                        aria-pressed={timeframe === tf.key}
                        className={`text-center px-4 py-2 text-sm font-semibold rounded-md transition-colors w-full ${isLoading ? 'opacity-50 cursor-not-allowed' : ''} ${timeframe === tf.key
                            ? 'bg-cyan-600 text-white'
                            : 'text-gray-400 hover:bg-gray-700'
                            }`}
                    >
                        {tf.label}
                    </button>
                ))}
            </div>
        );
    };

    const renderContent = () => {
        if (isLoading) {
            return <div className="mt-8"><LoadingSpinner message="AI가 차트 패턴을 분석하고 점수화하는 중입니다..." showWittyMessages={true} /></div>;
        }
        if (error) {
            return <ErrorDisplay title="패턴 스캔 실패" message={error} onRetry={runScan} />;
        }
        if (results && results.length > 0) {
            return (
                <div className="space-y-6">
                    {results.map((result) => (
                        <ScreenerResultCard key={result.symbol} result={result} />
                    ))}
                </div>
            );
        }
        if (results && results.length === 0) {
            return (
                <div className="text-center text-gray-500 py-20 px-4 bg-gray-800/30 rounded-lg">
                    <InfoIcon className="h-12 w-12 mx-auto mb-4 text-gray-600" />
                    <h3 className="text-xl font-semibold text-gray-400">포착된 패턴 없음</h3>
                    <p className="mt-2">현재 조건에 맞는 유의미한 차트 패턴을 찾지 못했습니다. 시장 상황이 좋지 않거나, 명확한 신호가 없는 상태일 수 있습니다.</p>
                </div>
            );
        }
        return null;
    };

    // FullHeader is now always rendered as the component is no longer embedded
    const FullHeader = () => (
        <header className="p-4 bg-gray-800/30 rounded-lg flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-center sm:text-left">
                <div className="inline-block bg-gray-700 p-3 rounded-full mb-3">
                    <CrosshairIcon className="h-10 w-10 text-cyan-400" />
                </div>
                <h2 className="text-3xl font-bold text-gray-100">AI 차트 패턴 스크리너</h2>
                <p className="text-gray-400 mt-1 max-w-3xl mx-auto">
                    AI가 기술적 분석 대가들의 8가지 핵심 전략을 기반으로 시장을 스캔하여, 지금 바로 주목해야 할 가장 유망한 차트 패턴을 가진 종목을 발굴합니다.
                </p>
            </div>
            {results && ( // Show refresh button only if there are results
                <div className="flex-shrink-0">
                    <button
                        onClick={() => runScan()}
                        disabled={isLoading}
                        className={`flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 text-white font-semibold rounded-lg shadow-md hover:bg-gray-600 transition-colors disabled:opacity-50`}
                    >
                        <RefreshIcon className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
                        <span>재탐색</span>
                    </button>
                </div>
            )}
        </header>
    );

    return (
        <div className="animate-fade-in space-y-8">
            <FullHeader /> {/* Always render the full header */}

            <div className="p-4 bg-gray-800/50 rounded-lg text-sm text-gray-300">
                <p className="flex items-center gap-2">
                    <InfoIcon className="inline h-5 w-5 mr-2 flex-shrink-0" />
                    <span>
                        AI는 선택된 시간 기준(<strong>{timeframe}</strong>)으로 패턴을 분석합니다.
                        결과는 주로 <strong>단기 스윙</strong> 또는 <strong>중장기</strong> 관점에 더 적합할 수 있습니다. 각 종목의 트레이딩 플랜에서 추천하는 투자 스타일을 확인하세요.
                    </span>
                </p>
            </div>

            <div className="max-w-lg mx-auto space-y-4">
                <TimeframeSelector />
                <button
                    type="button"
                    onClick={() => {
                        if (!isLoading) {
                            runScan();
                        }
                    }}
                    disabled={isLoading}
                    className={`text-center w-full px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-lg rounded-lg shadow-lg transition-transform transform ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 hover:from-cyan-600 hover:to-blue-700'}`}
                >
                    <span>{isLoading ? '스캔 중...' : (results ? '다시 스캔하기' : '지금 바로 유망 패턴 스캔 시작')}</span>
                </button>
            </div>

            {renderContent()}
        </div>
    );
};
