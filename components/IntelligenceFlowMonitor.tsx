import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { supabase } from '../services/supabaseClient';
import { LoadingSpinner } from './LoadingSpinner';
import { NewsIcon, SendIcon, BrainIcon, LightningIcon, ChevronRightIcon } from './icons';

interface TelegramMessage {
    id: string;
    channel: string;
    text: string;
    date: string;
}

interface AIThought {
    id: number;
    created_at: string;
    action: string;
    ticker: string;
    message: string;
    confidence: number;
    strategy: string; // e.g. 'CONTENT_ANALYSIS'
    details: any;
}

export interface IntelligenceFlowMonitorRef {
    refresh: () => Promise<void>;
}

export const IntelligenceFlowMonitor = forwardRef<IntelligenceFlowMonitorRef>((props, ref) => {
    const [telegramMessages, setTelegramMessages] = useState<TelegramMessage[]>([]);
    const [aiThoughts, setAIThoughts] = useState<AIThought[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const fetchData = async () => {
        if (!supabase) {
            setErrorMsg('Supabase Client Not Initialized');
            setIsLoading(false);
            return;
        }

        try {
            setErrorMsg(null);

            // 1. Fetch Input Sources (Telegram & Briefings)
            const { data: messages, error: msgError } = await supabase
                .from('telegram_messages')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(10);

            if (msgError) throw msgError;

            const { data: briefings, error: brfError } = await supabase
                .from('user_intelligence_briefings')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(5);

            if (brfError) console.warn('Briefing error:', brfError);

            // Combine and Sort Inputs
            const combinedMessages: TelegramMessage[] = [
                ...(messages || []).map((m: any) => ({
                    id: m.id?.toString() || Math.random().toString(),
                    channel: m.channel || 'Telegram',
                    text: m.message || m.text || '(No Content)',
                    date: m.created_at || new Date().toISOString()
                })),
                ...(briefings || []).map((b: any) => ({
                    id: b.id?.toString() || Math.random().toString(),
                    channel: 'BRIEFING',
                    text: b.content || '(No Content)',
                    date: b.created_at || new Date().toISOString()
                }))
            ]
                .filter(msg => msg.channel !== 'SYSTEM' && !msg.channel.includes('t.me/SYSTEM')) // Filter out SYSTEM messages
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 15);

            // 2. Fetch ONLY Intelligence-Related Thoughts
            // This ensures the "Intelligence Flow" is distinct from the general "Thought Stream"
            const { data: thoughts, error: thtError } = await supabase
                .from('ai_thought_logs')
                .select('*')
                .or('strategy.eq.CONTENT_ANALYSIS,strategy.eq.NEWS_ANALYSIS,message.ilike.%Intel%')
                .order('created_at', { ascending: false })
                .limit(20);

            if (thtError) console.warn('Thought fetch error:', thtError);

            setTelegramMessages(combinedMessages);
            setAIThoughts(thoughts || []);

        } catch (error: any) {
            console.error('Fetch Error:', error);
            setErrorMsg(error.message || 'Failed to fetch data');
        } finally {
            setIsLoading(false);
        }
    };

    // Expose refresh method to parent
    useImperativeHandle(ref, () => ({
        refresh: async () => {
            await fetchData();
        }
    }));

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 5000); // Polling fallback

        // Real-time subscription
        let channel: any = null;
        if (supabase) {
            channel = supabase.channel('intelligence_flow_monitor')
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'telegram_messages' }, () => fetchData())
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ai_thought_logs' }, () => fetchData())
                .subscribe();
        }

        return () => {
            clearInterval(interval);
            if (channel) supabase?.removeChannel(channel);
        };
    }, []);

    if (isLoading) return <LoadingSpinner message="인텔리전스 연결 중..." />;

    return (
        <div className="bg-gray-900/50 rounded-xl border border-gray-700 p-6 space-y-6">
            <div className="text-center">
                <h2 className="text-2xl font-bold text-white mb-2">⚡ 실시간 인텔리전스 파이프라인 (INPUT → AI)</h2>
                <p className="text-gray-400 text-sm">외부 정보(뉴스/텔레그램)가 AI에 의해 어떻게 해석되는지 보여주는 전용 대시보드입니다.</p>
                {errorMsg && (
                    <div className="mt-2 p-2 bg-red-900/50 border border-red-500 rounded text-red-200 text-sm">
                        ⚠️ 오류: {errorMsg}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left: Input Sources */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-gray-700">
                        <SendIcon className="h-5 w-5 text-sky-400" />
                        <h3 className="text-lg font-bold text-white">📡 수집된 정보 ({telegramMessages.length})</h3>
                    </div>

                    {telegramMessages.length === 0 ? (
                        <div className="text-center py-12 bg-gray-800/30 rounded-lg text-gray-500 border border-gray-700 border-dashed">
                            <p>수집된 메시지가 없습니다</p>
                        </div>
                    ) : (
                        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                            {telegramMessages.map((msg) => (
                                <div key={msg.id} className="bg-gray-800/80 p-4 rounded-lg border border-gray-700 hover:border-sky-500/30 transition-colors group relative">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-xs font-bold px-2 py-0.5 bg-sky-900/50 text-sky-200 rounded border border-sky-800">
                                            {msg.channel}
                                        </span>
                                        <span className="text-xs text-gray-500 ml-auto font-mono">
                                            {new Date(msg.date).toLocaleTimeString('ko-KR')}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap break-words">
                                        {msg.text.length > 200 ? msg.text.substring(0, 200) + '...' : msg.text}
                                    </p>
                                    <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className="h-2 w-2 rounded-full bg-sky-500 animate-pulse"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Right: AI Analysis (Strict Filter) */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-gray-700">
                        <BrainIcon className="h-5 w-5 text-indigo-400" />
                        <h3 className="text-lg font-bold text-white">🧠 AI 독해 및 해석 결과</h3>
                    </div>

                    {aiThoughts.length === 0 ? (
                        <div className="text-center py-12 bg-gray-800/30 rounded-lg text-gray-500 border border-gray-700 border-dashed">
                            <BrainIcon className="h-12 w-12 text-gray-700 mx-auto mb-3" />
                            <p className="text-lg font-semibold text-gray-400">분석 대기 중...</p>
                            <p className="text-sm mt-1 mb-4">새로운 뉴스가 도착하면 AI가 이곳에 해석 결과를 출력합니다.</p>
                            <div className="text-xs bg-black/20 p-2 rounded inline-block">
                                필터 적용됨: strategy='CONTENT_ANALYSIS'
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                            {aiThoughts.map((thought) => {
                                // Double check filter logic for display
                                const isIntel = thought.strategy === 'CONTENT_ANALYSIS' || thought.strategy === 'NEWS_ANALYSIS' || thought.message.includes('[Intel]');

                                return (
                                    <div key={thought.id} className="bg-indigo-900/20 p-4 rounded-lg border border-indigo-500/30 relative">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-xs font-bold px-2 py-0.5 bg-indigo-600 text-white rounded shadow-sm">
                                                {isIntel ? 'AI 해석' : thought.action}
                                            </span>
                                            {thought.confidence > 0 && (
                                                <span className="text-xs text-indigo-300 font-medium">신뢰도 {thought.confidence}%</span>
                                            )}
                                            <span className="text-xs text-gray-500 ml-auto font-mono">
                                                {new Date(thought.created_at).toLocaleTimeString('ko-KR')}
                                            </span>
                                        </div>

                                        <p className="text-sm text-indigo-100 leading-relaxed font-medium">
                                            {thought.message}
                                        </p>

                                        {thought.details && (
                                            <div className="mt-3 pt-3 border-t border-indigo-500/20 text-xs space-y-1">
                                                {thought.details.source_title && (
                                                    <div className="flex gap-2">
                                                        <span className="text-indigo-400 opacity-70">출처:</span>
                                                        <span className="text-gray-300 truncate">{thought.details.source_title}</span>
                                                    </div>
                                                )}
                                                {thought.details.analysis_result && (
                                                    <div className="flex gap-2 mt-1">
                                                        <span className="text-indigo-400 opacity-70">판단:</span>
                                                        <span className={`font-bold ${thought.details.analysis_result.sentiment === 'BULLISH' ? 'text-red-400' :
                                                            thought.details.analysis_result.sentiment === 'BEARISH' ? 'text-blue-400' :
                                                                'text-gray-300'
                                                            }`}>
                                                            {thought.details.analysis_result.sentiment}
                                                        </span>
                                                        <span className="text-gray-500">|</span>
                                                        <span className="text-indigo-400 opacity-70">긴급도:</span>
                                                        <span className="text-gray-300">{thought.details.analysis_result.urgency}</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Flow Indicator */}
            <div className="bg-gradient-to-r from-sky-900/30 to-indigo-900/30 p-4 rounded-lg border border-sky-700/50 mt-4">
                <div className="flex items-center justify-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                        <SendIcon className="h-4 w-4 text-sky-400" />
                        <span className="text-white font-semibold">정보 수집 (Input)</span>
                    </div>
                    <ChevronRightIcon className="h-4 w-4 text-gray-500" />
                    <div className="flex items-center gap-2">
                        <BrainIcon className="h-4 w-4 text-indigo-400" />
                        <span className="text-white font-semibold">AI 독해 (Reading)</span>
                    </div>
                    <ChevronRightIcon className="h-4 w-4 text-gray-500" />
                    <div className="flex items-center gap-2">
                        <LightningIcon className="h-4 w-4 text-yellow-400" />
                        <span className="text-white font-semibold">제어/매매 (Action)</span>
                    </div>
                </div>
            </div>

            <div className="text-center text-xs text-gray-500">
                <div className="mt-2 p-2 bg-black/20 rounded inline-flex gap-4 font-mono">
                    <span>Supabase: {supabase ? 'OK' : 'ERR'}</span>
                    <span>Raw Msg: {telegramMessages.length}</span>
                    <span>AI Reads: {aiThoughts.length}</span>
                </div>
            </div>
        </div>
    );
});

IntelligenceFlowMonitor.displayName = 'IntelligenceFlowMonitor';
