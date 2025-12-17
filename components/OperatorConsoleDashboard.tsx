// components/OperatorConsoleDashboard.tsx
import React, { useState, useEffect } from 'react';
import { useOperatorConsole } from '../hooks/useOperatorConsole';
import type { ExecutionQueueItem, ExecutionLogItem, Json, TelegramSubscriber, MarketTarget } from '../types';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorDisplay } from './ErrorDisplay';
// FIX: Add missing HistoryIcon to imports.
import { ToolboxIcon, RefreshIcon, CheckCircleIcon, XCircleIcon, AlertIcon, BrainIcon, PlayIcon, InfoIcon, TrashIcon, CloseIcon, ChevronRightIcon, HistoryIcon, ShieldCheckIcon } from './icons';
import { supabase } from '../services/supabaseClient';
import { SystemHealthCheck } from './SystemHealthCheck';
import { DataConnectionTester } from './DataConnectionTester';
import { useAIBrainwaveMonitor } from '../hooks/useAIBrainwaveMonitor'; // NEW
import { AIBrainwaveMonitor } from './AIBrainwaveMonitor'; // NEW
import type { useAIEvolution } from '../hooks/useAIEvolution';

import { tokenUsageService, MonthlyUsageStats } from '../services/TokenUsageService';



const TokenUsagePanel: React.FC = () => {
    const [stats, setStats] = useState<MonthlyUsageStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        tokenUsageService.getMonthlyUsage().then(data => {
            setStats(data);
            setLoading(false);
        });
    }, []);

    if (loading) return <LoadingSpinner />;
    if (!stats) return <p className="text-gray-400">데이터를 불러올 수 없습니다.</p>;

    return (
        <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                <p className="text-xs text-gray-400 mb-1">이번 달 예상 비용</p>
                <p className="text-2xl font-bold text-green-400">${stats.totalCost.toFixed(4)}</p>
            </div>
            <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                <p className="text-xs text-gray-400 mb-1">총 요청 횟수</p>
                <p className="text-2xl font-bold text-blue-400">{stats.requestCount.toLocaleString()}회</p>
            </div>
            <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                <p className="text-xs text-gray-400 mb-1">Input Tokens</p>
                <p className="text-lg font-mono text-gray-200">{stats.totalInput.toLocaleString()}</p>
            </div>
            <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                <p className="text-xs text-gray-400 mb-1">Output Tokens</p>
                <p className="text-lg font-mono text-gray-200">{stats.totalOutput.toLocaleString()}</p>
            </div>
        </div>
    );
};



// FIX: Define missing JobStatusBadge component.
const JobStatusBadge: React.FC<{ status: 'pending' | 'running' | 'done' | 'failed' | 'pending_approval' }> = ({ status }) => {
    const config = {
        pending: { text: '대기', color: 'bg-yellow-900/50 text-yellow-300' },
        running: { text: '실행중', color: 'bg-blue-900/50 text-blue-300' },
        done: { text: '완료', color: 'bg-green-900/50 text-green-300' },
        failed: { text: '실패', color: 'bg-red-900/50 text-red-300' },
        pending_approval: { text: '승인대기', color: 'bg-purple-900/50 text-purple-300' },
    };
    const current = config[status] || { text: status, color: 'bg-gray-700 text-gray-300' };
    return <span className={`px-2 py-0.5 text-xs font-semibold rounded-md ${current.color}`}>{current.text}</span>;
};

// FIX: Define missing Toast component.
const Toast: React.FC<{ message: string; onDismiss: () => void; }> = ({ message, onDismiss }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onDismiss();
        }, 3000); // Auto-dismiss after 3 seconds
        return () => clearTimeout(timer);
    }, [onDismiss]);

    return (
        <div className="fixed top-20 right-6 z-50 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg animate-fade-in flex items-center gap-2">
            <CheckCircleIcon className="h-5 w-5" />
            <span>{message}</span>
            <button onClick={onDismiss} className="ml-2 text-green-200 hover:text-white">
                <CloseIcon className="h-4 w-4" />
            </button>
        </div>
    );
};

