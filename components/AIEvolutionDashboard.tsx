// components/AIEvolutionDashboard.tsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAIEvolution } from '../hooks/useAIEvolution';
import { useAIBriefing } from '../hooks/useAIBriefing';
import type { AIEvolutionEvent, CollectorHealthStatus, MarketTarget, EnrichedLearningReport, TelegramLearningReport, AILearningReport, PerformanceStats, ProxyStatus, WeeklyDeformationRow, UserIntelligenceBriefing } from '../types';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorDisplay } from './ErrorDisplay';
import {
    AIEvolutionIcon, CalendarIcon, InfoIcon, RefreshIcon, ToolboxIcon, BrainIcon, LightbulbIcon, CheckCircleIcon,
    CpuChipIcon, AdjustmentIcon, ChecklistIcon, HandshakeIcon, SendIcon, DataFeedIcon, ScaleIcon, NewsIcon, FlowIcon, ChevronRightIcon
} from './icons';
import { AIGrowthJournal } from './AIGrowthJournal';
import { SUPABASE_URL, SUPABASE_ANON_KEY, IS_SUPABASE_ENABLED } from '../config';
import { SystemSignalMonitor } from './SystemSignalMonitor';
import { KpiDashboard } from './KpiDashboard';
import { PerformanceStatsDashboard } from './PerformanceStatsDashboard';
import { ThoughtStream } from './ThoughtStream';
import { IntelligenceFlowMonitor, type IntelligenceFlowMonitorRef } from './IntelligenceFlowMonitor';
import { evolutionScheduler } from '../services/EvolutionScheduler';

const EvolutionControlPanel: React.FC = () => {
    const [isRunning, setIsRunning] = useState(false);
    const [lastRunTime, setLastRunTime] = useState<string | null>(null);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);

    const handleManualTrigger = async () => {
        setIsRunning(true);
        setStatusMessage("수학적 진단 모델 가동 중... (비용 0원)");

        // Wrap in setTimeout to allow UI update
        setTimeout(async () => {
            try {
                const resultMsg = await evolutionScheduler.startDailyRoutine();
                setLastRunTime(new Date().toLocaleString('ko-KR'));
                setStatusMessage(resultMsg); // Show actual result
            } catch (e) {
                setStatusMessage("오류 발생: 스케줄러 실행 실패");
            } finally {
                setIsRunning(false);
                setTimeout(() => setStatusMessage(null), 5000);
            }
        }, 100);
    };

    return (
        <div className="bg-gray-800/50 p-6 rounded-xl border border-purple-500/30 mb-8 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-purple-500"></div>
            <div className="flex justify-between items-start flex-wrap gap-4">
                <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <CpuChipIcon className="h-6 w-6 text-purple-400" />
                        자동 진화 스케줄러 (Darwin Engine)
                    </h3>
                    <p className="text-sm text-gray-400 mt-1">
                        매일 밤 300번의 시뮬레이션을 통해 전략의 건전성을 확인하고, 필요 시에만 AI가 개입하여 진화합니다.
                    </p>
                    <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                        <span>상태: <span className="text-green-400 font-bold">대기 중 (Auto-Run)</span></span>
                        {lastRunTime && <span>마지막 진단: {lastRunTime}</span>}
                    </div>
                </div>
                <button
                    onClick={handleManualTrigger}
                    disabled={isRunning}
                    className={`px-5 py-2.5 rounded-lg font-bold text-sm shadow-lg transition-all flex items-center gap-2
                    ${isRunning ? 'bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-500 text-white hover:shadow-purple-500/20'}
                    `}
                >
                    {isRunning ? <LoadingSpinner /> : <RefreshIcon className="h-4 w-4" />}
                    {isRunning ? '진단 수행 중...' : '⚔️ 즉시 진단 실행'}
                </button>
            </div>

            {statusMessage && (
                <div className="mt-4 p-3 bg-purple-900/20 border border-purple-500/30 rounded-lg text-sm text-purple-200 animate-fade-in flex items-center gap-2">
                    <InfoIcon className="h-4 w-4" />
                    {statusMessage}
                </div>
            )}
        </div>
    );
};


