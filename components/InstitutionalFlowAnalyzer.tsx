import React, { useState, useEffect } from 'react';
import type { InstitutionalFlowAnalysis } from '../types';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorDisplay } from './ErrorDisplay';
import { FlowIcon, BrainIcon, TrendingUpIcon, BuildingIcon, GlobeIcon, InfoIcon, RefreshIcon } from './icons';

interface InstitutionalFlowAnalyzerProps {
    data: InstitutionalFlowAnalysis | null;
    isLoading: boolean;
    error: string | null;
    onRefresh: () => void;
    dataYesterday: InstitutionalFlowAnalysis | null;
    isYesterdayLoading: boolean;
    yesterdayError: string | null;
    onFetchYesterday: () => void;
    proxyStatus: 'connecting' | 'connected' | 'error' | 'disabled';
}

const REFRESH_INTERVAL_SECONDS = 30;

const formatCurrency = (value: number) => {
    if (value === 0) return '0억';
    const valueInEok = (value / 1_0000_0000).toFixed(0);
    return `${value >= 0 ? '+' : ''}${valueInEok}억`;
};

const SummaryCard: React.FC<{ title: string; value: number; icon: React.ReactNode }> = ({ title, value, icon }) => {
    const isPositive = value >= 0;
    const colorClass = isPositive ? 'text-green-400' : 'text-red-400';
    return (
        <div className="bg-gray-900/50 p-3 rounded-lg text-center">
            <h4 className="flex items-center justify-center gap-2 text-sm text-gray-400">
                {icon}
                <span>{title}</span>
            </h4>
            <p className={`text-2xl font-bold font-mono mt-1 ${colorClass}`}>{formatCurrency(value)}</p>
        </div>
    );
};

const PlaceholderCard: React.FC<{ title: string; }> = ({ title }) => (
    <div className="bg-gray-900/50 p-3 rounded-lg text-center opacity-50 cursor-not-allowed" title="향후 연동 예정입니다.">
        <h4 className="flex items-center justify-center gap-2 text-sm text-gray-500">
            {title}
        </h4>
        <p className={`text-2xl font-bold font-mono mt-1 text-gray-500`}>-</p>
    </div>
);

const DetailRow: React.FC<{ label: string; value: number }> = ({ label, value }) => {
    const isPositive = value >= 0;
    const colorClass = isPositive ? 'text-green-400' : 'text-red-400';
    return (
        <div className="flex justify-between items-center text-sm">
            <span className="text-gray-300">{label}</span>
            <span className={`font-mono font-semibold ${colorClass}`}>{formatCurrency(value)}</span>
        </div>
    );
};

