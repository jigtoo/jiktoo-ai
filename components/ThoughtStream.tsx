import React, { useEffect, useState, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorDisplay } from './ErrorDisplay';
import {
    BrainIcon, SearchIcon, ScaleIcon, LightningIcon,
    ChevronRightIcon, ChevronDownIcon
} from './icons';

interface ThoughtLog {
    id: string;
    created_at: string;
    ticker: string | null;
    action: 'SCAN' | 'ANALYSIS' | 'DECISION' | 'EXECUTION';
    confidence: number | null;
    message: string;
    details: any;
    strategy: string | null;
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const ActionIcon: React.FC<{ action: string }> = ({ action }) => {
    switch (action) {
        case 'SCAN': return <SearchIcon className="h-5 w-5 text-blue-400" />;
        case 'ANALYSIS': return <BrainIcon className="h-5 w-5 text-purple-400" />;
        case 'DECISION': return <ScaleIcon className="h-5 w-5 text-yellow-400" />;
        case 'EXECUTION': return <LightningIcon className="h-5 w-5 text-red-500 animate-pulse" />;
        default: return <BrainIcon className="h-5 w-5 text-gray-400" />;
    }
};

const LogItem: React.FC<{ log: ThoughtLog }> = ({ log }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className="border-l-2 border-gray-700 pl-4 pb-6 relative last:pb-0">
            <div className="absolute -left-[9px] top-0 bg-gray-900 rounded-full p-1 border border-gray-700">
                <ActionIcon action={log.action} />
            </div>

            <div className={`bg-gray-800/40 rounded-lg p-3 border border-gray-700/50 hover:border-gray-600 transition-colors ${log.action === 'EXECUTION' ? 'bg-red-900/10 border-red-900/30' : ''}`}>
                <div
                    className="flex justify-between items-start cursor-pointer"
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded ${log.action === 'EXECUTION' ? 'bg-red-900 text-red-200' :
                                log.action === 'DECISION' ? 'bg-yellow-900 text-yellow-200' :
                                    'bg-gray-700 text-gray-300'
                                }`}>
                                {log.action}
                            </span>
                            {log.ticker && <span className="text-xs font-mono text-cyan-300 bg-cyan-900/30 px-1 rounded">{log.ticker}</span>}
                            <span className="text-xs text-gray-500">{new Date(log.created_at).toLocaleTimeString('ko-KR')}</span>
                        </div>
                        <p className="text-sm text-gray-200 font-medium">{log.message}</p>
                    </div>
                    {isExpanded ? <ChevronDownIcon className="h-4 w-4 text-gray-500" /> : <ChevronRightIcon className="h-4 w-4 text-gray-500" />}
                </div>

                {isExpanded && log.details && (
                    <div className="mt-3 p-2 bg-black/30 rounded text-xs font-mono text-gray-400 overflow-x-auto">
                        <pre>{JSON.stringify(log.details, null, 2)}</pre>
                    </div>
                )}
            </div>
        </div>
    );
};

export const ThoughtStream: React.FC = () => {
    const [logs, setLogs] = useState<ThoughtLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    const fetchLogs = async () => {
        setIsLoading(true);
        setError(null);
        try {
            // Timeout promise to prevent infinite loading
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000));

            const fetchPromise = supabase
                .from('ai_thought_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50);

            const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as any;

            if (error) throw error;
            setLogs(data || []);

            // If empty, verify connection by checking a public table or just log
            if (!data || data.length === 0) {
                console.log("[ThoughtStream] No logs found. Inserting check...");
            }

        } catch (err: any) {
            console.error('Failed to fetch thought logs:', err);
            setError(err.message === 'Timeout' ? '연결 시간이 초과되었습니다. 다시 시도해주세요.' : '로그를 불러오는데 실패했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();

        // Realtime Subscription
        const channel = supabase
            .channel('ai_thought_logs_changes')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'ai_thought_logs' },
                (payload) => {
                    const newLog = payload.new as ThoughtLog;
                    setLogs(prev => [newLog, ...prev].slice(0, 50)); // Keep latest 50
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    return (
        <div className="bg-gray-900/50 rounded-xl border border-gray-700 overflow-hidden flex flex-col h-[600px]">
            <div className="p-4 border-b border-gray-700 bg-gray-800/50 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <BrainIcon className="h-5 w-5 text-cyan-400" />
                    <h3 className="text-lg font-bold text-gray-100">AI 실시간 생각 스트림 (Thought Stream)</h3>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={fetchLogs} className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white" title="새로고침">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </button>
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    <span className="text-xs text-green-400">LIVE</span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-0" ref={scrollRef}>
                {isLoading ? (
                    <div className="h-full flex items-center justify-center">
                        <LoadingSpinner message="AI의 뇌파를 연결하는 중..." />
                    </div>
                ) : error ? (
                    <ErrorDisplay title="연결 오류" message={error} onRetry={fetchLogs} />
                ) : logs.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-500">
                        <BrainIcon className="h-12 w-12 mb-2 opacity-20" />
                        <p>아직 기록된 생각이 없습니다.</p>
                        <p className="text-xs mt-1">AI가 시장을 스캔하기 시작하면 여기에 표시됩니다.</p>
                    </div>
                ) : (
                    logs.map(log => <LogItem key={log.id} log={log} />)
                )}
            </div>
        </div>
    );
};
