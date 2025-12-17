import React, { useEffect, useState } from 'react';
import { fetchMacroIndicators } from '../services/fredService';
import { ChevronDownIcon, ChevronUpIcon } from './icons';

interface MacroIndicators {
    federalFundsRate: number;
    unemploymentRate: number;
    cpi: number;
    gdp: number;
}

export const MacroIndicatorPanel: React.FC = () => {
    const [indicators, setIndicators] = useState<MacroIndicators | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
    const [isExpanded, setIsExpanded] = useState(false); // Default to collapsed

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await fetchMacroIndicators();
            setIndicators(data);
            setLastUpdate(new Date());
        } catch (err: any) {
            console.error('[MacroIndicatorPanel] Error fetching indicators:', err);
            setError(err.message || 'Failed to load economic indicators');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // 30분마다 갱신
        const interval = setInterval(fetchData, 30 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    const getIndicatorColor = (value: number, type: 'rate' | 'unemployment' | 'cpi' | 'gdp'): string => {
        switch (type) {
            case 'rate':
                if (value > 4.5) return 'text-red-400';
                if (value < 2.0) return 'text-green-400';
                return 'text-yellow-400';
            case 'unemployment':
                if (value > 5.5) return 'text-red-400';
                if (value < 4.0) return 'text-green-400';
                return 'text-yellow-400';
            case 'cpi':
                if (value > 3.0) return 'text-red-400';
                if (value < 2.0) return 'text-green-400';
                return 'text-yellow-400';
            case 'gdp':
                if (value > 3.0) return 'text-green-400';
                if (value < 1.0) return 'text-red-400';
                return 'text-yellow-400';
            default:
                return 'text-gray-400';
        }
    };

    const getMarketRegime = (): { label: string; color: string; icon: string } => {
        if (!indicators) return { label: '분석 중...', color: 'text-gray-400', icon: '⏳' };

        const { federalFundsRate, unemploymentRate } = indicators;

        if (federalFundsRate > 4.5 && unemploymentRate < 4.5) {
            return { label: '긴축 국면', color: 'text-red-400', icon: '🔴' };
        }

        if (federalFundsRate < 2.0 && unemploymentRate > 5.5) {
            return { label: '완화 국면', color: 'text-green-400', icon: '🟢' };
        }

        return { label: '중립 국면', color: 'text-yellow-400', icon: '🟡' };
    };

    const regime = getMarketRegime();

    if (loading && !indicators) {
        return (
            <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-4 animate-pulse flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="text-xl">📊</div>
                    <h3 className="text-base font-bold text-gray-200">거시경제 지표 로딩 중...</h3>
                </div>
            </div>
        );
    }

    if (error && !indicators) {
        return (
            <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="text-xl">❌</div>
                    <h3 className="text-base font-bold text-red-400">지표 로드 실패</h3>
                </div>
                <button onClick={fetchData} className="text-xs px-3 py-1 bg-gray-700 rounded hover:bg-gray-600 text-white">
                    재시도
                </button>
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-xl shadow-lg overflow-hidden transition-all duration-300">
            {/* Collapsible Header */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-800/50 transition-colors"
            >
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className="text-xl">📊</div>
                        <h3 className="text-base font-bold text-gray-200">거시경제 지표</h3>
                    </div>

                    {/* Summary View (Always Visible) */}
                    <div className="hidden sm:flex items-center gap-4 px-4 border-l border-gray-700">
                        <div className="flex items-center gap-2">
                            <span className="text-lg">{regime.icon}</span>
                            <span className={`text-sm font-bold ${regime.color}`}>{regime.label}</span>
                        </div>
                        {indicators && (
                            <>
                                <div className="text-xs text-gray-400">
                                    금리 <span className={`font-bold ${getIndicatorColor(indicators.federalFundsRate, 'rate')}`}>{indicators.federalFundsRate.toFixed(2)}%</span>
                                </div>
                                <div className="text-xs text-gray-400">
                                    실업률 <span className={`font-bold ${getIndicatorColor(indicators.unemploymentRate, 'unemployment')}`}>{indicators.unemploymentRate.toFixed(1)}%</span>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 hidden sm:inline">
                        {lastUpdate?.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} 갱신
                    </span>
                    {isExpanded ? (
                        <ChevronUpIcon className="h-5 w-5 text-gray-400" />
                    ) : (
                        <ChevronDownIcon className="h-5 w-5 text-gray-400" />
                    )}
                </div>
            </button>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="p-4 border-t border-gray-700 bg-gray-800/30 animate-fade-in">
                    {/* Market Regime Badge (Detailed) */}
                    <div className="mb-4 p-3 bg-gray-800/50 rounded-lg border border-gray-600 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">{regime.icon}</span>
                            <div>
                                <p className="text-xs text-gray-400">현재 시장 국면 분석</p>
                                <p className={`text-lg font-bold ${regime.color}`}>{regime.label}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <button
                                onClick={fetchData}
                                disabled={loading}
                                className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-cyan-400 disabled:opacity-50 flex items-center gap-1 ml-auto"
                            >
                                <span>🔄</span> 데이터 새로고침
                            </button>
                        </div>
                    </div>

                    {/* Indicators Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {/* Federal Funds Rate */}
                        <div className="bg-gray-800/70 rounded-lg p-3 border border-gray-600 hover:border-cyan-500 transition-all">
                            <div className="text-xs text-gray-400 mb-1">연방기금금리</div>
                            <div className={`text-xl font-bold ${getIndicatorColor(indicators?.federalFundsRate || 0, 'rate')}`}>
                                {indicators?.federalFundsRate.toFixed(2)}%
                            </div>
                            <div className="text-xs text-gray-500 mt-1">DFF</div>
                        </div>

                        {/* Unemployment Rate */}
                        <div className="bg-gray-800/70 rounded-lg p-3 border border-gray-600 hover:border-cyan-500 transition-all">
                            <div className="text-xs text-gray-400 mb-1">실업률</div>
                            <div className={`text-xl font-bold ${getIndicatorColor(indicators?.unemploymentRate || 0, 'unemployment')}`}>
                                {indicators?.unemploymentRate.toFixed(1)}%
                            </div>
                            <div className="text-xs text-gray-500 mt-1">UNRATE</div>
                        </div>

                        {/* CPI */}
                        <div className="bg-gray-800/70 rounded-lg p-3 border border-gray-600 hover:border-cyan-500 transition-all">
                            <div className="text-xs text-gray-400 mb-1">소비자물가지수</div>
                            <div className={`text-xl font-bold ${getIndicatorColor(indicators?.cpi || 0, 'cpi')}`}>
                                {indicators?.cpi.toFixed(1)}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">CPIAUCSL</div>
                        </div>

                        {/* GDP */}
                        <div className="bg-gray-800/70 rounded-lg p-3 border border-gray-600 hover:border-cyan-500 transition-all">
                            <div className="text-xs text-gray-400 mb-1">GDP (조 달러)</div>
                            <div className={`text-xl font-bold ${getIndicatorColor((indicators?.gdp ?? 0) / 1000, 'gdp')}`}>
                                {((indicators?.gdp ?? 0) / 1000).toFixed(1)}T
                            </div>
                            <div className="text-xs text-gray-500 mt-1">GDP</div>
                        </div>
                    </div>

                    {/* Legend */}
                    <div className="mt-3 flex justify-center gap-4 text-[10px] text-gray-500">
                        <div className="flex items-center gap-1"><div className="w-2 h-2 bg-green-400 rounded-full"></div>양호</div>
                        <div className="flex items-center gap-1"><div className="w-2 h-2 bg-yellow-400 rounded-full"></div>보통</div>
                        <div className="flex items-center gap-1"><div className="w-2 h-2 bg-red-400 rounded-full"></div>주의</div>
                    </div>
                </div>
            )}
        </div>
    );
};