export const InstitutionalFlowAnalyzer: React.FC<InstitutionalFlowAnalyzerProps> = ({ 
    data, isLoading, error, onRefresh,
    dataYesterday, isYesterdayLoading, yesterdayError, onFetchYesterday, proxyStatus
}) => {
    const [viewMode, setViewMode] = useState<'today' | 'yesterday'>('today');
    const [isEarlyTrading, setIsEarlyTrading] = useState(false);
    const [countdown, setCountdown] = useState(REFRESH_INTERVAL_SECONDS);

    // Smart auto-refresh logic
    useEffect(() => {
        if (viewMode !== 'today' || proxyStatus !== 'connected' || isLoading) {
            return;
        }

        let intervalId: number;

        const handleVisibilityChange = () => {
            if (document.hidden) {
                clearInterval(intervalId);
            } else {
                setCountdown(REFRESH_INTERVAL_SECONDS);
                startInterval();
            }
        };

        const startInterval = () => {
            intervalId = window.setInterval(() => {
                setCountdown(prev => {
                    if (prev <= 1) {
                        onRefresh();
                        return REFRESH_INTERVAL_SECONDS;
                    }
                    return prev - 1;
                });
            }, 1000);
        };

        if (!document.hidden) {
            startInterval();
        }

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            clearInterval(intervalId);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [viewMode, proxyStatus, isLoading, onRefresh]);


    useEffect(() => {
        const checkTime = () => {
            const now = new Date();
            const kstTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
            const dayOfWeek = kstTime.getDay();
            const kstHour = kstTime.getHours();
            const kstMinutes = kstTime.getMinutes();
            if (dayOfWeek >= 1 && dayOfWeek <= 5) {
                if (kstHour < 9 || (kstHour === 9 && kstMinutes < 45)) {
                    setIsEarlyTrading(true);
                } else {
                    setIsEarlyTrading(false);
                }
            } else {
                setIsEarlyTrading(false);
            }
        };
        checkTime();
        const interval = setInterval(checkTime, 60000);
        return () => clearInterval(interval);
    }, []);

    const handleViewYesterday = () => {
        if (!dataYesterday) {
            onFetchYesterday();
        }
        setViewMode('yesterday');
    };

    const currentData = viewMode === 'today' ? data : dataYesterday;
    const currentLoading = viewMode === 'today' ? isLoading : isYesterdayLoading;
    const currentError = viewMode === 'today' ? error : yesterdayError;
    const currentRefresh = viewMode === 'today' ? onRefresh : onFetchYesterday;

    const renderContent = () => {
        if (proxyStatus !== 'connected') {
            return (
                <div className="text-center p-8">
                     <p className="text-yellow-300 font-semibold mb-2">키움 브릿지 연결 필요</p>
                     <p className="text-gray-400 text-sm">이 기능을 사용하려면 로컬 PC에서 키움 브릿지 서버를 실행해야 합니다.</p>
                     <p className="text-gray-500 text-xs mt-1">자세한 내용은 `kis-proxy/README.md` 파일을 참고하세요.</p>
                </div>
            );
        }
        if (currentLoading) {
            return <div className="p-8"><LoadingSpinner message={`${viewMode === 'today' ? '오늘' : '어제'}의 수급 데이터를 분석 중...`} /></div>;
        }
        if (currentError) {
            return <ErrorDisplay title="수급 분석 실패" message={currentError} onRetry={currentRefresh} />;
        }
        if (!currentData) {
            return (
                <div className="text-center p-8">
                    <p className="text-gray-500 mb-4">데이터를 불러오지 못했습니다.</p>
                    <button onClick={currentRefresh} className="px-4 py-2 bg-gray-700 text-white font-semibold rounded-lg hover:bg-gray-600">
                        데이터 가져오기
                    </button>
                </div>
            );
        }

        const { kospi, kosdaq, futures, aiVerdict, topSectors } = currentData;

        return (
            <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <SummaryCard title="KOSPI 비차익" value={kospi.nonArbitrage} icon={<BuildingIcon className="h-5 w-5"/>} />
                    <SummaryCard title="외국인 선물" value={futures.foreignerNetBuy} icon={<GlobeIcon className="h-5 w-5"/>} />
                    <SummaryCard title="KOSDAQ 비차익" value={kosdaq.nonArbitrage} icon={<BuildingIcon className="h-5 w-5"/>} />
                    <PlaceholderCard title="미결제약정" />
                    <PlaceholderCard title="베이시스" />
                </div>

                <div className="p-4 bg-gray-900/50 rounded-lg border-l-4 border-cyan-500">
                    <h4 className="flex items-center gap-2 font-bold text-cyan-300 mb-2">
                        <BrainIcon className="h-5 w-5"/>
                        AI 수급 해석
                    </h4>
                    <p className="text-lg font-semibold text-white mb-2">{aiVerdict.status}</p>
                    <p className="text-sm text-gray-300">{aiVerdict.summary}</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="p-4 bg-gray-900/50 rounded-lg space-y-3">
                        <h4 className="font-bold text-lg text-white">시장별 프로그램 매매</h4>
                        <DetailRow label="코스피 전체" value={kospi.total} />
                        <DetailRow label="코스닥 전체" value={kosdaq.total} />
                        <DetailRow label="코스피 차익" value={kospi.arbitrage} />
                        <DetailRow label="코스닥 차익" value={kosdaq.arbitrage} />
                    </div>

                     <div className="p-4 bg-gray-900/50 rounded-lg">
                        <h4 className="flex items-center gap-2 font-bold text-cyan-300 mb-3">
                            <TrendingUpIcon className="h-5 w-5" />
                            기관 매수 집중 섹터
                        </h4>
                        <div className="space-y-2">
                            {topSectors && topSectors.length > 0 ? topSectors.map((sector, index) => (
                                <div key={index} className="flex justify-between items-center text-sm p-2 bg-gray-800/60 rounded-md">
                                    <span className="font-semibold text-gray-200">{index + 1}. {sector.sectorName}</span>
                                    <span className="font-mono text-green-400">
                                        {formatCurrency(sector.netBuy)}
                                    </span>
                                </div>
                            )) : <p className="text-sm text-gray-500 text-center">집중 매수 섹터가 없습니다.</p>}
                        </div>
                    </div>
                </div>
            </div>
        );
    };
    
    const tabStyle = "px-4 py-2 text-sm font-semibold rounded-md transition-colors w-full";
    const activeTabStyle = "bg-cyan-600 text-white";
    const inactiveTabStyle = "text-gray-400 bg-gray-800 hover:bg-gray-700";
    const dataStatus = currentData?.dataStatus;

    return (
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl shadow-lg p-4">
            <header className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-4">
                <div className="flex items-center gap-3">
                    <FlowIcon />
                    <h3 className="text-lg font-bold text-gray-100">기관 수급 분석기 (대한민국)</h3>
                     {dataStatus && (
                        <div className="flex items-center gap-1.5 text-xs font-semibold">
                            <span className={`w-2 h-2 rounded-full ${dataStatus === 'live' ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></span>
                            <span className={dataStatus === 'live' ? 'text-green-400' : 'text-gray-400'}>
                                {dataStatus === 'live' ? '실시간' : '마감'}
                            </span>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-2">
                     {viewMode === 'today' && proxyStatus === 'connected' && (
                        <div className="text-xs text-gray-400 flex items-center gap-1" title="다음 자동 새로고침까지 남은 시간">
                            <RefreshIcon className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                            <span>{countdown}s</span>
                        </div>
                    )}
                    <div className="flex items-center p-1 bg-gray-900/50 rounded-lg w-full sm:w-auto">
                        <button onClick={() => setViewMode('today')} className={`${tabStyle} ${viewMode === 'today' ? activeTabStyle : inactiveTabStyle}`}>오늘</button>
                        <button onClick={handleViewYesterday} className={`${tabStyle} ${viewMode === 'yesterday' ? activeTabStyle : inactiveTabStyle}`}>어제</button>
                    </div>
                </div>
            </header>
             {isEarlyTrading && viewMode === 'today' && !isLoading && !error && (
                <div className="mb-4 p-3 bg-blue-900/40 text-blue-200 border border-blue-700/50 rounded-lg text-sm flex items-center gap-3">
                    <InfoIcon className="h-5 w-5 flex-shrink-0" />
                    <span>장 초반 (개장 후 ~9:45) 데이터는 변동성이 크며, 시간이 지나면서 수치가 안정화되고 신뢰도가 높아집니다.</span>
                </div>
            )}
            {renderContent()}
        </div>
    );
};