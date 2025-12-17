// hooks/useAIBrainwaveMonitor.ts
import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import type { BrainwaveEvent } from '../types';

// Helper to format different payload types into a consistent BrainwaveEvent
const formatEvent = (type: BrainwaveEvent['type'], payload: any): BrainwaveEvent | null => {
    switch (type) {
        case 'collector':
            return {
                timestamp: payload.created_at,
                type: 'collector',
                message: `새로운 시장 데이터 수집됨`,
                meta: { source: payload.channel, content: (payload.message as string).substring(0, 100) }
            };
        case 'signal':
            return {
                timestamp: payload.detected_at,
                type: 'signal',
                message: `${payload.source} 스캐너가 신호를 포착했습니다.`,
                meta: { ticker: payload.ticker, stockName: payload.stock_name, rationale: payload.rationale }
            };
        case 'adaptation':
             return {
                timestamp: payload.created_at,
                type: 'adaptation',
                message: 'AI 자가 학습 사이클이 완료되었습니다.',
                meta: { summary: payload.summary }
            };
        default:
            return null;
    }
};

export const useAIBrainwaveMonitor = () => {
    const [events, setEvents] = useState<BrainwaveEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const initialSystemEvent: BrainwaveEvent = {
            timestamp: new Date().toISOString(),
            type: 'system',
            message: 'AI 브레인웨이브 모니터가 실시간 이벤트 수신을 시작했습니다.',
            meta: {},
        };

        const fetchAndInitialize = async () => {
            setIsLoading(true);
            setError(null);
            
            if (!supabase) {
                setError("Supabase is not connected.");
                setEvents([initialSystemEvent]);
                setIsLoading(false);
                return;
            }

            try {
                const { data, error: rpcError } = await (supabase.rpc as any)('rpc_get_brainwave_events', { p_limit: 30 });
                if (rpcError) {
                     if (rpcError.message.includes('function rpc_get_brainwave_events(p_limit => integer) does not exist')) {
                        throw new Error("데이터베이스 설정 오류: 'rpc_get_brainwave_events' 함수가 없습니다. README의 SQL 스크립트를 실행하여 데이터베이스를 업데이트하세요.");
                    }
                    throw rpcError;
                }
                setEvents([initialSystemEvent, ...((data as BrainwaveEvent[]) || [])]);
            } catch (e) {
                setError(e instanceof Error ? e.message : 'Failed to fetch initial brainwave events.');
                setEvents([initialSystemEvent]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchAndInitialize();

        if (!supabase) return;

        const handleNewEvent = (type: BrainwaveEvent['type']) => (payload: any) => {
            const formattedEvent = formatEvent(type, payload.new);
            if (formattedEvent) {
                setEvents(prev => [formattedEvent, ...prev.slice(0, 49)]); // Keep max 50 events
            }
        };

        const collectorChannel = supabase.channel('brainwave-collector')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'telegram_messages' }, handleNewEvent('collector'))
            .subscribe();

        const signalChannel = supabase.channel('brainwave-signals')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'realtime_signals' }, handleNewEvent('signal'))
            .subscribe();

        const adaptationChannel = supabase.channel('brainwave-adaptation')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'adaptation_log' }, handleNewEvent('adaptation'))
            .subscribe();

        return () => {
            supabase.removeChannel(collectorChannel);
            supabase.removeChannel(signalChannel);
            supabase.removeChannel(adaptationChannel);
        };
    }, []);

    return {
        events,
        isLoading,
        error,
    };
};