// FIX: Define missing ConfirmationModal component.
const ConfirmationModal: React.FC<{
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    confirmText?: string;
    cancelText?: string;
}> = ({ title, message, onConfirm, onCancel, confirmText = 'Confirm', cancelText = 'Cancel' }) => (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" onClick={onCancel}>
        <div className="bg-gray-800 border border-red-700 rounded-xl shadow-2xl p-6 w-full max-w-sm m-4 text-center" onClick={e => e.stopPropagation()}>
            <AlertIcon className="h-12 w-12 mx-auto text-yellow-400 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
            <p className="text-sm text-gray-300 mb-6">{message}</p>
            <div className="flex gap-4">
                <button onClick={onCancel} className="w-full px-6 py-2 bg-gray-600 text-white font-bold rounded-lg hover:bg-gray-500">{cancelText}</button>
                <button onClick={onConfirm} className="w-full px-6 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700">{confirmText}</button>
            </div>
        </div>
    </div>
);

const Section: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean }> = ({ title, icon, children, defaultOpen = false }) => (
    <details className="bg-gray-800/50 border border-gray-700 rounded-xl shadow-lg group" open={defaultOpen}>
        <summary className="list-none flex items-center justify-between p-4 cursor-pointer hover:bg-gray-800 transition-colors">
            <div className="flex items-center gap-3">
                {icon}
                <h3 className="text-lg font-bold text-gray-100">{title}</h3>
            </div>
            <ChevronRightIcon className="h-6 w-6 text-gray-400 transition-transform duration-300 group-open:rotate-90" />
        </summary>
        <div className="p-4 border-t border-gray-700 space-y-4">
            {children}
        </div>
    </details>
);

const ActionButton: React.FC<{ onClick: () => void; icon: React.ReactNode; children: React.ReactNode; className?: string; disabled?: boolean; tooltip: string; }> = ({ onClick, icon, children, className = 'bg-gray-600 hover:bg-gray-700', disabled, tooltip }) => (
    <div className="relative group w-full">
        <button onClick={onClick} disabled={disabled} className={`w-full flex items-center justify-center gap-2 px-4 py-2 text-white font-semibold rounded-lg shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}>
            {icon}
            <span>{children}</span>
        </button>
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 bg-gray-900 text-white text-xs rounded-lg p-3 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-lg pointer-events-none before:content-[''] before:absolute before:left-1/2 before:top-full before:-translate-x-1/2 before:border-4 before:border-transparent before:border-t-gray-900">
            {tooltip}
        </div>
    </div>
);

const SystemStatusPanel: React.FC<{
    isLoading: boolean;
    error: string | null;
    queueItems: ExecutionQueueItem[];
}> = ({ isLoading, error, queueItems }) => {
    let status: 'ok' | 'warning' | 'error' | 'loading' = 'ok';
    let message = '모든 시스템이 정상적으로 작동합니다.';

    if (isLoading) {
        status = 'loading';
        message = '시스템 상태를 확인하고 있습니다...';
    } else if (error) {
        status = 'error';
        message = `치명적 오류 발생: ${error}`;
    } else {
        const failedCount = queueItems.filter(i => i.status === 'failed').length;
        const pendingCount = queueItems.filter(i => i.status === 'pending').length;
        if (failedCount > 0) {
            status = 'error';
            message = `실패한 작업 ${failedCount}건이 있습니다. 실행 로그를 확인하세요.`;
        } else if (pendingCount > 5) {
            status = 'warning';
            message = `대기 중인 작업 ${pendingCount}건이 있습니다. 시스템에 부하가 발생했을 수 있습니다.`;
        }
    }

    const config = {
        ok: { color: 'bg-green-500', icon: <CheckCircleIcon /> },
        warning: { color: 'bg-yellow-500', icon: <AlertIcon /> },
        error: { color: 'bg-red-500', icon: <XCircleIcon /> },
        loading: { color: 'bg-blue-500 animate-pulse', icon: <RefreshIcon className="animate-spin" /> },
    };
    const currentConfig = config[status];

    return (
        <div className={`p-4 rounded-lg flex items-center gap-4 border ${currentConfig.color.replace('bg-', 'border-')}/50 ${currentConfig.color.replace('bg-', 'bg-')}/20`}>
            <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-white ${currentConfig.color}`}>
                {currentConfig.icon}
            </div>
            <div>
                <h3 className="text-xl font-bold text-white">시스템 상태: {status.toUpperCase()}</h3>
                <p className={`text-sm ${currentConfig.color.replace('bg-', 'text-')}`}>{message}</p>
            </div>
        </div>
    );
};

