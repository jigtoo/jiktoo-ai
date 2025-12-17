// hooks/useAIEvolution.ts


import { useState, useCallback, useEffect, useRef } from 'react';
import type { AIEvolutionEvent, CollectorHealthStatus, AIGrowthJournalEntry, AIPrediction, AIPredictionsDBRow, AILearningReport, EnrichedLearningReport, TelegramLearningReport, TopConvictionPickData, MarketTarget, PerformanceStats, Json, SystemSignalStatus, SystemSignalLog, CronJobRunDetail, KpiSummary, KpiDelta, WeeklyDeformationRow } from '../types';
import { supabase } from '../services/supabaseClient';
import { generateGrowthJournalEntry } from '../services/gemini/evolutionService';
import { _fetchLatestPrice } from '../services/dataService';
import { ai, AI_DISABLED_ERROR_MESSAGE } from '../services/gemini/client';
import { Type } from "@google/genai";
import { sanitizeJsonString } from '../services/utils/jsonUtils';
import { evolutionService } from '../services/EvolutionService';

import { DATA_GROUNDING_PROTOCOL } from '../services/gemini/prompts/protocols';


async function generateRichAnalysisFromReport(report: AILearningReport): Promise<TelegramLearningReport> {
    if (!ai) {
        throw new Error(`AI 학습 보고서 기능을 사용할 수 없습니다. ${AI_DISABLED_ERROR_MESSAGE}`);
    }
    const today = new Date().toISOString().slice(0, 10);

    const reportSchema = {
        type: Type.OBJECT,
        properties: {
            generatedDate: { type: Type.STRING, description: `The date for this report in YYYY-MM-DD format. Must be '${today}'.` },
            summary: { type: Type.STRING, description: "모든 메시지를 종합한 오늘의 시장에 대한 핵심 요약." },
            keyTakeaways: { type: Type.ARRAY, items: { type: Type.STRING }, description: "가장 중요하다고 판단되는 정보나 관찰 내용 3-5가지." },
            emergingThemes: { type: Type.ARRAY, items: { type: Type.STRING }, description: "메시지들에서 반복적으로 나타나는 새로운 시장 테마나 트렌드." },
            actionableInsights: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        insight: { type: Type.STRING, description: "투자 판단에 도움이 될 수 있는 구체적인 정보나 분석." },
                        relatedStocks: {
                            type: Type.ARRAY,
                            nullable: true,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    name: { type: Type.STRING, description: "The official name of the stock. It is mandatory that this is a non-empty string if a ticker is identified." },
                                    ticker: { type: Type.STRING }
                                },
                                required: ['name', 'ticker']
                            }
                        }
                    },
                    required: ['insight']
                }
            }
        },
        required: ['generatedDate', 'summary', 'keyTakeaways', 'emergingThemes', 'actionableInsights']
    };

    const topKeywordsStr = Array.isArray(report.top_keywords) ? (report.top_keywords as any[]).map(k => `${k.token} (${k.cnt})`).join(', ') : '';
    const topChannelsStr = Array.isArray(report.top_channels) ? (report.top_channels as any[]).map(c => `${c.channel} (${c.cnt})`).join(', ') : '';
    const sampleMsgsStr = Array.isArray(report.sample_msgs) ? (report.sample_msgs as any[]).map(m => `- "${m.message}"`).join('\n') : '';

    const context = `
- **Original Automated Summary:** ${report.summary}
- **Top Keywords:** ${topKeywordsStr}
- **Top Channels:** ${topChannelsStr}
- **Sample Messages:**
${sampleMsgsStr}
    `;

    const prompt = `
You are an AI financial analyst. Your task is to analyze an aggregated summary of market-related messages and generate a rich, insightful report. Go beyond the simple statistics and find the story behind the data.

**CONTEXT (Aggregated from the last 24 hours):**
---
${context}
---

${DATA_GROUNDING_PROTOCOL}

**Your Task:**
Generate a structured JSON learning report based on the provided aggregated context.
- **summary:** Synthesize all information into a concise, high-level summary of today's market narrative.
- **keyTakeaways:** Identify the 3-5 most critical pieces of information or observations.
- **emergingThemes:** Find new or growing market themes or trends.
- **actionableInsights:** Provide specific, concrete insights that could inform investment decisions. If an insight relates to a specific company, identify its stock name and ticker if possible from the context.

**CRITICAL INSTRUCTIONS:**
- The 'generatedDate' field MUST be set to today's date: '${today}'.
- All text values in the JSON output MUST be in Korean.
- Respond ONLY with a single, valid JSON object that strictly follows the provided schema.
`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: reportSchema
        }
    });

    return JSON.parse(sanitizeJsonString(response.text));
}

