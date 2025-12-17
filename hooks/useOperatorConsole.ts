// hooks/useOperatorConsole.ts
import { useState, useCallback, useEffect } from 'react';
import type { ExecutionQueueItem, ExecutionLogItem, Json, AIGrowthJournalEntry, MarketTarget } from '../types';
import { supabase } from '../services/supabaseClient';
// import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { generateTuningProposal } from '../services/gemini/evolutionService';


export interface TelegramSubscriber {
    chat_id: string;
    created_at: string;
}

export const useOperatorConsole = () => {
    const [queueItems, setQueueItems] = useState<ExecutionQueueItem[]>([]);
    const [logItems, setLogItems] = useState<ExecutionLogItem[]>([]);
    const [proposals, setProposals] = useState<ExecutionQueueItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isTuningCycleRunning, setIsTuningCycleRunning] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [subscribers, setSubscribers] = useState<TelegramSubscriber[]>([]);
    const [isSubscribersLoading, setIsSubscribersLoading] = useState(false);
    const [isPopulating, setIsPopulating] = useState(false);

    const refreshAll = useCallback(async () => {
        if (!supabase) {
            setError("Supabase is not connected.");
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const [queueRes, logRes] = await Promise.all([
                supabase.from('execution_queue').select('*').order('created_at', { ascending: false }).limit(50),
                supabase.from('execution_log').select('*').order('completed_at', { ascending: false }).limit(50)
            ]);

            if (queueRes.error) throw new Error(`Queue fetch failed: ${queueRes.error.message}`);
            if (logRes.error) throw new Error(`Log fetch failed: ${logRes.error.message}`);
            
            // Defensive filtering to ensure data integrity
            setQueueItems(((queueRes.data || []) as ExecutionQueueItem[]).filter(item => item && item.id));
            setLogItems(((logRes.data || []) as ExecutionLogItem[]).filter(item => item && item.id && item.queue_id));

        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to fetch console data.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    // This effect runs only once to set up subscriptions, preventing infinite loops.
    useEffect(() => {
        refreshAll();

        if (!supabase) return;

        // FIX: Removed RealtimePostgresChangesPayload type which was not found
        const handleQueueChange = (payload: any) => {
            const newRecord = payload.new as ExecutionQueueItem | null;
            const oldRecordId = (payload.old as Partial<ExecutionQueueItem>)?.id;

            // Defensive check for valid record
            if (newRecord && typeof newRecord.id !== 'string') return;

            if (payload.eventType === 'INSERT' && newRecord) {
                setQueueItems(prev => [newRecord, ...prev.filter(i => i && i.id !== newRecord.id)]);
            } else if (payload.eventType === 'UPDATE' && newRecord) {
                setQueueItems(prev => prev.map(item => (item && item.id === newRecord.id ? newRecord : item)).filter(Boolean) as ExecutionQueueItem[]);
            } else if (payload.eventType === 'DELETE' && oldRecordId) {
                setQueueItems(prev => prev.filter(item => item && item.id !== oldRecordId));
            }
        };
        
        // FIX: Removed RealtimePostgresChangesPayload type which was not found
        const handleLogChange = (payload: any) => {
             if (payload.eventType === 'INSERT') {
                const newRecord = payload.new as ExecutionLogItem | null;
                // Defensive check for valid record
                if (newRecord && typeof newRecord.id === 'string' && typeof newRecord.queue_id === 'string') {
                    setLogItems(prev => [newRecord, ...prev.filter(i => i && i.id !== newRecord.id)]);
                }
            }
        };

        const queueChannel = supabase.channel('operator-console-queue')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'execution_queue' }, handleQueueChange)
            .subscribe();

        const logChannel = supabase.channel('operator-console-log')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'execution_log' }, handleLogChange)
            .subscribe();
            
        return () => {
            supabase.removeChannel(queueChannel);
            supabase.removeChannel(logChannel);
        };
    }, [refreshAll]); // Changed to refreshAll

    // This effect derives the proposals whenever the queue changes
    useEffect(() => {
        setProposals(queueItems.filter(item => item && item.status === 'pending_approval'));
    }, [queueItems]);


    const enqueueJob = async (jobPayload: Omit<ExecutionQueueItem, 'id' | 'created_at' | 'attempts'>) => {
        if (!supabase) {
            const err = new Error("Supabase is not connected.");
            setError(err.message);
            throw err;
        }
        setError(null);
        try {
            const payloadWithDefaults = {
                status: 'pending', // default
                attempts: 0,
                ...jobPayload,
            };
            // FIX: Cast payload to `any` to avoid Supabase client type inference issues.
            const { error: insertError } = await supabase.from('execution_queue').insert([payloadWithDefaults] as any);
            if (insertError) throw insertError;
        } catch(e) {
            setError(e instanceof Error ? e.message : 'Failed to enqueue job.');
            throw e; // re-throw to be caught by caller
        }
    };

    const approveProposal = async (proposalId: string) => {
        if (!supabase) return;
        setError(null);
        try {
            // FIX: Cast RPC call to 'any' to resolve 'never' type error.
            const { error: rpcError } = await (supabase.rpc as any)('fn_approve_tuning', { p_proposal_id: proposalId });
            if (rpcError) throw rpcError;
            // The realtime subscription should handle the UI update automatically.
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to approve proposal.');
        }
    };

    const runTuningCycle = async () => {
        if (!supabase) {
            setError("Supabase is not connected.");
            return;
        }
        setIsTuningCycleRunning(true);
        setError(null);
        try {
            // 1. Fetch latest journal entries for context
            const { data: journalData, error: journalError } = await supabase
                .from('growth_journal')
                .select('id, created_at, entry_data')
                .order('created_at', { ascending: false })
                .limit(10);
            
            if (journalError) throw journalError;
            
            // FIX: Cast `journalData` to `any[]` to resolve Supabase type inference issue.
            const journalEntries = ((journalData as any[]) || []).map(entry => ({
                id: entry.id,
                timestamp: entry.created_at,
                ...(entry.entry_data as any)
            })) as AIGrowthJournalEntry[];

            if (journalEntries.length < 3) {
                throw new Error("분석을 위한 학습 데이터(성장 일지)가 최소 3건 이상 필요합니다.");
            }
    
            // 2. Call Gemini to get a tuning proposal
            const proposal = await generateTuningProposal(journalEntries);
    
            // 3. Enqueue the proposal for human approval
            await enqueueJob({
                target_system: 'policy_engine',
                command_type: 'SQL_EXEC',
                command_payload: { 
                    sql: proposal.sql,
                    rationale: proposal.rationale,
                    ddl_safe: false, 
                },
                priority: 10,
                requested_by: 'AI_ADAPTATION_CYCLE',
                status: 'pending_approval'
            });
            
        } catch (e) {
            setError(e instanceof Error ? e.message : 'AI 튜닝 제안 생성에 실패했습니다.');
        } finally {
            setIsTuningCycleRunning(false);
        }
    };
    
    const fetchSubscribers = useCallback(async () => {
        if (!supabase) {
            setError("Supabase is not connected.");
            return;
        }
        setIsSubscribersLoading(true);
        setError(null);
        try {
            const { data, error } = await supabase
                .from('telegram_subscriptions')
                .select('chat_id, created_at')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setSubscribers(data as TelegramSubscriber[]);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to fetch subscribers.');
        } finally {
            setIsSubscribersLoading(false);
        }
    }, []);

    const sendTestNotification = useCallback(async (chatId: string) => {
        if (!supabase) {
            const err = "Supabase is not connected.";
            throw new Error(err);
        }

        const mockSignal = {
            stockName: "JIKTOO 테스트",
            ticker: "TEST001",
            detectedPattern: "운영 콘솔 테스트 패턴",
            patternTimeframe: "Daily",
            aiCommentary: "이것은 운영 콘솔에서 전송된 실제 알림 형식의 테스트 메시지입니다. 모든 시스템이 정상적으로 작동하는지 확인하기 위함입니다.",
            triggerSignal: "> 10,000원",
            invalidationCondition: "< 9,000원",
            keyLevels: { target: "12,000원" }
        };

        try {
            const { data, error } = await supabase.functions.invoke('telegram-service', {
                body: {
                    type: 'notify',
                    signals: [mockSignal],
                    target_chat_id: chatId
                }
            });

            if (error) throw error;
            if (data.error) throw new Error(data.error);

        } catch (e) {
            const msg = e instanceof Error ? e.message : '알 수 없는 오류 발생';
            throw new Error(msg);
        }
    }, []);

    const populateMockQuantData = useCallback(async (marketTarget: MarketTarget) => {
        if (!supabase) {
            const err = new Error("Supabase is not connected.");
            setError(err.message);
            throw err;
        }
        setIsPopulating(true);
        setError(null);
        try {
            // FIX: Cast RPC call to 'any' to resolve 'never' type error.
            const { error: rpcError } = await (supabase.rpc as any)('rpc_populate_mock_quant_data', {
                p_market: marketTarget,
            });
            if (rpcError) {
                 if (rpcError.message.includes('function rpc_populate_mock_quant_data(text) does not exist')) {
                    throw new Error("데이터베이스 설정 오류: 'rpc_populate_mock_quant_data' 함수가 없습니다. README의 SQL 스크립트를 실행하여 데이터베이스를 업데이트하세요.");
                }
                throw rpcError;
            }
        } catch (e) {
            const message = e instanceof Error ? e.message : 'Failed to populate mock quant data.';
            setError(message);
            throw e;
        } finally {
            setIsPopulating(false);
        }
    }, []);

    return {
        queueItems,
        logItems,
        proposals,
        isLoading,
        error,
        isTuningCycleRunning,
        enqueueJob,
        approveProposal,
        refreshAll,
        runTuningCycle,
        subscribers,
        isSubscribersLoading,
        fetchSubscribers,
        sendTestNotification,
        isPopulating,
        populateMockQuantData,
    };
};
