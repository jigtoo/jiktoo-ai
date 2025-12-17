// components/KpiDashboard.tsx
import React from 'react';
import type { KpiSummary, KpiDelta } from '../types';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorDisplay } from './ErrorDisplay';
import { BrainIcon, TrendingUpIcon, TrendingDownIcon, CheckCircleIcon } from './icons';

interface KpiDashboardProps {
    summary: KpiSummary | null;
    deltas: KpiDelta[];
    isLoading: boolean;
    error: string | null;
}

const KpiCard: React.FC<{ title: string; value: string; isPositive?: boolean; isNeutral?: boolean }> = ({ title, value, isPositive, isNeutral }) => {
    const colorClass = isNeutral ? 'text-white' : (isPositive ? 'text-green-400' : 'text-red-400');
    return (
        <div className="bg-gray-900/50 p-3 rounded-lg text-center">
            <p className="text-sm text-gray-400">{title}</p>
            <p className={`text-3xl font-bold font-mono mt-1 ${colorClass}`}>{value}</p>
        </div>
    );
};

const DeltaValue: React.FC<{ value: number | null; unit: string }> = ({ value, unit }) => {
    if (value === null || typeof value === 'undefined') return <span className="text-gray-500">-</span>;
    const isPositive = value > 0;
    const colorClass = value === 0 ? 'text-gray-300' : (isPositive ? 'text-green-400' : 'text-red-400');
    return <span className={`font-mono ${colorClass}`}>{isPositive ? '+' : ''}{value.toFixed(2)}{unit}</span>;
}

export const KpiDashboard: React.FC<KpiDashboardProps> = ({ summary, deltas, isLoading, error }) => {
    
    const renderContent = () => {
        if (isLoading) return <LoadingSpinner message="KPI 성과 데이터를 집계 중..." />;
        if (error) return <ErrorDisplay title="KPI 데이터 로드 실패" message={error} />;
        if (!summary) return <p className="text-center text-gray-500 py-4">성과 데이터가 없습니다.</p>;

        const returnGap = summary.avg_delta_return_gap_7d ?? 0;
        const badFollowRate = summary.avg_delta_bad_follow_rate_7d ?? 0;
        const coverage = summary.avg_delta_coverage ?? 0;

        return (
            <div className="space-y-6">
                {/* KPI Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <KpiCard title="7일 평균 수익률 차이" value={`${returnGap > 0 ? '+' : ''}${returnGap.toFixed(2)}%`} isPositive={returnGap > 0} />
                    <KpiCard title="7일 평균 부정 성과율" value={`${badFollowRate > 0 ? '+' : ''}${badFollowRate.toFixed(2)}%`} isPositive={badFollowRate <= 0} />
                    <KpiCard title="7일 평균 커버리지" value={`${coverage > 0 ? '+' : ''}${coverage.toFixed(2)}%`} isPositive={coverage >= -5} />
                    <KpiCard title="7일 실행 횟수" value={(summary.execution_count ?? 0).toString()} isNeutral />
                </div>

                {/* Recent Deltas Log */}
                <div>
                    <h4 className="font-semibold text-gray-200 mb-2">최근 변경 로그</h4>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2 bg-gray-900/50 p-2 rounded-lg">
                        {deltas.length > 0 ? deltas.map(d => (
                            <div key={d.log_id} className="p-2 bg-gray-800/60 rounded-md grid grid-cols-2 md:grid-cols-4 gap-2 items-center text-xs">
                                <div>
                                    <p className="font-semibold text-white truncate">{d.command_type}</p>
                                    <p className="text-gray-500">{new Date(d.completed_at).toLocaleString('ko-KR')}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-gray-400">수익률 차이</p>
                                    <p><DeltaValue value={d.delta_return_gap_7d} unit="%" /></p>
                                </div>
                                <div className="text-right">
                                    <p className="text-gray-400">부정 성과율</p>
                                    <p><DeltaValue value={d.delta_bad_follow_rate_7d} unit="%" /></p>
                                </div>
                                <div className="text-right">
                                    <p className="text-gray-400">커버리지</p>
                                    <p><DeltaValue value={d.delta_coverage} unit="%" /></p>
                                </div>
                            </div>
                        )) : <p className="text-center text-sm text-gray-500 py-4">최근 변경 기록이 없습니다.</p>}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="my-8">
            <h2 className="text-2xl font-bold text-gray-100 mb-4 text-center flex items-center justify-center gap-3">
                <BrainIcon className="h-8 w-8 text-cyan-400" />
                자율 시스템 성과 리포트 (KPI)
            </h2>
            <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                {renderContent()}
            </div>
        </div>
    );
};
