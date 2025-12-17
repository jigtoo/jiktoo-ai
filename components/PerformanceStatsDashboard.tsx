// components/PerformanceStatsDashboard.tsx
import React from 'react';
import type { PerformanceStats } from '../types';
import { LoadingSpinner } from './LoadingSpinner';
import { InfoIcon, ScaleIcon, ChecklistIcon, CheckCircleIcon, BrainIcon } from './icons';

interface PerformanceStatsDashboardProps {
    stats: PerformanceStats | null;
    isLoading: boolean;
}

const KpiCard: React.FC<{ title: string; value: string; icon: React.ReactNode; tooltip: string }> = ({ title, value, icon, tooltip }) => (
    <div className="relative group bg-gray-900/50 p-3 rounded-lg text-center border border-gray-700/50">
        <div className="flex items-center justify-center gap-2 text-sm font-semibold text-gray-300">
            {icon}
            {title}
        </div>
        <p className="text-3xl font-bold text-cyan-300 mt-1">{value}</p>
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-gray-900 text-white text-xs rounded-lg py-1.5 px-2.5 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-lg pointer-events-none before:content-[''] before:absolute before:left-1/2 before:top-full before:-translate-x-1/2 before:border-4 before:border-transparent before:border-t-gray-900">
            {tooltip}
        </div>
    </div>
);

export const PerformanceStatsDashboard: React.FC<PerformanceStatsDashboardProps> = ({ stats, isLoading }) => {
    if (isLoading) {
        return (
            <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700 text-center">
                <LoadingSpinner message="성과 분석 중..." />
            </div>
        );
    }

    if (!stats || stats.totalReviewed === 0) {
        return (
            <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700 text-center text-gray-500">
                <InfoIcon className="h-8 w-8 mx-auto mb-2" />
                <p>성과 데이터가 없습니다.</p>
                <p className="text-xs">AI의 예측이 검토된 후 여기에 통계가 표시됩니다.</p>
            </div>
        );
    }
    
    return (
        <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
            <h3 className="text-xl font-bold text-center text-white mb-4 flex items-center justify-center gap-2">
                <ScaleIcon className="h-6 w-6 text-cyan-400" />
                알파 엔진 성과 리포트
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                 <KpiCard title="총 검토된 신호" value={stats.totalReviewed.toString()} icon={<ChecklistIcon className="h-5 w-5"/>} tooltip="AI 성장 일지에 기록되어 성패가 검토된 총 예측 신호의 수입니다." />
                 <KpiCard title="전체 성공률" value={`${stats.successRate.toFixed(1)}%`} icon={<CheckCircleIcon className="h-5 w-5"/>} tooltip="검토된 모든 신호 중 '성공'으로 판정된 비율입니다." />
                 <KpiCard title="스윙 성공률" value={`${stats.swingTrade.successRate.toFixed(1)}%`} icon={<BrainIcon className="h-5 w-5"/>} tooltip={`'스윙 전략'으로 분류된 신호 ${stats.swingTrade.count}개의 성공률입니다.`} />
                 <KpiCard title="단타 성공률" value={`${stats.dayTrade.successRate.toFixed(1)}%`} icon={<BrainIcon className="h-5 w-5"/>} tooltip={`'단타 전략'으로 분류된 신호 ${stats.dayTrade.count}개의 성공률입니다.`} />
            </div>
            {stats.last_updated_ts && (
                <p className="text-xs text-gray-500 text-center mt-4">
                    마지막 학습일: {new Date(stats.last_updated_ts).toLocaleString('ko-KR')}
                </p>
            )}
        </div>
    );
};