const ManualLearningForm: React.FC<{
    onSubmit: (data: { title: string; content: string; related_tickers: string | null; source_url: string | null; }) => Promise<{ success: boolean; error: string | null; }>;
}> = ({ onSubmit }) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [tickers, setTickers] = useState('');
    const [sourceUrl, setSourceUrl] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [submitSuccess, setSubmitSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !content.trim()) {
            setFormError('제목과 내용은 필수입니다.');
            return;
        }
        setIsSubmitting(true);
        setFormError(null);
        setSubmitSuccess(false);

        const { success, error } = await onSubmit({
            title: title.trim(),
            content: content.trim(),
            related_tickers: tickers.trim() || null,
            source_url: sourceUrl.trim() || null,
        });

        if (success) {
            setTitle('');
            setContent('');
            setTickers('');
            setSourceUrl('');
            setSubmitSuccess(true);
            setTimeout(() => setSubmitSuccess(false), 3000);
        } else {
            setFormError(error);
        }
        setIsSubmitting(false);
    };

    const inputStyle = "w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 text-white";

    return (
        <form onSubmit={handleSubmit} className="p-4 bg-gray-800/50 rounded-lg space-y-4 border border-gray-700">
            <h3 className="text-xl font-bold text-center text-white">AI 수동 학습 (인텔리전스 브리핑)</h3>
            <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-400 mb-1">제목 (필수)</label>
                <input id="title" type="text" value={title} onChange={e => setTitle(e.target.value)} className={inputStyle} placeholder="핵심 내용을 한 줄로 요약" required />
            </div>
            <div>
                <label htmlFor="content" className="block text-sm font-medium text-gray-400 mb-1">내용 (필수)</label>
                <textarea id="content" value={content} onChange={e => setContent(e.target.value)} className={inputStyle} rows={4} placeholder="AI에게 전달할 구체적인 정보나 분석 내용을 입력하세요." required></textarea>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="tickers" className="block text-sm font-medium text-gray-400 mb-1">관련 종목 티커 (선택)</label>
                    <input id="tickers" type="text" value={tickers} onChange={e => setTickers(e.target.value)} className={inputStyle} placeholder="예: AAPL, 005930.KS" />
                </div>
                <div>
                    <label htmlFor="sourceUrl" className="block text-sm font-medium text-gray-400 mb-1">출처 URL (선택)</label>
                    <input id="sourceUrl" type="url" value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} className={inputStyle} placeholder="https://example.com/news/..." />
                </div>
            </div>
            {formError && <ErrorDisplay title="브리핑 제출 오류" message={formError} onClose={() => setFormError(null)} />}
            <div className="flex justify-end">
                <button
                    type="submit"
                    disabled={isSubmitting || submitSuccess}
                    className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold rounded-lg hover:from-cyan-600 hover:to-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                    {isSubmitting ? <><LoadingSpinner /> 제출 중...</> : (submitSuccess ? <><CheckCircleIcon className="h-5 w-5" /> 제출 완료!</> : 'AI에게 브리핑 제출')}
                </button>
            </div>
        </form>
    );
};

