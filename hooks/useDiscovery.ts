
// copy-of-sepa-ai/hooks/useDiscovery.ts


import { useState, useCallback, useEffect, useRef } from 'react';
import type { AnalysisResult, MarketHealth, WatchlistHistoryItem, UserNote, MarketTarget, InstitutionalFlowAnalysis, WhaleRadarData, ExecAlphaBrief } from '../types';
import { fetchAnalysis, findStock } from '../services/gemini/stockService';
import { fetchMarketHealth, fetchInstitutionalFlowAnalysis, fetchStocksForSector } from '../services/gemini/marketService';
import { fetchRealtimeSnapshot } from '../services/api/kiwoomService';
import { supabase } from '../services/supabaseClient';
import { marketInfo } from '../services/marketInfo';
import { getMarketSessionState, getMarketDateString } from '../services/utils/dateUtils';


type AnalysisStatus = 'idle' | 'loading' | 'error';

interface DiscoveryMarketState {
    marketHealth: MarketHealth | null;
    isMarketHealthLoading: boolean;
    marketHealthError: string | null;
    watchlistHistory: WatchlistHistoryItem[];
    analysisHistory: AnalysisResult[];
    institutionalFlow: InstitutionalFlowAnalysis | null;
    isInstitutionalFlowLoading: boolean;
    institutionalFlowError: string | null;
    institutionalFlowYesterday: InstitutionalFlowAnalysis | null;
    isInstitutionalFlowYesterdayLoading: boolean;
    institutionalFlowYesterdayError: string | null;
    whaleRadarData: WhaleRadarData[] | null;
    isWhaleRadarLoading: boolean;
    whaleRadarError: string | null;
    execAlphaBrief: ExecAlphaBrief | null;
    isBriefLoading: boolean;
}

const initialMarketState: DiscoveryMarketState = {
    marketHealth: null,
    isMarketHealthLoading: false,
    marketHealthError: null,
    watchlistHistory: [],
    analysisHistory: [],
    institutionalFlow: null,
    isInstitutionalFlowLoading: false,
    institutionalFlowError: null,
    institutionalFlowYesterday: null,
    isInstitutionalFlowYesterdayLoading: false,
    institutionalFlowYesterdayError: null,
    whaleRadarData: null,
    isWhaleRadarLoading: false,
    whaleRadarError: null,
    execAlphaBrief: null,
    isBriefLoading: true,
};

const isResultValid = (result: any): result is AnalysisResult => {
    if (!result) return false;

    const hasBasicInfo = !!(result.ticker && result.stockName && result.status);
    const hasPsychoanalyst = !!result.psychoanalystAnalysis;
    const hasStrategist = !!result.strategistAnalysis;
    const hasSynthesis = !!(result.synthesis && result.synthesis.finalVerdict);

    return hasBasicInfo && hasPsychoanalyst && hasStrategist && hasSynthesis;
};

