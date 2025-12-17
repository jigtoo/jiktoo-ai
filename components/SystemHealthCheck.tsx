// components/SystemHealthCheck.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { ShieldCheckIcon, RefreshIcon, ToolboxIcon } from './icons';

type HealthStatus = 'checking' | 'ok' | 'warning' | 'error';

interface SystemHealthCheckProps {
    onOpenDataTester: () => void;
}

export const SystemHealthCheck: React.FC<SystemHealthCheckProps> = ({ onOpenDataTester }) => {
    const [status, setStatus] = useState<HealthStatus>('checking');
    const [message, setMessage] = useState('시스템 상태 확인 중...');

    const runChecks = useCallback(async () => {
        setStatus('checking');
        setMessage('시스템 상태 확인 중...');

        // Check 1: Supabase client initialized
        if (!supabase) {
            setStatus('error');
            setMessage('Supabase 클라이언트 초기화 실패. config.ts 파일을 확인하세요.');
            return;
        }

        // Check 2: Realtime connection
        const channels = supabase.realtime.getChannels();
        const mainChannel = channels.find(c => c.topic.includes('telegram_messages'));
        if (!mainChannel || mainChannel.state !== 'joined') {
             // It might take a moment to connect, so treat it as a warning first
            setStatus('warning');
            setMessage('실시간 연결이 불안정합니다. 잠시 후 재확인됩니다.');
        }

        // Check 3: Canary write/read to a public table
        try {
            const testKey = '_health_check';
            const testPayload = { market: testKey, playbook: { test: Date.now() } };
            
            const { error: upsertError } = await supabase
                .from('alpha_engine_playbooks')
                .upsert(testPayload as any, { onConflict: 'market' });

            if (upsertError) {
                if (upsertError.message.includes('permission denied')) {
                     throw new Error("DB 쓰기 권한이 없습니다. Supabase RLS 정책을 확인하거나 README의 SQL 스크립트를 다시 실행하세요.");
                }
                throw upsertError;
            }

            const { error: selectError } = await supabase
                .from('alpha_engine_playbooks')
                .select('market')
                .eq('market', testKey)
                .single();

            if (selectError) {
                if (selectError.message.includes('permission denied')) {
                     throw new Error("DB 읽기 권한이 없습니다. Supabase RLS 정책을 확인하거나 README의 SQL 스크립트를 다시 실행하세요.");
                }
                throw selectError;
            }
            
            // If all checks pass
            setStatus('ok');
            setMessage('모든 시스템이 정상 작동합니다.');

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : '데이터베이스 접근 테스트 실패';
            setStatus('error');
            setMessage(errorMessage);
        }
    }, []);

    useEffect(() => {
        // Run check on mount and then every 30 seconds
        runChecks();
        const intervalId = setInterval(runChecks, 30000);
        return () => clearInterval(intervalId);
    }, [runChecks]);

    const statusConfig: Record<HealthStatus, { text: string; textColor: string; iconColor: string }> = {
        checking: {
            text: '확인 중...',
            textColor: 'text-yellow-300',
            iconColor: 'text-yellow-400',
        },
        ok: {
            text: '시스템 정상',
            textColor: 'text-green-300',
            iconColor: 'text-green-400',
        },
        warning: {
            text: '연결 경고',
            textColor: 'text-yellow-300',
            iconColor: 'text-yellow-400',
        },
        error: {
            text: '시스템 오류',
            textColor: 'text-red-300',
            iconColor: 'text-red-400',
        },
    };

    const config = statusConfig[status];

    return (
        <div className="relative group flex items-center gap-2 p-2 bg-gray-800/50 rounded-lg">
            <ShieldCheckIcon className={`h-5 w-5 ${config.iconColor} ${status === 'checking' ? 'animate-pulse' : ''}`} />
            <span className={`text-xs font-semibold ${config.textColor}`}>{config.text}</span>
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-72 bg-gray-900 text-white text-xs rounded-lg p-3 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-lg pointer-events-none before:content-[''] before:absolute before:left-1/2 before:bottom-full before:-translate-x-1/2 before:border-4 before:border-transparent before:border-b-gray-900">
                <p className={`font-bold mb-1 ${config.textColor}`}>시스템 상태 진단</p>
                <p>{message}</p>
                <div className="mt-2 pt-2 border-t border-gray-700 flex items-center gap-2">
                    <button 
                        onClick={(e) => { e.stopPropagation(); runChecks(); }}
                        className="flex-1 flex items-center justify-center gap-1 text-cyan-400 hover:underline"
                    >
                        <RefreshIcon className="h-3 w-3" />
                        수동으로 재확인
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onOpenDataTester(); }}
                        className="flex-1 flex items-center justify-center gap-1 text-cyan-400 hover:underline"
                    >
                        <ToolboxIcon className="h-4 w-4" />
                        데이터 연결 테스트
                    </button>
                </div>
            </div>
        </div>
    );
};