const TelegramTestPanel: React.FC<{ consoleState: ReturnType<typeof useOperatorConsole> }> = ({ consoleState }) => {
    const [chatId, setChatId] = useState("");
    const [simpleTestState, setSimpleTestState] = useState<{ loading: boolean; result: { ok: boolean; message: string } | null }>({ loading: false, result: null });
    const [signalTestState, setSignalTestState] = useState<{ loading: boolean; result: { ok: boolean; message: string } | null }>({ loading: false, result: null });

    const handleSimpleTest = async () => {
        if (!chatId.trim()) return;
        setSimpleTestState({ loading: true, result: null });
        try {
            if (!supabase) throw new Error("Supabase client not available.");
            const { data, error } = await supabase.functions.invoke('telegram-service', { body: { type: 'test', chat_id: chatId.trim() } });
            if (error) throw error;
            if (data.error) throw new Error(data.error);
            setSimpleTestState({ loading: false, result: { ok: true, message: '요청 성공! 텔레그램을 확인하세요.' } });
        } catch (e: any) {
            setSimpleTestState({ loading: false, result: { ok: false, message: e.message || '알 수 없는 오류' } });
        }
    };

    const handleSignalTest = async () => {
        if (!chatId.trim()) return;
        setSignalTestState({ loading: true, result: null });
        try {
            await consoleState.sendTestNotification(chatId.trim());
            setSignalTestState({ loading: false, result: { ok: true, message: '요청 성공! 텔레그램을 확인하세요.' } });
        } catch (e: any) {
            setSignalTestState({ loading: false, result: { ok: false, message: e.message || '알 수 없는 오류' } });
        }
    };

    return (
        <div className="space-y-3">
            <p className="text-xs text-gray-400">텔레그램 알림 파이프라인을 단계별로 테스트합니다. 먼저 1번으로 연결을 확인한 후, 2번으로 실제 신호가 정상적으로 수신되는지 확인하세요.</p>
            <input value={chatId} onChange={e => setChatId(e.target.value)} placeholder="테스트할 Chat ID 입력" className="w-full p-2 bg-gray-900 border border-gray-600 rounded-md text-white" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button onClick={handleSimpleTest} disabled={simpleTestState.loading || !chatId} className="w-full px-4 py-2 font-semibold text-white bg-gray-600 rounded-lg hover:bg-gray-700 disabled:opacity-50">
                    {simpleTestState.loading ? "발송 중..." : "1. 단순 연결 테스트"}
                </button>
                <button onClick={handleSignalTest} disabled={signalTestState.loading || !chatId} className="w-full px-4 py-2 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                    {signalTestState.loading ? "발송 중..." : "2. 실제 신호 포맷 테스트"}
                </button>
            </div>
            {simpleTestState.result && <div className={`p-2 text-xs rounded ${simpleTestState.result.ok ? 'bg-green-900/30 text-green-300' : 'bg-red-900/30 text-red-300'}`}>{simpleTestState.result.message}</div>}
            {signalTestState.result && <div className={`p-2 text-xs rounded ${signalTestState.result.ok ? 'bg-green-900/30 text-green-300' : 'bg-red-900/30 text-red-300'}`}>{signalTestState.result.message}</div>}
        </div>
    );
};

const SubscriberListPanel: React.FC<{ consoleState: ReturnType<typeof useOperatorConsole> }> = ({ consoleState }) => {
    const { subscribers, isSubscribersLoading, fetchSubscribers } = consoleState;

    useEffect(() => {
        fetchSubscribers();
    }, [fetchSubscribers]);

    return (
        <div className="space-y-3">
            <button onClick={() => fetchSubscribers()} disabled={isSubscribersLoading} className="w-full px-4 py-2 font-semibold text-white bg-gray-600 rounded-lg hover:bg-gray-700 disabled:opacity-50">
                {isSubscribersLoading ? "목록을 불러오는 중..." : "구독자 목록 새로고침"}
            </button>
            {isSubscribersLoading ? (
                <LoadingSpinner />
            ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2 bg-gray-900/50 p-2 rounded-lg">
                    {subscribers.length > 0 ? subscribers.map(sub => (
                        <div key={sub.chat_id} className="p-2 bg-gray-800/60 rounded-md flex justify-between items-center text-sm">
                            <p className="font-mono text-white">{sub.chat_id}</p>
                            <p className="text-xs text-gray-500">{new Date(sub.created_at).toLocaleString('ko-KR')}</p>
                        </div>
                    )) : (
                        <p className="text-center text-gray-500 py-4">현재 세션에 연결된 구독자가 없습니다.</p>
                    )}
                </div>
            )}
        </div>
    );
};