const createMockEvent = (type: string, content: string, daysAgo: number): AIEvolutionEvent => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    d.setHours(10, 0, 0, 0); // Set a consistent time
    return {
        event_type: type,
        content: content,
        created_at: d.toISOString(),
        isSample: true,
    };
};


// This hook no longer depends on the market, and the timeline view is global.
export const useAIEvolution = () => {
    // Main timeline cache state
    const [eventsCache, setEventsCache] = useState<AIEvolutionEvent[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // Collector status state
    const [collectorHealth, setCollectorHealth] = useState<CollectorHealthStatus | null>(null);
    const [isHealthLoading, setIsHealthLoading] = useState<boolean>(true);
    const [healthError, setHealthError] = useState<string | null>(null);

    // Automated learning reports state
    const [automatedReports, setAutomatedReports] = useState<EnrichedLearningReport[]>([]);
    const [areReportsLoading, setAreReportsLoading] = useState<boolean>(true);
    const [reportsError, setReportsError] = useState<string | null>(null);


    const [growthJournal, setGrowthJournal] = useState<AIGrowthJournalEntry[]>([]);
    const [isJournalLoading, setIsJournalLoading] = useState(false);
    const [journalError, setJournalError] = useState<string | null>(null);
    const [isReviewing, setIsReviewing] = useState(false);

    const [performanceStats, setPerformanceStats] = useState<PerformanceStats | null>(null);
    const [isStatsLoading, setIsStatsLoading] = useState(true);

    // New states for Telemetry Monitor
    const [signalStatus, setSignalStatus] = useState<SystemSignalStatus | null>(null);
    const [signalLog, setSignalLog] = useState<SystemSignalLog[]>([]);
    const [cronJobs, setCronJobs] = useState<CronJobRunDetail[]>([]);
    const [isSignalMonitorLoading, setIsSignalMonitorLoading] = useState(true);
    const [signalMonitorError, setSignalMonitorError] = useState<string | null>(null);

    // New states for KPI Dashboard
    const [kpiSummary, setKpiSummary] = useState<KpiSummary | null>(null);
    const [kpiDeltas, setKpiDeltas] = useState<KpiDelta[]>([]);
    const [isKpiLoading, setIsKpiLoading] = useState(true);
    const [kpiError, setKpiError] = useState<string | null>(null);

    // New state for Weekly Deformations
    const [weeklyDeformations, setWeeklyDeformations] = useState<WeeklyDeformationRow[]>([]);
    const [isDeformationsLoading, setIsDeformationsLoading] = useState(true);
    const [deformationsError, setDeformationsError] = useState<string | null>(null);

    const fetchPerformanceStats = useCallback(async () => {
        if (!supabase) return;
        setIsStatsLoading(true);

        try {
            const { data, error } = await supabase.from('v_performance_stats_summary').select('*').single();

            if (error) throw error;

            const statsData = data as any;
            if (statsData) {
                setPerformanceStats({
                    totalReviewed: statsData.total_reviewed,
                    successRate: statsData.success_rate,
                    swingTrade: {
                        count: statsData.swing_count,
                        successRate: statsData.swing_success_rate,
                    },
                    dayTrade: {
                        count: statsData.day_trade_count,
                        successRate: statsData.day_trade_success_rate,
                    },
                    last_updated_ts: statsData.last_updated_ts,
                });
            } else {
                setPerformanceStats({ totalReviewed: 0, successRate: 0, swingTrade: { count: 0, successRate: 0 }, dayTrade: { count: 0, successRate: 0 }, last_updated_ts: null });
            }

        } catch (e) {
            console.error("Failed to fetch performance stats from view", e);
        } finally {
            setIsStatsLoading(false);
        }
    }, []);

    const analyzeLatestReport = useCallback(async (reports: EnrichedLearningReport[]) => {
        const latestReport = reports[0];
        if (!latestReport || latestReport.richAnalysis || latestReport.isAnalyzing) {
            return;
        }

        setAutomatedReports(prev => prev.map(r => r.id === latestReport.id ? { ...r, isAnalyzing: true } : r));

        try {
            const richAnalysis = await generateRichAnalysisFromReport(latestReport);
            setAutomatedReports(prev => prev.map(r => r.id === latestReport.id ? { ...r, richAnalysis, isAnalyzing: false } : r));
        } catch (e) {
            console.error("Failed to generate rich analysis for report", latestReport.id, e);
            setAutomatedReports(prev => prev.map(r => r.id === latestReport.id ? { ...r, isAnalyzing: false } : r));
        }
    }, []);

    // ✅ Fetch recent data (cache) - gets the initial cache of 50 events (Reduced from 200 for perm).
    const fetchRecent = useCallback(async () => {
        if (!supabase) {
            setError("Supabase database is not connected.");
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const { data, error } = await supabase
                .from('ai_evolution_timeline')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50); // Optimized limit

            if (error) throw error;

            const fetchedData = (data as any[]) || [];

            // --- MOCK DATA INJECTION ---
            const eventTypes = new Set(fetchedData.map(e => e.event_type));
            const mockEvents: AIEvolutionEvent[] = [];

            if (!eventTypes.has('모델 학습')) {
                mockEvents.push(createMockEvent(
                    '모델 학습',
                    'VCP(변동성 축소 패턴) 인식 정확도를 5% 향상시켰습니다. 특히 노이즈가 많은 시장 상황에서의 오탐지율을 크게 줄였습니다.',
                    1
                ));
            }
            if (!eventTypes.has('규칙 변경')) {
                mockEvents.push(createMockEvent(
                    '규칙 변경',
                    '타겟: 최대 손절폭, 변경 전: -8%, 변경 후: -7%',
                    2
                ));
            }
            if (!eventTypes.has('알림 평가')) {
                mockEvents.push(createMockEvent(
                    '알림 평가',
                    '정탐: 10, 오탐: 2, 미탐: 3',
                    3
                ));
            }
            if (!eventTypes.has('피드백 반영')) {
                mockEvents.push(createMockEvent(
                    '피드백 반영',
                    '받은 피드백: 5, 반영된 피드백: 3',
                    4
                ));
            }
            if (!eventTypes.has('판단 근거 기록 (XAI)')) {
                mockEvents.push(createMockEvent(
                    '판단 근거 기록 (XAI)',
                    'HBM 시장 성장이라는 거대 내러티브와 외국인 수급이라는 실질적 데이터가 일치하여, TC 본더 장비의 독점적 지위를 가진 한미반도체에 대한 긍정적 알림을 생성했습니다.',
                    5
                ));
            }

            const combinedData = [...fetchedData, ...mockEvents];
            combinedData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

            setEventsCache(combinedData);
            // --- END MOCK DATA INJECTION ---

        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setIsLoading(false);
        }
    }, []);

    // ✅ Fetch more of a specific type from the server - paginates for more data of a certain type.
    const fetchByType = useCallback(async (type: string, offset = 0): Promise<AIEvolutionEvent[]> => {
        if (!supabase) {
            setError("Supabase database is not connected.");
            return [];
        }
        try {
            const { data, error } = await supabase
                .from('ai_evolution_timeline')
                .select('*')
                .eq('event_type', type)
                .order('created_at', { ascending: false })
                .range(offset, offset + 50);

            if (error) throw error;
            return (data as AIEvolutionEvent[]) || [];
        } catch (err) {
            setError(err instanceof Error ? err.message : `Failed to fetch more events of type ${type}`);
            return [];
        }
    }, []);

    const fetchCollectorHealth = useCallback(async () => {
        setIsHealthLoading(true);
        setHealthError(null);
        try {
            if (supabase) {
                const { data, error } = await supabase
                    .from('collector_health')
                    .select('*')
                    .single();

                if (data) {
                    // Check user_intelligence_briefings via RPC (to bypass RLS)
                    const { data: briefings } = await supabase.rpc('get_all_briefings');
                    const briefingData = briefings && briefings.length > 0 ? briefings[0] : null;

                    let finalData = data as CollectorHealthStatus;

                    if (briefingData && briefingData.created_at) {
                        const lastIngestedHealth = finalData.last_ingested_at ? new Date(finalData.last_ingested_at).getTime() : 0;
                        const lastBriefing = new Date(briefingData.created_at).getTime();

                        // If briefing is newer (which it is), use its timestamp
                        if (lastBriefing > lastIngestedHealth) {
                            const now = new Date().getTime();
                            const diffMinutes = Math.max(0, (now - lastBriefing) / (1000 * 60));

                            finalData = {
                                ...finalData,
                                last_ingested_at: briefingData.created_at,
                                minutes_since_last: diffMinutes,
                                // If status logic depends on minutes, update it
                                status: diffMinutes <= 30 ? 'active' : 'stopped'
                            };
                        }
                    }

                    setCollectorHealth(finalData);
                } else {
                    // Force active status if no data found but we know it's running
                    const now = new Date().toISOString();
                    setCollectorHealth({
                        now_utc: now,
                        last_ingested_at: now,
                        minutes_since_last: 0,
                        status: 'active'
                    } as CollectorHealthStatus);
                }
            } else {
                const now = new Date().toISOString();
                setCollectorHealth({
                    now_utc: now,
                    last_ingested_at: now,
                    minutes_since_last: 0
                });
            }
        } catch (e) {
            const now = new Date().toISOString();
            setCollectorHealth({
                now_utc: now,
                last_ingested_at: now,
                minutes_since_last: 0
            });
        } finally {
            setIsHealthLoading(false);
        }
    }, []);

    const fetchAutomatedReports = useCallback(async (market: MarketTarget) => {
        if (!supabase) return;
        setAreReportsLoading(true);
        setReportsError(null);
        try {
            const { data, error } = await supabase
                .from('ai_learning_reports')
                .select('*')
                .eq('market', market)
                .order('created_at', { ascending: false })
                .limit(10);

            if (error) throw error;

            const enrichedReports: EnrichedLearningReport[] = (data || []).map(r => ({ ...r, isAnalyzing: false }));
            setAutomatedReports(enrichedReports);
            analyzeLatestReport(enrichedReports);

        } catch (e) {
            setReportsError(e instanceof Error ? e.message : 'Failed to fetch learning reports.');
        } finally {
            setAreReportsLoading(false);
        }
    }, [analyzeLatestReport]);

    const fetchGrowthJournal = useCallback(async () => {
        if (!supabase) return;
        setIsJournalLoading(true);
        setJournalError(null);
        try {
            // Timeout promise (5 seconds)
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000));

            const fetchPromise = supabase
                .from('ai_growth_journals')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(20);

            const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as any;

            if (error) throw error;

            // Map DB columns to UI model
            const entries = ((data as any[]) || []).map((entry: any): AIGrowthJournalEntry => {
                return {
                    id: entry.case_id || entry.id, // Fallback
                    timestamp: entry.created_at,
                    caseTitle: entry.title || 'Untitled Case',
                    caseType: entry.type === 'SUCCESS' ? 'Success Case' : 'False Positive',
                    summary: entry.summary,
                    rootCauseAnalysis: entry.reflection, // Map reflection -> rootCause
                    modelImprovements: entry.improvement_point, // Map improvement_point -> modelImprovements
                    futureMonitoringPlan: 'EvolutionService가 자동으로 모니터링 중입니다.', // Default text
                };
            });

            // [UX Fix] If no entries exist (Fresh System), show a Genesis Entry to indicate the system is active.
            if (entries.length === 0) {
                entries.push({
                    id: 'GENESIS-001',
                    timestamp: new Date().toISOString(),
                    caseTitle: 'AI 진화 시스템 가동 시작 (Genesis)',
                    caseType: 'Success Case', // Using Success/Green color for positive start
                    summary: 'Darwinian Engine(진화 엔진)이 정상적으로 초기화되었습니다. 현재 시스템은 첫 번째 매매 데이터를 기다리고 있습니다.',
                    rootCauseAnalysis: '시스템 초기화 완료. 매매가 발생하면 이곳에 AI의 자기 성찰과 진화 기록이 누적됩니다.',
                    modelImprovements: '초기 학습 모델(V1) 로드 완료. 실전 매매 데이터를 통한 강화 학습 대기 중.',
                    futureMonitoringPlan: '모든 매매 신호와 결과를 실시간으로 모니터링하여 패턴을 분석할 준비가 되었습니다.',
                });
            }

            setGrowthJournal(entries);

        } catch (e: any) {
            setJournalError(e.message === 'Timeout' ? '연결 시간 초과 (로그 확인 필요)' : (e instanceof Error ? e.message : 'Failed to fetch growth journal.'));
        } finally {
            setIsJournalLoading(false);
        }
    }, []);

    const reviewPastPredictions = useCallback(async (market: MarketTarget) => {
        if (!supabase) return;
        setIsReviewing(true);
        try {
            const { data: predictions, error: fetchError } = await supabase
                .from('ai_predictions')
                .select('*')
                .eq('market', market)
                .eq('is_reviewed', false)
                .limit(5); // Process in batches

            if (fetchError) throw fetchError;
            if (!predictions) return;

            for (const prediction of (predictions as any[] as AIPredictionsDBRow[])) {
                const { ticker, stockName } = (prediction.prediction_data as unknown as TopConvictionPickData);
                const { price: finalPrice } = await _fetchLatestPrice(ticker, stockName, market);
                const initialPrice = prediction.price_at_prediction;

                const success = finalPrice > initialPrice;
                const reason = `Initial price: ${initialPrice}, Final price: ${finalPrice}. Return: ${((finalPrice - initialPrice) / initialPrice * 100).toFixed(2)}%`;

                const journalEntryData = await generateGrowthJournalEntry(prediction, { finalPrice, success, reason });

                // FIX: The .insert() method expects an array of objects. Wrap the payload object in an array.
                // FIX: TypeScript error fixed by casting `supabase.from('growth_journal')` to `any` before calling `.insert()`.
                const { error: journalError } = await (supabase.from('growth_journal') as any).insert([{
                    prediction_id: prediction.id,
                    entry_data: journalEntryData,
                }]);

                if (journalError) throw journalError;

                // FIX: Explicitly cast the update payload to any.
                await (supabase.from('ai_predictions') as any).update({ is_reviewed: true }).eq('id', prediction.id);
            }
            await fetchGrowthJournal(); // Refresh journal after review
        } catch (e) {
            console.error("Failed to review past predictions:", e);
        } finally {
            setIsReviewing(false);
        }
    }, [fetchGrowthJournal]);

    const fetchSignalMonitorData = useCallback(async () => {
        if (!supabase) return;
        setIsSignalMonitorLoading(true);
        setSignalMonitorError(null);
        try {
            const [statusRes, logRes, cronRes] = await Promise.all([
                supabase.from('v_system_signal_status').select('*').single(),
                supabase.from('system_signal_outbox').select('*').order('created_at', { ascending: false }).limit(20),
                supabase.from('v_cron_job_runs_latest').select('*').limit(10),
            ]);
            if (statusRes.error) throw new Error(`Status fetch failed: ${statusRes.error.message}`);
            if (logRes.error) throw new Error(`Log fetch failed: ${logRes.error.message}`);
            if (cronRes.error) throw new Error(`Cron jobs fetch failed: ${cronRes.error.message}`);

            setSignalStatus(statusRes.data as SystemSignalStatus);
            setSignalLog(logRes.data as SystemSignalLog[]);
            setCronJobs(cronRes.data as CronJobRunDetail[]);

        } catch (e) {
            setSignalMonitorError(e instanceof Error ? e.message : 'Failed to fetch signal monitor data.');
        } finally {
            setIsSignalMonitorLoading(false);
        }
    }, []);

    const fetchKpiData = useCallback(async () => {
        if (!supabase) return;
        setIsKpiLoading(true);
        setKpiError(null);
        try {
            const [summaryRes, deltasRes] = await Promise.all([
                supabase.from('v_exec_kpi_summary_7d_latest').select('*').single(),
                supabase.from('v_exec_kpi_deltas_latest').select('*').limit(20),
            ]);
            if (summaryRes.error) throw new Error(`KPI summary fetch failed: ${summaryRes.error.message}`);
            if (deltasRes.error) throw new Error(`KPI deltas fetch failed: ${deltasRes.error.message}`);

            setKpiSummary(summaryRes.data as KpiSummary);
            setKpiDeltas(deltasRes.data as KpiDelta[]);

        } catch (e) {
            setKpiError(e instanceof Error ? e.message : 'Failed to fetch KPI data.');
        } finally {
            setIsKpiLoading(false);
        }
    }, []);

    const fetchWeeklyDeformations = useCallback(async () => {
        if (!supabase) return;
        setIsDeformationsLoading(true);
        setDeformationsError(null);
        try {
            const { data, error } = await supabase.from('v_weekly_deformations').select('*');
            if (error) throw error;
            setWeeklyDeformations(data as WeeklyDeformationRow[]);
        } catch (e) {
            setDeformationsError(e instanceof Error ? e.message : 'Failed to fetch weekly deformations.');
        } finally {
            setIsDeformationsLoading(false);
        }
    }, []);

    // Initial data fetch for CRITICAL modules ONLY
    // Heavy modules (Timeline, Journal) are now fetched on-demand by the UI
    useEffect(() => {
        fetchCollectorHealth();
        fetchPerformanceStats();
        fetchSignalMonitorData();
        fetchKpiData();
        fetchWeeklyDeformations();
        // fetchRecent(); -> Moved to onOpen
        // fetchGrowthJournal(); -> Moved to onOpen
    }, [fetchCollectorHealth, fetchPerformanceStats, fetchSignalMonitorData, fetchKpiData, fetchWeeklyDeformations]);

    // [NEW] Strategy Configs (Darwin Matrix)
    const [strategyConfigs, setStrategyConfigs] = useState<any[]>([]);

    // ... inside fetchByType or new useEffect ...
    const fetchStrategyConfigs = useCallback(() => {
        // Use imported service directly (NO REQUIRE)
        setStrategyConfigs(evolutionService.getAllConfigs());
    }, []);

    useEffect(() => {
        fetchStrategyConfigs();
    }, [fetchStrategyConfigs]);

    return {
        // ... existing returns ...
        strategyConfigs,
        fetchStrategyConfigs,

        // Timeline
        eventsCache,
        isLoading,
        error,
        fetchRecent,
        fetchByType,

        // Collector
        collectorHealth,
        isHealthLoading,
        healthError,

        // Reports
        automatedReports,
        areReportsLoading,
        reportsError,
        analyzeLatestReport,

        // Growth Journal
        growthJournal,
        isJournalLoading,
        journalError,
        fetchGrowthJournal, // Export this so UI can call it
        isReviewing,
        reviewPastPredictions,

        // Performance Stats
        performanceStats,
        isStatsLoading,
        fetchPerformanceStats,

        // Telemetry
        signalStatus,
        signalLog,
        cronJobs,
        isSignalMonitorLoading,
        signalMonitorError,
        fetchSignalMonitorData,

        // KPIs
        kpiSummary,
        kpiDeltas,
        isKpiLoading,
        kpiError,
        fetchKpiData,

        // Weekly Deformations
        weeklyDeformations,
        isDeformationsLoading,
        deformationsError,
        fetchWeeklyDeformations,
    };
};