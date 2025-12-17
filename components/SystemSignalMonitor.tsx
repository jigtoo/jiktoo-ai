// components/SystemSignalMonitor.tsx
import React from 'react';
import type { SystemSignalStatus, SystemSignalLog, CronJobRunDetail } from '../types';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorDisplay } from './ErrorDisplay';
import { DataFeedIcon, CheckCircleIcon, XCircleIcon, AlertIcon, BrainIcon, HistoryIcon, TimerIcon } from './icons';

interface SystemSignalMonitorProps {
    status: SystemSignalStatus | null;
    log: SystemSignalLog[];
    cronJobs: CronJobRunDetail[];
    isLoading: boolean;
    error: string | null;
    onRefresh: () => void;
}

const SignalIcon: React.FC<{ type: string }> = ({ type }) => {
    const eventPrefix = type.split('.')[0];
    switch (eventPrefix) {
        case 'guard':
            return type.includes('blocked')
                ? <XCircleIcon className="h-5 w-5 text-red-400" />
                : <AlertIcon className="h-5 w-5 text-yellow-400" />;
        case 'feedback':
            return <BrainIcon className="h-5 w-5 text-purple-400" />;
        case 'rollback':
            return <HistoryIcon className="h-5 w-5 text-blue-400" />;
        case 'cron':
            return <TimerIcon className="h-5 w-5 text-red-400" />;
        case 'kpi':
            return <AlertIcon className="h-5 w-5 text-yellow-400" />;
        default:
            return <CheckCircleIcon className="h-5 w-5 text-green-400" />;
    }
};

const StatusBadge: React.FC<{ status: SystemSignalLog['delivery_status'] }> = ({ status }) => {
    const config = {
        pending: { text: '대기', color: 'bg-yellow-900/50 text-yellow-300' },
        done: { text: '완료', color: 'bg-green-900/50 text-green-300' },
        error: { text: '실패', color: 'bg-red-900/50 text-red-300' },
    };
    const current = config[status] || { text: status, color: 'bg-gray-700 text-gray-300' };
    return <span className={`px-2 py-0.5 text-xs font-semibold rounded-md ${current.color}`}>{current.text}</span>;
};

export const SystemSignalMonitor: React.FC<SystemSignalMonitorProps> = ({ status, log, cronJobs, isLoading, error, onRefresh }) => {
    
    const renderContent = () => {
        if (isLoading) {
            return <LoadingSpinner message="자율 시스템 상태를 불러오는 중..." />;
        }
        if (error) {
            return <ErrorDisplay title="모니터 로딩 실패" message={error} onRetry={onRefresh} />;
        }
        if (!status) {
            return <p className="text-center text-gray-500 py-4">상태 데이터가 없습니다.</p>;
        }

        return (
            <div className="space-y-6">
                {/* Status Overview */}
                <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="bg-gray-900/50 p-3 rounded-lg">
                        <p className="text-sm text-gray-400">전송 대기</p>
                        <p className={`text-3xl font-bold ${status.pending_signals > 0 ? 'text-yellow-400' : 'text-white'}`}>{status.pending_signals}</p>
                    </div>
                    <div className="bg-gray-900/50 p-3 rounded-lg">
                        <p className="text-sm text-gray-400">24시간 내 실패</p>
                        <p className={`text-3xl font-bold ${status.failed_signals_24h > 0 ? 'text-red-400' : 'text-white'}`}>{status.failed_signals_24h}</p>
                    </div>
                     <div className="bg-gray-900/50 p-3 rounded-lg">
                        <p className="text-sm text-gray-400">마지막 전송</p>
                        <p className="text-lg font-bold text-white">{status.last_sent_at ? new Date(status.last_sent_at).toLocaleTimeString('ko-KR') : 'N/A'}</p>
                    </div>
                </div>

                {/* Signal Log */}
                <div>
                    <h4 className="font-semibold text-gray-200 mb-2">최근 신호 로그</h4>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                        {log.length > 0 ? log.map(l => (
                            <div key={l.id} className="p-2 bg-gray-900/50 rounded-md flex items-start gap-3">
                                <div className="flex-shrink-0 mt-0.5"><SignalIcon type={l.event_type} /></div>
                                <div className="flex-grow">
                                    <div className="flex justify-between items-center">
                                        <p className="font-semibold text-sm text-white">{l.event_type}</p>
                                        <StatusBadge status={l.delivery_status} />
                                    </div>
                                    <p className="text-xs text-gray-400 truncate">{l.payload?.message || l.last_error || 'No message'}</p>
                                </div>
                            </div>
                        )) : <p className="text-center text-sm text-gray-500 py-4">신호 로그가 없습니다.</p>}
                    </div>
                </div>
                
                {/* Cron Jobs */}
                <div>
                    <h4 className="font-semibold text-gray-200 mb-2">최근 자동화 작업 로그</h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                         {cronJobs && cronJobs.length > 0 ? cronJobs.map(j => (
                            <div key={j.runid} className="p-2 bg-gray-900/50 rounded-md flex items-center gap-3">
                                <div className="flex-shrink-0">
                                    {j.status === 'succeeded' ? <CheckCircleIcon className="h-5 w-5 text-green-400" /> : <XCircleIcon className="h-5 w-5 text-red-400" />}
                                </div>
                                <div className="flex-grow">
                                    <p className="font-mono text-xs text-white truncate">{j.command}</p>
                                    <p className="text-xs text-gray-500">{new Date(j.start_time).toLocaleString('ko-KR')}</p>
                                </div>
                            </div>
                         )) : <p className="text-center text-sm text-gray-500 py-4">자동화 작업 로그가 없습니다. (pg_cron 확장 프로그램이 활성화되지 않았을 수 있습니다.)</p>}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="my-8">
             <h2 className="text-2xl font-bold text-gray-100 mb-4 text-center flex items-center justify-center gap-3">
                <DataFeedIcon className="h-8 w-8 text-cyan-400" />
                자율 시스템 모니터 (Telemetry)
            </h2>
            <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                {renderContent()}
            </div>
        </div>
    );
};