const LogTable: React.FC<{ items: (ExecutionQueueItem | ExecutionLogItem)[]; type: 'queue' | 'log' }> = ({ items, type }) => {
    if (items.length === 0) {
        return <p className="text-center text-gray-500 py-4">{type === 'queue' ? '대기 중인 작업이 없습니다.' : '실행된 작업이 없습니다.'}</p>;
    }
    return (
        <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-xs text-left text-gray-300">
                <thead className="text-xs text-gray-400 uppercase bg-gray-900/50 sticky top-0">
                    <tr>
                        <th scope="col" className="px-2 py-2">시간</th>
                        <th scope="col" className="px-2 py-2">명령</th>
                        <th scope="col" className="px-2 py-2">상태</th>
                    </tr>
                </thead>
                <tbody>
                    {items.map(item => (
                        <tr key={item.id} className="border-b border-gray-700/50">
                            {/* FIX: Use a more robust way to get the timestamp that works for both ExecutionQueueItem and ExecutionLogItem. */}
                            <td className="px-2 py-2 text-gray-500 whitespace-nowrap">{new Date((item as any).completed_at || (item as any).started_at || (item as any).created_at).toLocaleString()}</td>
                            <td className="px-2 py-2">
                                <p className="font-semibold text-white truncate w-48" title={(item as ExecutionQueueItem).command_type}>{(item as ExecutionQueueItem).command_type}</p>
                            </td>
                            <td className="px-2 py-2"><JobStatusBadge status={item.status as any} /></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

// --- Main Dashboard Component ---

export const OperatorConsoleDashboard: React.FC<{ marketTarget: MarketTarget, aiEvolution: ReturnType<typeof useAIEvolution> }> = ({ marketTarget, aiEvolution }) => {
    const consoleState = useOperatorConsole();
    const brainwaveState = useAIBrainwaveMonitor(); // NEW
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [confirmAction, setConfirmAction] = useState<{ title: string; message: string; onConfirm: () => void; } | null>(null);
    const [isDataTesterOpen, setIsDataTesterOpen] = useState(false);
    const { reviewPastPredictions, isReviewing } = aiEvolution;

    const showToast = (message: string) => {
        setToastMessage(message);
    };

    const handleJob = async (jobPayload: Omit<ExecutionQueueItem, 'id' | 'created_at' | 'status' | 'attempts'>) => {
        try {
            // FIX: The `enqueueJob` function from the `useOperatorConsole` hook expects a 'status' property, which was missing from the jobPayload. Added a default status of 'pending' to satisfy the type requirement.
            await consoleState.enqueueJob({ ...jobPayload, status: 'pending' });
            showToast("작업이 성공적으로 대기열에 추가되었습니다.");
        } catch (e) {
            // Error is already handled by the hook
        }
    };

    const createConfirmation = (title: string, message: string, jobPayload: Omit<ExecutionQueueItem, 'id' | 'created_at' | 'status' | 'attempts'>) => {
        setConfirmAction({
            title,
            message,
            onConfirm: () => {
                handleJob(jobPayload);
                setConfirmAction(null);
            }
        });
    };

    const handleRunTuning = () => {
        consoleState.runTuningCycle()
            .then(() => showToast("AI 튜닝 제안 생성 작업이 시작되었습니다."))
            .catch(() => { }); // error is handled in the hook
    }

    const handlePopulateData = () => {
        consoleState.populateMockQuantData(marketTarget)
            .then(() => showToast("모의 퀀트 데이터 생성이 시작되었습니다."))
            .catch(() => { }); // error is handled in hook
    };

    return (
        <div className="space-y-8 animate-fade-in">
            {toastMessage && <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />}
            {confirmAction && <ConfirmationModal {...confirmAction} onCancel={() => setConfirmAction(null)} confirmText="실행" cancelText="취소" />}
            <DataConnectionTester isOpen={isDataTesterOpen} onClose={() => setIsDataTesterOpen(false)} />

            <header className="text-center">
                <h2 className="text-3xl font-bold text-gray-100 flex items-center justify-center gap-3"><ToolboxIcon className="h-8 w-8" />JIKTOO 운영 콘솔</h2>
                <p className="text-gray-400 mt-2">AI 자율 시스템의 조종석: 상태 확인, 핵심 명령 실행, 그리고 모니터링</p>
            </header>




            <SystemStatusPanel isLoading={consoleState.isLoading} error={consoleState.error} queueItems={consoleState.queueItems} />

            <Section title="AI 비용 및 사용량" icon={<BrainIcon />}>
                <TokenUsagePanel />
            </Section>

            <Section title="AI 브레인웨이브 모니터" icon={<BrainIcon />} defaultOpen>
                <AIBrainwaveMonitor {...brainwaveState} />
            </Section>


            <Section title="시스템 진단 도구" icon={<ShieldCheckIcon />}>
                <ActionButton
                    onClick={() => setIsDataTesterOpen(true)}
                    icon={<ToolboxIcon />}
                    className="bg-blue-600 hover:bg-blue-700"
                    tooltip="외부 API 및 로컬 프록시 서버와의 데이터 연결 상태를 직접 테스트하여 문제를 진단합니다."
                >
                    데이터 연결 테스트 실행
                </ActionButton>
            </Section>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left Column: Actions */}
                <div className="space-y-6">
                    <Section title="핵심 액션 센터" icon={<PlayIcon />} defaultOpen>
                        <ActionButton
                            onClick={() => createConfirmation(
                                "자동 운용 사이클 실행",
                                "AI의 자율 적응 및 학습 사이클을 1회 실행합니다. 계속하시겠습니까?",
                                { target_system: 'db_ops', command_type: 'SQL_EXEC', command_payload: { sql: "select public.fn_run_cycle_and_tune_guarded()" }, priority: 5, requested_by: 'JIKTOO' }
                            )}
                            icon={<BrainIcon />}
                            className="bg-blue-600 hover:bg-blue-700"
                            disabled={consoleState.isLoading || consoleState.isTuningCycleRunning}
                            tooltip="AI의 전체 학습 및 분석 사이클을 시작하는 가장 중요한 명령입니다."
                        >
                            (권장) 자동 운용 사이클 실행
                        </ActionButton>
                        <ActionButton
                            onClick={handleRunTuning}
                            icon={<BrainIcon />}
                            disabled={consoleState.isTuningCycleRunning || consoleState.isLoading}
                            className="bg-purple-600 hover:bg-purple-700"
                            tooltip="AI가 최근 매매 기록(성장 일지)을 분석하여 시스템 규칙 개선안을 스스로 제안하도록 합니다."
                        >
                            AI 자가 학습 및 튜닝
                        </ActionButton>
                        {/* FIX: The onClick handler was passing the function reference directly, but it needs an argument. Wrapped it in an arrow function to pass `marketTarget`. The error message mentioned a different function, but this one matched the error signature. */}
                        <ActionButton
                            onClick={() => reviewPastPredictions(marketTarget)}
                            icon={isReviewing ? <RefreshIcon className="animate-spin h-5 w-5" /> : <BrainIcon className="h-5 w-5" />}
                            disabled={isReviewing || consoleState.isLoading}
                            className="bg-green-600 hover:bg-green-700"
                            tooltip="AI가 과거에 생성했던 예측 신호들의 실제 성과를 추적하고, 그 결과를 '성장 일지'에 기록하여 학습을 시작합니다. 이 작업은 'AI 진화' 탭의 데이터를 업데이트합니다."
                        >
                            {isReviewing ? '학습 중...' : '과거 예측 복기 및 학습'}
                        </ActionButton>

                        {consoleState.proposals.length > 0 && (
                            <div className="pt-4 border-t border-gray-700">
                                <h4 className="font-bold text-purple-300 mb-2">AI 튜닝 제안 ({consoleState.proposals.length}건)</h4>
                                {consoleState.proposals.map(p => (
                                    <div key={p.id} className="p-3 bg-gray-900/50 rounded-lg">
                                        <p className="text-sm text-gray-300">{(p.command_payload as any)?.rationale}</p>
                                        <details className="text-xs mt-2">
                                            <summary className="cursor-pointer text-gray-500">SQL 보기</summary>
                                            <pre className="p-2 mt-1 bg-black rounded text-gray-400 whitespace-pre-wrap"><code>{(p.command_payload as any)?.sql}</code></pre>
                                        </details>
                                        <button onClick={() => consoleState.approveProposal(p.id)} className="mt-2 w-full px-3 py-1 bg-purple-600 text-white text-sm font-bold rounded hover:bg-purple-700">승인</button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Section>

                    <Section title="고급 운영 및 복구" icon={<AlertIcon />}>
                        <h4 className="text-sm font-bold text-gray-400 -mt-2 mb-2">이 기능들은 시스템에 큰 영향을 줄 수 있으므로 주의해서 사용하세요.</h4>
                        <ActionButton
                            onClick={handlePopulateData}
                            icon={consoleState.isPopulating ? <RefreshIcon className="animate-spin" /> : <BrainIcon />}
                            disabled={consoleState.isPopulating || consoleState.isLoading}
                            className="bg-green-600 hover:bg-green-700"
                            tooltip="백엔드에 '알파 코어'가 사용할 오늘의 모의 퀀트 데이터를 생성합니다. 알파 코어 실행 전 반드시 한 번 실행해야 합니다."
                        >
                            {consoleState.isPopulating ? '데이터 생성 중...' : '오늘의 퀀트 데이터 생성'}
                        </ActionButton>
                        <ActionButton
                            onClick={() => createConfirmation(
                                "정책 고정 활성화",
                                "시스템의 자동 학습/튜닝을 중지하고 현재 파라미터를 '고정'합니다. 배포 안정화를 위해 사용됩니다.",
                                { target_system: "db_ops", command_type: "SQL_EXEC", command_payload: { "sql": "select public.fn_policy_freeze_activate('stabilize for release','JIKTOO')" }, priority: 5, requested_by: "JIKTOO" }
                            )}
                            icon={<AlertIcon />}
                            className="bg-yellow-600 hover:bg-yellow-700"
                            tooltip="AI의 자동 파라미터 튜닝을 일시 중지하고 현재 상태를 고정합니다."
                        >
                            정책 고정 활성화
                        </ActionButton>
                        <ActionButton
                            onClick={() => handleJob({ target_system: "db_ops", command_type: "SQL_EXEC", command_payload: { "sql": "select public.fn_policy_freeze_deactivate('resume learning','JIKTOO')" }, priority: 5, requested_by: "JIKTOO" })}
                            icon={<CheckCircleIcon />}
                            tooltip="정책 고정을 해제하고 AI가 다시 학습 및 자동 튜닝을 시작하도록 허용합니다."
                        >
                            정책 고정 해제
                        </ActionButton>
                        <ActionButton
                            onClick={() => createConfirmation(
                                "큐 백로그 정리",
                                "3회 이상 재시도에 실패한 'pending' 상태의 작업을 'failed'로 일괄 전환합니다.",
                                { target_system: 'db_ops', command_type: 'SQL_EXEC', command_payload: { sql: "update public.execution_queue set status='failed' where status='pending' and attempts>=3" }, priority: 5, requested_by: 'JIKTOO' }
                            )}
                            icon={<TrashIcon />}
                            className="bg-red-600 hover:bg-red-700"
                            tooltip="실행에 계속 실패하여 쌓여있는 작업들을 정리합니다."
                        >
                            큐 백로그 정리
                        </ActionButton>
                    </Section>
                </div>

                {/* Right Column: Monitoring */}
                <div className="space-y-6">
                    <Section title="텔레그램 모니터링" icon={<ToolboxIcon />}>
                        <h4 className="font-semibold text-gray-200 mb-2">알림 테스트</h4>
                        <TelegramTestPanel consoleState={consoleState} />
                        <div className="flex items-center gap-2 mt-4 mb-2">
                            <h4 className="font-semibold text-gray-200">구독자 목록</h4>
                            <div className="relative group">
                                <InfoIcon className="h-4 w-4 text-gray-500 cursor-help" />
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 bg-gray-900 text-white text-xs rounded-lg p-3 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-lg pointer-events-none before:content-[''] before:absolute before:left-1/2 before:top-full before:-translate-x-1/2 before:border-4 before:border-transparent before:border-t-gray-900">
                                    <p className="font-bold mb-1 text-cyan-300">익명 사용자 세션 안내</p>
                                    <p>이 목록에는 현재 브라우저 세션에 연결된 구독자 ID만 표시됩니다. 앱을 새로고침하면 새로운 익명 세션이 시작될 수 있으며, 이 경우 이전 구독 ID가 목록에 보이지 않을 수 있습니다. <strong className="text-white">하지만 걱정마세요, 당신의 구독 정보는 서버에 안전하게 저장되어 있으며 알림은 정상적으로 발송됩니다.</strong></p>
                                </div>
                            </div>
                        </div>
                        <SubscriberListPanel consoleState={consoleState} />
                    </Section>
                    <Section title="실행 대기열" icon={<RefreshIcon />}>
                        <LogTable items={consoleState.queueItems} type="queue" />
                    </Section>
                    <Section title="실행 로그" icon={<HistoryIcon />}>
                        <LogTable items={consoleState.logItems} type="log" />
                    </Section>
                </div>
            </div>
        </div>
    );
};