const BriefingCard: React.FC<{ briefing: UserIntelligenceBriefing }> = ({ briefing }) => {
    return (
        <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
            <div className="flex justify-between items-start flex-wrap gap-2 mb-2">
                <h4 className="text-lg font-bold text-cyan-300">{briefing.title}</h4>
            </div>
            <p className="text-sm text-gray-300 whitespace-pre-wrap mb-3">{briefing.content}</p>
            <div className="flex justify-between items-end text-xs text-gray-500 border-t border-gray-700 pt-2">
                <div>
                    {briefing.related_tickers && <p><strong>관련 티커:</strong> {briefing.related_tickers}</p>}
                    {briefing.source_url && <p><strong>출처:</strong> <a href={briefing.source_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">링크 보기</a></p>}
                </div>
                <span>{new Date(briefing.created_at).toLocaleString('ko-KR')}</span>
            </div>
        </div>
    );
};


const CollectorStatusLamp: React.FC<{
    health: CollectorHealthStatus | null;
    isLoading: boolean;
    error: string | null;
}> = ({ health, isLoading, error }) => {
    let statusConfig: { color: string; text: string; subtext: string; tooltip: string };

    if (isLoading) {
        statusConfig = { color: 'bg-yellow-500 animate-pulse', text: '상태 확인 중...', subtext: '잠시만 기다려주세요...', tooltip: '백엔드 데이터 수집기의 상태를 확인하고 있습니다.' };
    } else if (error) {
        statusConfig = { color: 'bg-red-500', text: '오류', subtext: '백엔드 데이터 수집기 오류.', tooltip: `오류: ${error}. 백엔드 데이터 수집 프로세스(예: Supabase Edge Function)가 중단되었을 수 있습니다. Supabase 대시보드에서 로그를 확인하세요.` };
    } else if (!health || health.minutes_since_last === null || typeof health.minutes_since_last === 'undefined') {
        statusConfig = { color: 'bg-gray-500', text: '알 수 없음', subtext: '수집된 데이터 없음.', tooltip: '아직 수집된 데이터가 없습니다. Collector가 처음 실행될 때까지 기다려주세요.' };
    } else {
        const minutes = Number(health.minutes_since_last);
        const lastIngested = new Date(health.last_ingested_at).toLocaleString('ko-KR');
        if (minutes <= 5) {
            statusConfig = { color: 'bg-green-500', text: '정상', subtext: `마지막 수집: ${minutes.toFixed(1)}분 전`, tooltip: `마지막 수집 시간: ${lastIngested}` };
        } else if (minutes <= 30) {
            statusConfig = { color: 'bg-yellow-500', text: '지연', subtext: `마지막 수집: ${minutes.toFixed(1)}분 전`, tooltip: `데이터 수집이 지연되고 있습니다. 마지막 수집 시간: ${lastIngested}` };
        } else {
            statusConfig = { color: 'bg-red-500', text: '멈춤', subtext: `마지막 수집: ${minutes.toFixed(1)}분 전`, tooltip: `데이터 수집이 30분 이상 중단되었습니다. 마지막 수집 시간: ${lastIngested}. 백엔드 Collector 로그를 확인하세요.` };
        }
    }

    return (
        <div className="relative group flex items-center gap-3 p-2 bg-gray-900/50 rounded-lg flex-shrink-0 w-full">
            <div className="relative flex h-4 w-4">
                {statusConfig.color.includes('green') && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>}
                <span className={`relative inline-flex rounded-full h-4 w-4 ${statusConfig.color}`}></span>
            </div>
            <div>
                <p className="text-sm font-bold text-white">Collector 상태: {statusConfig.text}</p>
                <p className="text-xs text-gray-400">{statusConfig.subtext}</p>
            </div>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 bg-gray-900 text-white text-xs rounded-lg p-3 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-lg pointer-events-none before:content-[''] before:absolute before:left-1/2 before:top-full before:-translate-x-1/2 before:border-4 before:border-transparent before:border-t-gray-900">
                {statusConfig.tooltip}
            </div>
        </div>
    );
};

const EventIcon: React.FC<{ type: string }> = ({ type }) => {
    switch (type) {
        case '모델 학습': return <CpuChipIcon className="h-6 w-6 text-green-400" />;
        case '규칙 변경': return <AdjustmentIcon className="h-6 w-6 text-yellow-400" />;
        case '알림 평가': return <ChecklistIcon className="h-6 w-6 text-blue-400" />;
        case '피드백 반영': return <HandshakeIcon className="h-6 w-6 text-purple-400" />;
        case '판단 근거 기록 (XAI)': return <LightbulbIcon className="h-6 w-6 text-orange-400" />;
        case '텔레그램 메시지': return <SendIcon className="h-6 w-6 text-sky-400" />;
        case '인텔리전스 브리핑': return <DataFeedIcon className="h-6 w-6 text-indigo-400" />;
        default: return <InfoIcon className="h-6 w-6 text-gray-400" />;
    }
};

const TimelineEventCard: React.FC<{ event: AIEvolutionEvent; isLast: boolean }> = ({ event, isLast }) => (
    <div className="flex gap-4">
        <div className="flex flex-col items-center">
            <div className="flex-shrink-0 p-2 bg-gray-700/50 rounded-full z-10">
                <EventIcon type={event.event_type} />
            </div>
            {!isLast && <div className="w-0.5 flex-grow bg-gray-700"></div>}
        </div>
        <div className="flex-1 pb-8">
            <div className="p-4 bg-gray-800/60 rounded-lg border border-gray-700 -mt-2">
                <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
                    <p className="font-bold text-gray-200">{event.event_type}</p>
                    <p className="text-xs text-gray-500">{new Date(event.created_at).toLocaleString('ko-KR')}</p>
                </div>
                <p className="text-sm text-gray-300 whitespace-pre-wrap">{event.content}</p>
            </div>
        </div>
    </div>
);

const EvolutionTimeline: React.FC<{ events: AIEvolutionEvent[], isLoading: boolean, error: string | null, onRefresh: () => void }> = ({ events, isLoading, error, onRefresh }) => {
    // Filter out '인텔리전스 브리핑' events as per user request to avoid duplication with Briefing Feed
    const filteredEvents = events.filter(e => e.event_type !== '인텔리전스 브리핑');

    const renderTimelineContent = () => {
        if (isLoading && filteredEvents.length === 0) {
            return <div className="py-10"><LoadingSpinner message="AI 진화 기록을 불러오는 중..." /></div>;
        }
        if (error) {
            return <ErrorDisplay title="타임라인 로드 실패" message={error} onRetry={onRefresh} />;
        }
        if (filteredEvents.length === 0) {
            return (
                <div className="text-center text-gray-500 py-10">
                    <InfoIcon className="h-10 w-10 mx-auto mb-3" />
                    <p>표시할 진화 기록이 없습니다.</p>
                </div>
            );
        }
        return (
            <div className="space-y-0">
                {filteredEvents.map((event, index) => (
                    <TimelineEventCard key={`${event.created_at}-${index}`} event={event} isLast={index === filteredEvents.length - 1} />
                ))}
            </div>
        );
    };

    return renderTimelineContent();
};

const DataSourceStatus: React.FC<{
    collectorHealth: CollectorHealthStatus | null;
    proxyStatus: ProxyStatus;
}> = ({ collectorHealth, proxyStatus }) => {

    const telegram = useMemo(() => {
        if (!collectorHealth || collectorHealth.minutes_since_last === null) return { text: '데이터 없음', color: 'gray' as const };
        if (collectorHealth.minutes_since_last <= 5) return { text: '실시간 수집 중', color: 'green' as const };
        if (collectorHealth.minutes_since_last <= 30) return { text: '지연', color: 'yellow' as const };
        return { text: '중단', color: 'red' as const };
    }, [collectorHealth]);

    const kis = useMemo(() => {
        switch (proxyStatus) {
            case 'connected': return { text: '실시간 연결됨', color: 'green' as const };
            case 'connecting': return { text: '연결 중...', color: 'yellow' as const };
            case 'error': return { text: '연결 실패', color: 'red' as const };
            default: return { text: '비활성화', color: 'gray' as const };
        }
    }, [proxyStatus]);

    const news = { text: '활성', color: 'green' as const }; // Always active

    const StatusDot: React.FC<{ color: 'green' | 'yellow' | 'red' | 'gray' }> = ({ color }) => {
        const colorClasses = {
            green: 'bg-green-500',
            yellow: 'bg-yellow-500',
            red: 'bg-red-500',
            gray: 'bg-gray-500',
        };
        return <span className={`w-3 h-3 rounded-full ${colorClasses[color]}`}></span>;
    };

    const StatusCard: React.FC<{ icon: React.ReactNode, title: string, description: string, status: { text: string; color: 'green' | 'yellow' | 'red' | 'gray' } }> = ({ icon, title, description, status }) => (
        <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700/50 flex flex-col h-full">
            <div className="flex items-center gap-3 mb-2">
                {icon}
                <h4 className="text-lg font-bold text-white">{title}</h4>
            </div>
            <p className="text-sm text-gray-400 flex-grow">{description}</p>
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-700">
                <StatusDot color={status.color} />
                <span className="text-sm font-semibold text-white">{status.text}</span>
            </div>
        </div>
    );

    return (
        <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-100 mb-4 text-center">AI 실시간 데이터 소스</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatusCard
                    icon={<SendIcon className="h-6 w-6 text-sky-400" />}
                    title="텔레그램 정보"
                    description="시장 심리, 최신 테마, 루머 등 비정형 데이터를 실시간으로 수집합니다."
                    status={telegram}
                />
                <StatusCard
                    icon={<NewsIcon className="h-6 w-6 text-blue-400" />}
                    title="뉴스 API"
                    description="Google, Naver 등 다중 소스를 통해 실시간 뉴스 및 공시 정보를 수집합니다."
                    status={news}
                />
                <StatusCard
                    icon={<FlowIcon className="h-6 w-6 text-teal-400" />}
                    title="KIS API (수급/시세)"
                    description="기관/외국인 수급, 세력 매집 추적, 실시간 시세 등 정형 데이터를 확보합니다."
                    status={kis}
                />
            </div>
        </div>
    );
};

const WeeklyDeformationSummary: React.FC<{ data: WeeklyDeformationRow[]; isLoading: boolean; error: string | null }> = ({ data, isLoading, error }) => {
    const summary = useMemo(() => {
        if (!data || data.length === 0) return { total: 0, breakdown: '' };
        const latestWeekStart = data[0].week_start;
        const lastWeekData = data.filter(d => d.week_start === latestWeekStart);
        const total = lastWeekData.reduce((sum, item) => sum + item.event_count, 0);
        const breakdown = lastWeekData.map(d => `${d.event_tag}: ${d.event_count}`).join(', ');
        return { total, breakdown, week: new Date(latestWeekStart).toLocaleDateString() };
    }, [data]);

    return (
        <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
            <h3 className="text-xl font-bold text-center text-white mb-3">주간 시스템 변형 요약</h3>
            {isLoading ? <div className="min-h-[108px] flex items-center justify-center"><LoadingSpinner /></div> :
                error ? <div className="min-h-[108px] flex items-center justify-center"><ErrorDisplay title="로드 실패" message={error} /></div> : (
                    <div className="text-center">
                        <p className="text-sm text-gray-400">지난 주 발생한 총 변형(DDL) 수</p>
                        <p className="text-5xl font-bold text-cyan-300 my-2">{summary.total}</p>
                        <p className="text-xs text-gray-500 truncate" title={summary.breakdown}>{summary.breakdown || "변형 기록 없음"}</p>
                    </div>
                )}
        </div>
    );
};


// [NEW] Strategy Matrix Component
const DarwinStrategyMatrix: React.FC<{ configs: any[] }> = ({ configs }) => {
    return (
        <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700 mb-8">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <BrainIcon className="h-6 w-6 text-pink-400" />
                Darwin Strategy Matrix (Current Weights)
            </h3>
            <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm text-gray-400">
                    <thead className="bg-gray-900/50 text-gray-200 uppercase font-bold">
                        <tr>
                            <th className="px-4 py-3">Strategy</th>
                            <th className="px-4 py-3">Min Score (Bar)</th>
                            <th className="px-4 py-3">Size (Multiplier)</th>
                            <th className="px-4 py-3">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {configs.map((config) => (
                            <tr key={config.strategyName} className="hover:bg-gray-700/30 transition-colors">
                                <td className="px-4 py-3 font-medium text-white">{config.strategyName}</td>
                                <td className="px-4 py-3">
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${config.minScore > 90 ? 'bg-red-900 text-red-300' : 'bg-green-900 text-green-300'}`}>
                                        {config.minScore}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-cyan-300">x{config.allocationMultiplier.toFixed(1)}</td>
                                <td className="px-4 py-3">
                                    {config.status === 'ACTIVE' ? <span className="text-green-400">ACTIVE</span> : <span className="text-gray-500">{config.status}</span>}
                                </td>
                            </tr>
                        ))}
                        {configs.length === 0 && (
                            <tr>
                                <td colSpan={4} className="px-4 py-3 text-center text-gray-500">No strategy configurations loaded.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export const AIEvolutionDashboard: React.FC<{
    evolutionData: ReturnType<typeof useAIEvolution>,
    marketTarget: MarketTarget,
    proxyStatus: ProxyStatus,
}> = ({ evolutionData, marketTarget, proxyStatus }) => {
    const {
        eventsCache,
        isLoading, error, fetchRecent,
        collectorHealth, isHealthLoading, healthError,
        growthJournal, isJournalLoading, journalError,
        performanceStats, isStatsLoading,
        signalStatus, signalLog, cronJobs, isSignalMonitorLoading, signalMonitorError, fetchSignalMonitorData,
        kpiSummary, kpiDeltas, isKpiLoading, kpiError,
        weeklyDeformations, isDeformationsLoading, deformationsError
    } = evolutionData;

    // We need to destructure fetchGrowthJournal to trigger it manually
    const { fetchGrowthJournal } = evolutionData;

    const { briefings, isLoading: isBriefingLoading, error: briefingError, handleSubmitBriefing, fetchBriefings } = useAIBriefing();

    const [isTesting, setIsTesting] = useState(false);
    const [testError, setTestError] = useState<string | null>(null);
    const [testSuccess, setTestSuccess] = useState(false);

    // Ref for IntelligenceFlowMonitor to trigger manual refresh
    const intelligenceMonitorRef = useRef<IntelligenceFlowMonitorRef>(null);

    // Enhanced refresh handler that refreshes ALL components
    const handleRefreshAll = async () => {
        // Refresh timeline data
        fetchRecent();

        // Refresh intelligence monitor
        if (intelligenceMonitorRef.current) {
            await intelligenceMonitorRef.current.refresh();
        }
    };

    // --- Lazy Load Handlers ---
    const handleJournalToggle = (e: React.SyntheticEvent<HTMLDetailsElement>) => {
        if (e.currentTarget.open && growthJournal.length === 0 && !isJournalLoading) {
            fetchGrowthJournal();
        }
    };

    const handleTimelineToggle = (e: React.SyntheticEvent<HTMLDetailsElement>) => {
        if (e.currentTarget.open && eventsCache.length === 0 && !isLoading) {
            fetchRecent();
        }
    };

    const handlePipelineTest = async () => {
        if (!IS_SUPABASE_ENABLED) {
            setTestError("Supabase가 연결되지 않아 테스트를 실행할 수 없습니다.");
            return;
        }
        setIsTesting(true);
        setTestError(null);
        setTestSuccess(false);

        try {
            const response = await fetch(`${SUPABASE_URL}/functions/v1/collector`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    'apikey': SUPABASE_ANON_KEY,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: `[파이프라인 테스트] ${new Date().toLocaleString('ko-KR')} - 연결 상태 양호.`,
                    market: marketTarget,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: `Server responded with status ${response.status}` }));
                throw new Error(errorData.error || `Server responded with status ${response.status}`);
            }

            setTestSuccess(true);
            setTimeout(() => setTestSuccess(false), 5000);
        } catch (err) {
            setTestError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
        } finally {
            setIsTesting(false);
        }
    };

    return (
        <div className="animate-fade-in space-y-8">
            <header className="text-center">
                <div className="inline-block bg-gray-800 p-2 rounded-full mb-4">
                    <AIEvolutionIcon className="h-10 w-10 text-cyan-400" />
                </div>
                <h2 className="text-3xl font-bold text-gray-100">직투 AI 진화 연구소</h2>
                <p className="text-gray-400 max-w-3xl mx-auto">'직투' AI는 가만히 있지 않습니다. 스스로 학습하고, 실수를 복기하며, 사용자의 피드백을 통해 끊임없이 진화합니다.</p>
            </header>

            {/* LAZY LOAD: Growth Journal (Closed by default) */}
            <details className="bg-gray-800/50 border border-gray-700 rounded-xl group" onToggle={handleJournalToggle}>
                <summary className="list-none flex items-center justify-between p-4 cursor-pointer">
                    <div className="flex items-center gap-3">
                        <BrainIcon className="h-8 w-8 text-cyan-400" />
                        <div>
                            <h2 className="text-2xl font-bold text-gray-100">AI 성장 일지</h2>
                            <p className="text-sm text-gray-400">AI가 자신의 실수를 복기하고 학습하는 과정을 투명하게 기록합니다.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={(e) => { e.preventDefault(); fetchGrowthJournal(); }}
                            className="p-1.5 hover:bg-gray-700 rounded-full text-gray-400 hover:text-white transition-colors"
                            title="새로고침"
                        >
                            <RefreshIcon className={`h-5 w-5 ${isJournalLoading ? 'animate-spin' : ''}`} />
                        </button>
                        <ChevronRightIcon className="h-6 w-6 text-gray-400 transition-transform duration-300 group-open:rotate-90" />
                    </div>
                </summary>
                <div className="p-4 border-t border-gray-700">
                    <AIGrowthJournal
                        journal={growthJournal}
                        isLoading={isJournalLoading}
                        error={journalError}
                        showTitle={false}
                    />
                </div>
            </details>


            <ThoughtStream />

            <EvolutionControlPanel />

            <DarwinStrategyMatrix configs={evolutionData.strategyConfigs || []} />

            <DataSourceStatus collectorHealth={collectorHealth} proxyStatus={proxyStatus} />


            <IntelligenceFlowMonitor ref={intelligenceMonitorRef} />

            <WeeklyDeformationSummary data={weeklyDeformations} isLoading={isDeformationsLoading} error={deformationsError} />

            <KpiDashboard
                summary={kpiSummary}
                deltas={kpiDeltas}
                isLoading={isKpiLoading}
                error={kpiError}
            />

            <SystemSignalMonitor
                status={signalStatus}
                log={signalLog}
                cronJobs={cronJobs}
                isLoading={isSignalMonitorLoading}
                error={signalMonitorError}
                onRefresh={fetchSignalMonitorData}
            />

            <PerformanceStatsDashboard stats={performanceStats} isLoading={isStatsLoading} />

            <ManualLearningForm onSubmit={handleSubmitBriefing} />

            <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700 space-y-3">
                <CollectorStatusLamp health={collectorHealth} isLoading={isHealthLoading} error={healthError} />
                <div className="flex items-center gap-2">
                    <button onClick={handleRefreshAll} disabled={isLoading} className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold bg-gray-700 text-white rounded-md hover:bg-gray-600 disabled:opacity-50">
                        <RefreshIcon className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                        데이터 새로고침
                    </button>
                    <button onClick={handlePipelineTest} disabled={isTesting || !IS_SUPABASE_ENABLED} className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold bg-gray-700 text-white rounded-md hover:bg-gray-600 disabled:opacity-50">
                        {isTesting ? <RefreshIcon className="h-4 w-4 animate-spin" /> : <ToolboxIcon className="h-4 w-4" />}
                        파이프라인 테스트
                    </button>
                </div>
                {testSuccess && (
                    <div className="p-2 bg-green-900/40 text-green-300 text-xs rounded-md flex items-center gap-2">
                        <CheckCircleIcon className="h-4 w-4" />
                        <span>테스트 메시지 전송 성공! 잠시 후 타임라인에 메시지가 나타납니다.</span>
                    </div>
                )}
                {testError && <ErrorDisplay title="파이프라인 테스트 실패" message={testError} onRetry={handlePipelineTest} onClose={() => setTestError(null)} />}
            </div>

            <details className="bg-gray-800/50 border border-gray-700 rounded-xl group">
                <summary className="list-none flex items-center justify-between p-4 cursor-pointer">
                    <div className="flex items-center gap-3">
                        <DataFeedIcon className="h-6 w-6 text-indigo-400" />
                        <h3 className="text-2xl font-bold text-gray-200">브리핑 피드</h3>
                    </div>
                    <ChevronRightIcon className="h-6 w-6 text-gray-400 transition-transform duration-300 group-open:rotate-90" />
                </summary>
                <div className="p-4 border-t border-gray-700">
                    {isBriefingLoading && briefings.length === 0 ? (
                        <LoadingSpinner message="브리핑 기록을 불러오는 중..." />
                    ) : briefingError ? (
                        <ErrorDisplay title="브리핑 피드 로드 오류" message={briefingError} onRetry={fetchBriefings} />
                    ) : briefings.length === 0 ? (
                        <div className="text-center text-gray-500 py-10">
                            <p>제출된 브리핑이 없습니다.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {[...briefings]
                                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                                .map(b => <BriefingCard key={b.id} briefing={b} />)}
                        </div>
                    )}
                </div>
            </details>

            {/* LAZY LOAD: Timeline (Closed by default) */}
            <details className="bg-gray-800/50 border border-gray-700 rounded-xl group" onToggle={handleTimelineToggle}>
                <summary className="list-none flex items-center justify-between p-4 cursor-pointer">
                    <div className="flex items-center gap-3">
                        <AIEvolutionIcon className="h-6 w-6 text-cyan-400" />
                        <h2 className="text-2xl font-bold text-gray-100">AI 진화 타임라인</h2>
                    </div>
                    <ChevronRightIcon className="h-6 w-6 text-gray-400 transition-transform duration-300 group-open:rotate-90" />
                </summary>
                <div className="p-4 border-t border-gray-700">
                    <EvolutionTimeline
                        events={eventsCache}
                        isLoading={isLoading}
                        error={error}
                        onRefresh={fetchRecent}
                    />
                </div>
            </details>
        </div>
    );
};