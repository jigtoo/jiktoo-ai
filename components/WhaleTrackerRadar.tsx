import React, { useState, useEffect } from 'react';
import type { WhaleRadarData, MarketTarget } from '../types';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorDisplay } from './ErrorDisplay';
import { WhaleTrackerIcon, RefreshIcon } from './icons';
import { marketInfo } from '../services/geminiService';

interface WhaleTrackerRadarProps {
    data: WhaleRadarData[] | null;
    isLoading: boolean;
    error: string | null;
    marketTarget: MarketTarget;
    proxyStatus: 'connecting' | 'connected' | 'error' | 'disabled';
    onRefresh: () => void;
}

const REFRESH_INTERVAL_SECONDS = 30;

const DataRow: React.FC<{ item: WhaleRadarData }> = ({ item }) => {
    
    const formatCurrency = (value: number) => {
        if (value === 0) return '0억';
        const valueInEok = value / 100;
        return `${value >= 0 ? '+' : ''}${valueInEok.toFixed(1)}억`;
    };

    const valueColor = (value: number) => {
        if (value > 0) return 'text-green-400';
        if (value < 0) return 'text-red-400';
        return 'text-gray-300';
    };

    return (
        <tr className="border-b border-gray-700/50">
            <td className="px-4 py-3 font-medium text-gray-200">
                <div>{item.stockName}</div>
                <div className="font-mono text-xs text-gray-500">{item.ticker}</div>
            </td>
            <td className={`px-4 py-3 text-right font-mono ${valueColor(item.institutionalNetBuy)}`}>{formatCurrency(item.institutionalNetBuy)}</td>
            <td className={`px-4 py-3 text-right font-mono ${valueColor(item.foreignNetBuy)}`}>{formatCurrency(item.foreignNetBuy)}</td>
            <td className={`px-4 py-3 text-right font-mono ${valueColor(item.pensionNetBuy)}`}>{formatCurrency(item.pensionNetBuy)}</td>
        </tr>
    );
};

export const WhaleTrackerRadar: React.FC<WhaleTrackerRadarProps> = ({ data, isLoading, error, marketTarget, proxyStatus, onRefresh }) => {
    const [countdown, setCountdown] = useState(REFRESH_INTERVAL_SECONDS);

    // Smart auto-refresh logic
    useEffect(() => {
        if (proxyStatus !== 'connected' || isLoading) {
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
    }, [proxyStatus, isLoading, onRefresh]);


    const renderContent = () => {
         if (proxyStatus !== 'connected') {
            return (
                <div className="text-center p-8">
                     <p className="text-yellow-300 font-semibold mb-2">키움 브릿지 연결 필요</p>
                     <p className="text-gray-400 text-sm">이 기능은 '기관 수급 분석기'의 데이터를 기반으로 동작하며, 로컬 PC에서 키움 브릿지 서버를 실행해야 합니다.</p>
                </div>
            );
        }
        if (isLoading && !data) { // Show spinner only on initial load
            return <div className="p-8"><LoadingSpinner message="집중 섹터 내 세력 움직임을 추적 중..." /></div>;
        }
        if (!data || data.length === 0) {
             if (error) {
                // If there's an error and no data, show the full error display
                return <ErrorDisplay title="세력 추적 실패" message={error} />;
             }
            return <p className="text-center text-gray-500 p-8">추적할 종목 데이터가 없거나, 아직 세력 움직임이 포착되지 않았습니다.</p>;
        }

        // If we have data, render the table
        return (
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-400 uppercase bg-gray-900/50">
                        <tr>
                            <th scope="col" className="px-4 py-2">종목</th>
                            <th scope="col" className="px-4 py-2 text-right">기관 (누적)</th>
                            <th scope="col" className="px-4 py-2 text-right">외국인 (누적)</th>
                            <th scope="col" className="px-4 py-2 text-right">연기금 (누적)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((item) => <DataRow key={item.ticker} item={item} />)}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl shadow-lg p-4">
            <header className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                    <WhaleTrackerIcon />
                    <h3 className="text-lg font-bold text-gray-100">세력 추적 레이더</h3>
                </div>
                {proxyStatus === 'connected' && (
                    <div className="text-xs text-gray-400 flex items-center gap-1" title="다음 자동 새로고침까지 남은 시간">
                        <RefreshIcon className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                        <span>{countdown}s</span>
                    </div>
                )}
            </header>
            {/* Render partial error message above the content if it exists */}
            {error && data && data.length > 0 && (
                <div className="mb-4 p-3 bg-yellow-900/30 text-yellow-300 text-sm rounded-md">
                    <strong>주의:</strong> {error}
                </div>
            )}
            {renderContent()}
        </div>
    );
};