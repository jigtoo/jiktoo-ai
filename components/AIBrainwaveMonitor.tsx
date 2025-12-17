// components/AIBrainwaveMonitor.tsx
import React from 'react';
// FIX: The type `BrainwaveEvent` is exported from `../types` not from the hook.
import type { BrainwaveEvent } from '../types';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorDisplay } from './ErrorDisplay';
import { DataFeedIcon, RadarIcon, ClosingBellIcon, CrosshairIcon, FireIcon, HandshakeIcon, SparklesIcon, BrainIcon, CheckCircleIcon } from './icons';

interface AIBrainwaveMonitorProps {
    events: BrainwaveEvent[];
    isLoading: boolean;
    error: string | null;
}

const getSignalIcon = (source: string) => {
    switch (source) {
        case 'material': return <RadarIcon className="h-5 w-5 text-purple-400" />;
        case 'bfl': return <ClosingBellIcon className="h-5 w-5 text-orange-400" />;
        case 'pattern': return <CrosshairIcon className="h-5 w-5 text-teal-400" />;
        case 'coin': return <FireIcon className="h-5 w-5 text-yellow-400" />;
        case 'user': return <HandshakeIcon className="h-5 w-5 text-blue-400" />;
        default: return <DataFeedIcon className="h-5 w-5 text-gray-400" />;
    }
};

const getEventConfig = (event: BrainwaveEvent) => {
    switch (event.type) {
        case 'system':
            return {
                icon: <CheckCircleIcon className="h-6 w-6 text-green-400" />,
                title: event.message,
                details: `실시간 연결이 활성화되었습니다.`,
                color: 'border-green-700'
            };
        case 'collector':
            return {
                icon: <DataFeedIcon className="h-6 w-6 text-gray-400" />,
                title: event.message,
                details: `출처: ${event.meta.source || 'Unknown'}`,
                color: 'border-gray-700'
            };
        case 'signal':
            const isResonance = (event.meta.sources as string[])?.length > 1;
            if (isResonance) {
                 return {
                    icon: <SparklesIcon className="h-6 w-6 text-yellow-400 animate-pulse" />,
                    title: `공명 발생: ${event.meta.stockName}`,
                    details: `신호: ${(event.meta.sources as string[]).join(', ')}`,
                    color: 'border-yellow-500'
                };
            }
            return {
                icon: getSignalIcon(event.meta.source as string),
                title: event.message,
                details: event.meta.stockName ? `종목: ${event.meta.stockName} (${event.meta.ticker})` : `종목: ${event.meta.ticker}`,
                color: 'border-blue-700'
            };
         case 'adaptation':
             return {
                icon: <BrainIcon className="h-6 w-6 text-green-400" />,
                title: event.message,
                details: `결과: ${event.meta.summary?.result_summary || '요약 없음'}`,
                color: 'border-green-700'
            };
        default:
            return {
                icon: <DataFeedIcon className="h-6 w-6 text-gray-500" />,
                title: '알 수 없는 이벤트',
                details: '',
                color: 'border-gray-800'
            };
    }
};


const BrainwaveEventCard: React.FC<{ event: BrainwaveEvent }> = ({ event }) => {
    const config = getEventConfig(event);
    
    // Simple relative time formatter
    const formatTime = (isoString: string) => {
        const seconds = Math.floor((new Date().getTime() - new Date(isoString).getTime()) / 1000);
        if (seconds < 60) return `${seconds}초 전`;
        const minutes = Math.floor(seconds / 60);
        return `${minutes}분 전`;
    };

    return (
        <div className={`p-3 bg-gray-900/50 rounded-lg flex items-start gap-3 border-l-4 ${config.color} animate-fade-in`}>
            <div className="flex-shrink-0 mt-1">{config.icon}</div>
            <div className="flex-grow">
                <div className="flex justify-between items-center">
                    <p className="font-semibold text-gray-200 text-sm">{config.title}</p>
                    <p className="text-xs text-gray-500 flex-shrink-0">{formatTime(event.timestamp)}</p>
                </div>
                <p className="text-xs text-gray-400 truncate">{config.details}</p>
            </div>
        </div>
    );
}

export const AIBrainwaveMonitor: React.FC<AIBrainwaveMonitorProps> = ({ events, isLoading, error }) => {
    
    const renderContent = () => {
        if (isLoading) {
            return <LoadingSpinner message="AI 두뇌 활동을 동기화하는 중..." />;
        }
        if (error) {
            return <ErrorDisplay title="모니터 로딩 실패" message={error} />;
        }
        if (events.length === 0) {
            return <p className="text-center text-gray-500 py-4">실시간 활동 기록이 없습니다. AI가 활동을 시작하면 여기에 표시됩니다.</p>;
        }
        return (
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                {events.map((event, index) => (
                    <BrainwaveEventCard key={`${event.timestamp}-${index}`} event={event} />
                ))}
            </div>
        );
    };

    return (
        <div className="p-4 bg-gray-900/40 rounded-lg border border-gray-700/50">
            {renderContent()}
        </div>
    );
};