// components/MonitoringStatusDisplay.tsx
import React from 'react';
import { RefreshIcon } from './icons';

interface MonitoringStatusDisplayProps {
    isMonitoring: boolean;
    isChecking: boolean;
    countdown: number;
    message: string;
}

export const MonitoringStatusDisplay: React.FC<MonitoringStatusDisplayProps> = ({ isMonitoring, isChecking, countdown, message }) => {
    let statusText: string;
    let statusColor: string;
    let Icon: React.FC<{ className?: string }>;

    if (isChecking) {
        statusText = '신호 스캔 중...';
        statusColor = 'text-cyan-400';
        Icon = () => <RefreshIcon className="h-4 w-4 animate-spin" />;
    } else if (isMonitoring) {
        statusText = `다음 스캔까지 ${countdown}초`;
        statusColor = 'text-green-400';
        Icon = () => (
            <div className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </div>
        );
    } else {
        statusText = message; // e.g., '휴장'
        statusColor = 'text-yellow-400';
        Icon = () => <div className="h-3 w-3 bg-yellow-500 rounded-full"></div>;
    }

    return (
        <div className="relative group p-2 rounded-md text-center text-sm font-semibold flex items-center justify-center gap-2 bg-gray-900/50">
            <Icon />
            <span className={statusColor}>{statusText}</span>
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 bg-gray-900 text-white text-xs rounded-lg p-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-lg pointer-events-none before:content-[''] before:absolute before:left-1/2 before:top-full before:-translate-x-1/2 before:border-4 before:border-transparent before:border-t-gray-900">
                <p className="font-bold text-cyan-300 mb-2">AI 알파 엔진 감시 시스템 (하이브리드)</p>
                <p className="mb-2">AI 엔진은 비용 효율성을 위해 두 단계로 작동합니다:</p>
                <ol className="list-decimal list-inside space-y-1">
                    <li>
                        <strong className="text-gray-200">감시병 (Sentry / 무비용):</strong> 
                        30초마다 로컬 KIS 프록시 서버를 통해 실시간 시세만 조회합니다. AI를 사용하지 않고, 생성된 플레이북의 진입/손절 조건 도달 여부만 빠르게 확인합니다.
                    </li>
                    <li>
                        <strong className="text-gray-200">전략가 (Strategist / 비용 발생):</strong>
                        '알파 엔진 가동' 버튼을 누를 때만 제미나이 AI를 호출하여 전체 관심종목을 분석하고 새로운 플레이북을 생성합니다.
                    </li>
                </ol>
            </div>
        </div>
    );
};