export const useDiscovery = (marketTarget: MarketTarget) => {
    // --- STATE ---
    const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>('idle');
    const [analysisError, setAnalysisError] = useState<string | null>(null);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
    const [completedAnalysis, setCompletedAnalysis] = useState<{ result: AnalysisResult; stockName: string; ticker: string; } | null>(null);
    const [ticker, setTicker] = useState<string>('');
    const [analyzingStockName, setAnalyzingStockName] = useState<string>('');
    const [analysisProgress, setAnalysisProgress] = useState(0);
    const [dbError, setDbError] = useState<string | null>(null);

    const [marketStates, setMarketStates] = useState<{ KR: DiscoveryMarketState; US: DiscoveryMarketState }>({
        KR: { ...initialMarketState },
        US: { ...initialMarketState },
    });

    const analysisRequestRef = useRef(0);
    const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const autoRefreshTriggered = useRef<Record<MarketTarget, string>>({ KR: '', US: '' });

    // --- DATA FETCHING & HANDLERS ---
    const clearProgressInterval = () => {
        if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
            progressIntervalRef.current = null;
        }
    };

    const updateHistoryInDB = useCallback(async (newHistory: AnalysisResult[], target: MarketTarget) => {
        if (!supabase) return;
        try {
            const { data: { session } } = await (supabase.auth as any).getSession();
            if (!session) throw new Error("로그인 필요");
            // FIX: Cast payload to `any` to avoid Supabase client type inference issues.
            await supabase.from('user_analysis_history').upsert({
                owner: session.user.id,
                market: target,
                history_data: newHistory,
                updated_at: new Date().toISOString()
            } as any, { onConflict: 'owner, market' });
        } catch (e) {
            console.error("Failed to save history to DB:", e);
            setDbError("분석 기록을 데이터베이스에 저장하지 못했습니다.");
        }
    }, []);

    const updateAnalysisHistory = useCallback((newHistory: AnalysisResult[], target: MarketTarget) => {
        setMarketStates(prev => {
            const newMarketState = { ...prev[target], analysisHistory: newHistory };
            return { ...prev, [target]: newMarketState };
        });
        updateHistoryInDB(newHistory, target);
    }, [updateHistoryInDB]);

    const addToWatchlistHistory = useCallback((item: AnalysisResult, target: MarketTarget) => {
        setMarketStates(prev => {
            const currentHistory = prev[target].watchlistHistory;
            const newHistoryItem: WatchlistHistoryItem = { savedDate: new Date().toISOString().split('T')[0], analysis: item };
            const updatedHistory = [newHistoryItem, ...currentHistory.filter(oldItem => oldItem.analysis.ticker !== newHistoryItem.analysis.ticker)];
            return { ...prev, [target]: { ...prev[target], watchlistHistory: updatedHistory } };
        });
    }, []);

    const removeFromWatchlistHistory = useCallback((tickerToRemove: string) => {
        setMarketStates(prev => {
            const currentHistory = prev[marketTarget].watchlistHistory;
            const newHistory = currentHistory.filter(item => item.analysis.ticker !== tickerToRemove);
            return { ...prev, [marketTarget]: { ...prev[marketTarget], watchlistHistory: newHistory } };
        });
    }, [marketTarget]);

    useEffect(() => {
        const fetchHistory = async () => {
            if (!supabase) {
                console.warn("Supabase not available, history features will not be persisted.");
                return;
            }
            try {
                const { data, error } = await supabase
                    .from('user_analysis_history')
                    .select('history_data')
                    .eq('market', marketTarget)
                    .order('updated_at', { ascending: false }) // Prefer latest
                    .limit(1)
                    .maybeSingle();

                if (error) throw error;

                // FIX: Cast `data` to `any` to resolve Supabase type inference issue.
                if (data && (data as any).history_data) {
                    // FIX: Cast `data` to `any` to resolve Supabase type inference issue.
                    const history = (data as any).history_data as AnalysisResult[];
                    const watchlist = history
                        .filter(res => res.status === 'ActionableSignal' || res.status === 'Watchlist')
                        .map(res => ({ savedDate: res.priceTimestamp.split(' ')[0], analysis: res }))
                        .sort((a, b) => new Date(b.savedDate).getTime() - new Date(a.savedDate).getTime());

                    setMarketStates(prev => ({
                        ...prev,
                        [marketTarget]: {
                            ...prev[marketTarget],
                            analysisHistory: history,
                            watchlistHistory: watchlist
                        }
                    }));
                }
            } catch (err) {
                console.error("Failed to fetch history from Supabase:", err);
            }
        };
        fetchHistory();
    }, [marketTarget]);


    const handleGoHome = useCallback(() => {
        setTicker('');
        setAnalysisResult(null);
        setAnalysisError(null);
        setAnalysisStatus('idle');
        setAnalysisProgress(0);
        clearProgressInterval();
    }, []);

    useEffect(() => {
        handleGoHome();
    }, [marketTarget, handleGoHome]);

    const handleSearch = useCallback(async (searchQuery: string, rationale?: string, preVerifiedStockName?: string) => {
        if (!searchQuery) return;

        const isProactive = !preVerifiedStockName;

        clearProgressInterval();
        const currentRequestId = Date.now();
        analysisRequestRef.current = currentRequestId;

        if (!isProactive) {
            setAnalysisResult(null);
            setCompletedAnalysis(null);
        }

        setAnalysisError(null);
        setAnalyzingStockName(preVerifiedStockName || searchQuery);
        setTicker('');
        setAnalysisStatus('loading');
        setAnalysisProgress(0);

        progressIntervalRef.current = setInterval(() => setAnalysisProgress(prev => Math.min(prev + 5, 95)), 800);

        try {
            let stockToAnalyze: { ticker: string; stockName: string };

            if (preVerifiedStockName) {
                stockToAnalyze = { ticker: searchQuery, stockName: preVerifiedStockName };
            } else {
                const stockInfo = await findStock(searchQuery, marketTarget);

                if (!stockInfo || !stockInfo.ticker || !stockInfo.stockName) {
                    throw new Error("AI가 종목 정보를 찾지 못했습니다. 다른 검색어나 종목명으로 다시 시도해주세요.");
                }

                if (stockInfo.market !== marketTarget) {
                    const correctMarketName = marketInfo[stockInfo.market].name;
                    throw new Error(`'${stockInfo.stockName}'은(는) ${correctMarketName} 종목입니다. ${correctMarketName}으로 전환 후 다시 검색해주세요.`);
                }

                stockToAnalyze = { ticker: stockInfo.ticker, stockName: stockInfo.stockName };
            }

            setAnalyzingStockName(stockToAnalyze.stockName);
            setTicker(stockToAnalyze.ticker.toUpperCase());

            const result = await fetchAnalysis(stockToAnalyze.ticker, stockToAnalyze.stockName, marketTarget, rationale);

            if (!isResultValid(result)) {
                throw new Error("AI가 유효한 분석 리포트를 생성하지 못했습니다. 리포트의 필수 항목이 누락되었습니다. 잠시 후 다시 시도해주세요.");
            }

            if (analysisRequestRef.current === currentRequestId) {
                const newHistory = [result, ...marketStates[marketTarget].analysisHistory.filter(h => h.ticker !== result.ticker)].slice(0, 20);
                updateAnalysisHistory(newHistory, marketTarget);

                clearProgressInterval();
                setAnalysisProgress(100);

                if (!isProactive) setAnalysisResult(result);
                else setCompletedAnalysis({ result, stockName: result.stockName, ticker: result.ticker });
                setAnalysisStatus('idle');

                if (result.status === 'Watchlist' || result.status === 'ActionableSignal') {
                    addToWatchlistHistory(result, marketTarget);
                }
            }
        } catch (err: unknown) {
            if (analysisRequestRef.current === currentRequestId) {
                clearProgressInterval();
                setAnalysisError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
                setAnalysisStatus('error');
            }
        }
    }, [marketTarget, addToWatchlistHistory, marketStates, updateAnalysisHistory]);

    const loadMarketHealth = useCallback(async (target: MarketTarget, isAutoRefresh = false) => {
        const maxRetries = 2;
        let attempt = 0;

        if (!isAutoRefresh) {
            setMarketStates(prev => ({ ...prev, [target]: { ...prev[target], isMarketHealthLoading: true, marketHealthError: null, isBriefLoading: true } }));
        } else {
            setMarketStates(prev => ({ ...prev, [target]: { ...prev[target], isBriefLoading: true } }));
        }

        while (attempt <= maxRetries) {
            try {
                const healthData = await fetchMarketHealth(target);

                const newBrief: ExecAlphaBrief = {
                    id: Date.now(),
                    created_at: new Date().toISOString(),
                    content: healthData.summary,
                };

                setMarketStates(prev => ({
                    ...prev,
                    [target]: {
                        ...prev[target],
                        marketHealth: healthData,
                        marketHealthError: null,
                        execAlphaBrief: newBrief,
                    }
                }));
                break;
            } catch (err: any) {
                attempt++;
                console.warn(`[loadMarketHealth attempt ${attempt}] Failed:`, err);
                if (attempt > maxRetries) {
                    if (!isAutoRefresh) {
                        setMarketStates(prev => ({ ...prev, [target]: { ...prev[target], marketHealthError: err instanceof Error ? err.message : '데이터 로딩 실패' } }));
                    } else {
                        console.error(`Auto-refresh market health failed after ${attempt} attempts:`, err);
                    }
                    break;
                } else {
                    const delay = Math.pow(2, attempt) * 1000;
                    await new Promise(res => setTimeout(res, delay));
                }
            }
        }

        setMarketStates(prev => ({ ...prev, [target]: { ...prev[target], isMarketHealthLoading: false, isBriefLoading: false } }));
    }, []);

    const handleFetchInstitutionalFlow = useCallback(async (isAutoRefresh = false) => {
        if (marketTarget !== 'KR') return;
        if (!isAutoRefresh) {
            setMarketStates(prev => ({ ...prev, [marketTarget]: { ...prev[marketTarget], isInstitutionalFlowLoading: true, institutionalFlowError: null } }));
        }
        try {
            const data = await fetchInstitutionalFlowAnalysis();
            setMarketStates(prev => ({ ...prev, [marketTarget]: { ...prev[marketTarget], institutionalFlow: data } }));
        } catch (err: any) {
            if (!isAutoRefresh) {
                setMarketStates(prev => ({ ...prev, [marketTarget]: { ...prev[marketTarget], institutionalFlowError: err instanceof Error ? err.message : '기관 수급 데이터 로딩 실패' } }));
            }
        } finally {
            if (!isAutoRefresh) {
                setMarketStates(prev => ({ ...prev, [marketTarget]: { ...prev[marketTarget], isInstitutionalFlowLoading: false } }));
            }
        }
    }, [marketTarget]);

    const handleFetchInstitutionalFlowYesterday = useCallback(async () => {
        if (marketTarget !== 'KR') return;
        setMarketStates(prev => ({ ...prev, [marketTarget]: { ...prev[marketTarget], isInstitutionalFlowYesterdayLoading: true, institutionalFlowYesterdayError: null } }));
        try {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const data = await fetchInstitutionalFlowAnalysis(yesterday.toISOString().split('T')[0]);
            setMarketStates(prev => ({ ...prev, [marketTarget]: { ...prev[marketTarget], institutionalFlowYesterday: data } }));
        } catch (err: any) {
            setMarketStates(prev => ({ ...prev, [marketTarget]: { ...prev[marketTarget], institutionalFlowYesterdayError: err instanceof Error ? err.message : '어제자 기관 수급 데이터 로딩 실패' } }));
        } finally {
            setMarketStates(prev => ({ ...prev, [marketTarget]: { ...prev[marketTarget], isInstitutionalFlowYesterdayLoading: false } }));
        }
    }, [marketTarget]);

    const handleFetchWhaleRadarData = useCallback(async (isAutoRefresh = false) => {
        if (marketTarget !== 'KR') return;

        const topSectors = marketStates.KR.institutionalFlow?.topSectors;
        if (!topSectors || topSectors.length === 0) {
            if (!isAutoRefresh) setMarketStates(prev => ({ ...prev, KR: { ...prev.KR, whaleRadarError: '기관 매수 상위 섹터 정보가 없어 추적을 시작할 수 없습니다.' } }));
            return;
        }

        if (!isAutoRefresh) {
            setMarketStates(prev => ({ ...prev, KR: { ...prev.KR, isWhaleRadarLoading: true, whaleRadarError: null } }));
        }

        try {
            const sectorNames = topSectors.map(s => s.sectorName);
            const stocksToTrack = await fetchStocksForSector(sectorNames, 'KR');

            const results: (WhaleRadarData | null)[] = [];
            for (const stock of stocksToTrack) {
                try {
                    const snapshot = await fetchRealtimeSnapshot(stock.ticker, ['investor'], {}, 'KR');
                    if (snapshot.errors && snapshot.errors.some((e: any) => e.field === 'investor')) {
                        results.push(null);
                        continue;
                    };
                    const investorData = snapshot.investor;
                    results.push({
                        ...stock,
                        institutionalNetBuy: investorData ? parseInt(investorData.orgn_ntby_trd_amt.replace(/,/g, ''), 10) : 0,
                        foreignNetBuy: investorData ? parseInt(investorData.frgn_ntby_trd_amt.replace(/,/g, ''), 10) : 0,
                        pensionNetBuy: investorData ? parseInt(investorData.pns_fund_ntby_trd_amt.replace(/,/g, ''), 10) : 0,
                    });
                } catch {
                    results.push(null);
                }
            }

            setMarketStates(prev => ({ ...prev, KR: { ...prev.KR, whaleRadarData: results.filter(Boolean) as WhaleRadarData[] } }));

        } catch (err) {
            if (!isAutoRefresh) {
                setMarketStates(prev => ({ ...prev, KR: { ...prev.KR, whaleRadarError: err instanceof Error ? err.message : '세력 추적 데이터 로딩 실패' } }));
            }
        } finally {
            if (!isAutoRefresh) {
                setMarketStates(prev => ({ ...prev, KR: { ...prev.KR, isWhaleRadarLoading: false } }));
            }
        }
    }, [marketStates.KR.institutionalFlow]);

    useEffect(() => {
        if (marketTarget === 'KR' && marketStates.KR.institutionalFlow) {
            handleFetchWhaleRadarData();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [marketStates.KR.institutionalFlow, marketTarget]);

    // Automatic loading on initial load and market change
    useEffect(() => {
        loadMarketHealth(marketTarget);
    }, [marketTarget, loadMarketHealth]);

    // Automatic periodic refresh during market hours
    useEffect(() => {
        const brief = marketStates[marketTarget].execAlphaBrief;
        const isBriefLoading = marketStates[marketTarget].isBriefLoading;

        if (isBriefLoading) return;

        const today = getMarketDateString(marketTarget);

        if (autoRefreshTriggered.current[marketTarget] === today) {
            return;
        }

        const briefDate = brief ? getMarketDateString(marketTarget, new Date(brief.created_at)) : null;

        const session = getMarketSessionState(marketTarget);

        if ((!brief || briefDate !== today) && session.state === 'REGULAR') {
            console.log(`[Discovery Auto-Refresh] Triggering for new regular session...`);
            autoRefreshTriggered.current[marketTarget] = today;
            loadMarketHealth(marketTarget, true);
        }
    }, [marketTarget, marketStates, loadMarketHealth]);


    const handleViewCompletedResult = useCallback(() => {
        if (!completedAnalysis) return;
        setAnalysisResult(completedAnalysis.result);
        setTicker(completedAnalysis.ticker);
        setAnalyzingStockName(completedAnalysis.stockName);
        setCompletedAnalysis(null);
    }, [completedAnalysis]);

    const handleDismissCompletedAnalysis = useCallback(() => {
        setCompletedAnalysis(null);
    }, []);

    const handleCancelAnalysis = useCallback(() => {
        analysisRequestRef.current = 0;
        clearProgressInterval();
        setAnalysisStatus('idle');
        setAnalysisProgress(0);
        setAnalyzingStockName('');
        setTicker('');
    }, []);

    const handleUpdateUserNote = useCallback((note: UserNote) => {
        if (analysisResult) {
            const newResult = { ...analysisResult, userNote: note };
            setAnalysisResult(newResult); // Update current view for immediate feedback

            // Persist the change to history and DB
            const newHistory = marketStates[marketTarget].analysisHistory.map(h =>
                h.ticker === newResult.ticker ? newResult : h
            );
            updateAnalysisHistory(newHistory, marketTarget);

            if (completedAnalysis && completedAnalysis.result.ticker === newResult.ticker) {
                setCompletedAnalysis(prev => prev ? ({ ...prev, result: newResult }) : null);
            }
        }
    }, [analysisResult, completedAnalysis, marketStates, marketTarget, updateAnalysisHistory]);

    const handleViewAnalysisFromHistory = useCallback((result: AnalysisResult) => {
        setAnalysisResult(result);
    }, []);

    const currentMarketState = marketStates[marketTarget];

    return {
        analysisStatus,
        analysisError,
        analysisResult,
        completedAnalysis,
        ticker,
        analyzingStockName,
        analysisProgress,
        marketHealth: currentMarketState.marketHealth,
        isMarketHealthLoading: currentMarketState.isMarketHealthLoading,
        marketHealthError: currentMarketState.marketHealthError,
        watchlistHistory: currentMarketState.watchlistHistory,
        analysisHistory: currentMarketState.analysisHistory,
        institutionalFlow: currentMarketState.institutionalFlow,
        isInstitutionalFlowLoading: currentMarketState.isInstitutionalFlowLoading,
        institutionalFlowError: currentMarketState.institutionalFlowError,
        institutionalFlowYesterday: currentMarketState.institutionalFlowYesterday,
        isInstitutionalFlowYesterdayLoading: currentMarketState.isInstitutionalFlowYesterdayLoading,
        institutionalFlowYesterdayError: currentMarketState.institutionalFlowYesterdayError,
        whaleRadarData: currentMarketState.whaleRadarData,
        isWhaleRadarLoading: currentMarketState.isWhaleRadarLoading,
        whaleRadarError: currentMarketState.whaleRadarError,
        execAlphaBrief: currentMarketState.execAlphaBrief,
        isBriefLoading: currentMarketState.isBriefLoading,
        dbError,
        clearDbError: () => setDbError(null),
        handleSearch,
        loadMarketHealth,
        handleGoHome,
        handleViewCompletedResult,
        handleDismissCompletedAnalysis,
        handleCancelAnalysis,
        handleUpdateUserNote,
        removeFromWatchlistHistory,
        handleViewAnalysisFromHistory,
        handleFetchInstitutionalFlow,
        handleFetchInstitutionalFlowYesterday,
        handleFetchWhaleRadarData,
    };
}
