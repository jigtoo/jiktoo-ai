
import React, { useEffect, useState, useCallback } from 'react';
import {
    BrowserRouter as Router,
    Routes,
    Route,
    Link,
    useLocation,
    useNavigate,
    Navigate, // Added
    NavLink, // Added
    Outlet // Added
} from 'react-router-dom';

import { toastService } from './services/ToastService';
import { scannerHub } from './services/discovery/ScannerHubService';

// FIX: Updated all internal imports to use relative paths
import { useDiscovery } from './hooks/useDiscovery';
import { usePortfolio } from './hooks/usePortfolio';
import { useAITrader } from './hooks/useAITrader';
import { useTenbagger } from './hooks/useTenbagger';
import { useCommunity } from './hooks/useCommunity';
import { useStrategy } from './hooks/useStrategy';
import { usePortfolioChat } from './hooks/usePortfolioChat';
import { useTradingPlaybook } from './hooks/useTradingPlaybook';
import { useAIEvolution } from './hooks/useAIEvolution';
import { useChartPatternScreener } from './hooks/useChartPatternScreener';
import { useMaterialRadar } from './hooks/useMaterialRadar';
import { useAIQuantScreener } from './hooks/useAIQuantScreener'; // NEW: AI Quant Hook

import { useBFLScanner } from './hooks/useBFLScanner';
import { useMemoir } from './hooks/useMemoir';
import { useAlphaEngine } from './hooks/useAlphaEngine';
import { marketRegimeService } from './services/MarketRegimeService'; // FIX: Added import
import { useUserWatchlist } from './hooks/useUserWatchlist';
import { useDayTrader } from './hooks/useDayTrader';
import { useStrategyLab } from './hooks/useStrategyLab';
import { useStrategyLibrary } from './hooks/useStrategyLibrary';
import { useRiskDashboard } from './hooks/useRiskDashboard';
import { useOperatorConsole } from './hooks/useOperatorConsole';
import { useGlobalSignalMonitor } from './hooks/useGlobalSignalMonitor';
import { useAlphaLink } from './hooks/useAlphaLink';
import { useValuePivotScreener } from './hooks/useValuePivotScreener';
import { useAlphaCore } from './hooks/useAlphaCore';
import { useSupplyEagle } from './hooks/useSupplyEagle';
import { useSmartMoneyCycle } from './hooks/useSmartMoneyCycle';
import { useProgramTrading } from './hooks/useProgramTrading';
// NEW: Advanced Strategies (Phase 1)
import { useSMCScanner } from './hooks/useSMCScanner';
import { useVolatilityBreakout } from './hooks/useVolatilityBreakout';
import { useAnchoredVWAP } from './hooks/useAnchoredVWAP';
import { useMarketLogic } from './hooks/useMarketLogic';
import { advancedStrategiesScheduler } from './services/schedulers/AdvancedStrategiesScheduler';


import type {
    AnalysisResult, PortfolioItem, MarketTarget, BuyPlan, ProxyStatus,
    StrategyPlaybook, InvestmentPersona, ActiveSignal, WatchlistHistoryItem,
    AlphaEngineSources, UserStrategy,
    // FIX: Import ExecAlphaBrief type for use in Layout component props.
    ExecAlphaBrief,
    MarketRegime, // NEW: Import type
    MarketRegimeAnalysis,
    MarketHealth,
} from './types';

import {
    LogoIcon, HomeIcon, PortfolioIcon, HelpIcon, AITradingLabIcon, RocketIcon, CommunityIcon,
    StrategyIcon, TradingPlaybookIcon, AIEvolutionIcon, CrosshairIcon, RadarIcon,
    FireIcon, RefreshIcon, ClosingBellIcon, DataFeedIcon, ShieldCheckIcon, ArchiveBoxIcon,
    BrainIcon, TimerIcon, BeakerIcon, ToolboxIcon, HandshakeIcon, MagnifyingGlassIcon, BriefcaseIcon, DayTradeIcon, FoundationIcon,
    GlobeIcon // Added GlobeIcon
} from './components/icons';



import { AppGuide } from './components/AppGuide';
import { GlobalAnalysisStatusBar } from './components/GlobalAnalysisStatusBar';
import { AnalysisSnapshotModal } from './components/AnalysisSnapshotModal';
import { AITraderDiagnosisModal } from './components/AITraderDiagnosisModal';
import { AddPositionForm } from './components/AddPositionForm';
import { MarketSwitcher } from './components/MarketSwitcher';
import { KiwoomBridgeStatusIndicator } from './components/KiwoomBridgeStatusIndicator'; // Renamed import
import { SUPABASE_URL, IS_KIWOOM_BRIDGE_ENABLED, KIWOOM_BRIDGE_URL, IS_KIS_PROXY_ENABLED, KIS_PROXY_URL, IS_SUPABASE_ENABLED, IS_GEMINI_ENABLED } from './config';
import { kiwoomBridgeService } from './services/kiwoomBridgeService'; // Import Kiwoom Bridge service
import { AIBriefingModal } from './components/AIBriefingModal';
import { TelegramSubscriptionModal } from './components/TelegramSubscriptionModal';
import { DataConnectionTester } from './components/DataConnectionTester';
import { ExecAlphaBriefBanner } from './components/ExecAlphaBriefBanner';
import { MarketRegimeIndicator } from './components/MarketRegimeIndicator';
import HubLayout from './components/HubLayout';

import { PortfolioDashboard } from './components/PortfolioDashboard';
import { ShadowDashboard } from './components/ShadowDashboard';
import { TenbaggerDashboard } from './components/TenbaggerDashboard';
import { CommunityPlaza } from './components/CommunityPlaza';
import { StrategyBriefingDashboard } from './components/StrategyBriefing';
import { TradingPlaybookDashboard } from './components/SuccessStories';
import { EnhancedResultsDisplay } from './components/EnhancedResultsDisplay';
import { PortfolioChatbot } from './components/PortfolioChatbot';
import { AIEvolutionDashboard } from './components/AIEvolutionDashboard';
// import { BFLScannerDashboard } from './components/BFLScannerDashboard'; // Removed
import { MemoirDashboard } from './components/MemoirDashboard';
import { ScannerHubDashboard } from './components/ScannerHubDashboard';
import { DiscoveryHubDashboard } from './components/DiscoveryHubDashboard'; // Renamed DiscoveryPage
import { StrategyStudio } from './components/StrategyStudio';
import { StrategyLibraryDashboard } from './components/StrategyLibraryDashboard';
import { RiskDashboard } from './components/RiskDashboard';
import { OperatorConsoleDashboard } from './components/OperatorConsoleDashboard';
import { RealtimeTradingRoom } from './components/RealtimeTradingRoom';

import { ToastNotification, ToastMessage } from './components/ToastNotification';
import { MegatrendDashboard } from './components/MegatrendDashboard';
import { OracleBrief } from './components/OracleBrief';
import { TimeMachinePage } from './components/TimeMachinePage';

import { supabase } from './services/supabaseClient';
import { getMarketSessionState } from './services/utils/dateUtils';
import { kisWebSocketService } from './services/KisWebSocketService';
import { autonomousScheduler } from './services/AutonomousScheduler';
import { autoPilotController } from './services/AutoPilotController';
import { megatrendScheduler } from './services/schedulers/MegatrendScheduler';
import { morningBriefingScheduler } from './services/schedulers/MorningBriefingScheduler';


// -----------------------------
// 초기화 UI 컴포넌트
// -----------------------------
const FullscreenShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div style={{
        backgroundColor: '#111827', color: 'white', padding: '2rem',
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto',
        height: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', lineHeight: 1.6
    }}>
        {children}
    </div>
);

const InitLoading: React.FC = () => (
    <FullscreenShell>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#60a5fa' }}>
            직투 초기화 중…
        </h1>
        <p style={{ marginTop: '0.75rem', color: '#9ca3af' }}>
            안전한 연결을 준비하고 있습니다. 잠시만 기다려주세요.
        </p>
    </FullscreenShell>
);

const InitError: React.FC<{ message: string }> = ({ message }) => (
    <FullscreenShell>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f87171' }}>Authentication Error</h1>
        <p style={{ marginTop: '1rem', color: '#fca5a5', backgroundColor: '#372a2a', padding: '0.5rem 1rem', borderRadius: '0.5rem' }}>
            Error: {message}
        </p>
        <div style={{
            marginTop: '2rem', backgroundColor: '#1f2937', padding: '1.5rem', borderRadius: '0.5rem',
            border: '1px solid #374151', maxWidth: 640, textAlign: 'left'
        }}>
            <p style={{ fontWeight: 700, color: '#60a5fa', fontSize: '1.1rem' }}>[필수 설정] 해결 방법:</p>
            <ol style={{ marginTop: '1rem', color: '#d1d5db', paddingLeft: '1.5rem', listStyleType: 'decimal' }}>
                <li style={{ marginBottom: '0.5rem' }}>Supabase 프로젝트 대시보드로 이동하세요.</li>
                <li style={{ marginBottom: '0.5rem' }}><strong>Authentication</strong> &gt; <strong>Providers</strong>로 이동하세요.</li>
                <li style={{ marginBottom: '0.5rem' }}><strong>User Signups</strong> 섹션의 <strong>Allow anonymous sign-ins</strong>를 <strong>ON</strong>으로 설정하세요.</li>
            </ol>
            <p style={{ marginTop: '1.5rem', fontSize: '0.9rem', color: '#9ca3af' }}>
                이 설정이 꺼져 있으면 앱이 데이터베이스에 접속할 수 없어 작동하지 않습니다. 설정 후 페이지를 새로고침 해주세요.
            </p>
        </div>
    </FullscreenShell>
);

// -----------------------------
// Outer App: "선 인증, 후 실행" 보장
// -----------------------------
import { LoginPage } from './components/LoginPage'; // Added import
import { AccessControlPage } from './components/AccessControlPage'; // Added import

const App: React.FC = () => {
    // Phase: initializing -> checks session
    // ready -> session active, render app
    // unauthenticated -> session missing, render login
    // pending_approval -> session active, but not approved in DB
    // error -> unexpected error
    const [phase, setPhase] = useState<'initializing' | 'ready' | 'unauthenticated' | 'pending_approval' | 'error'>('initializing');
    const [initError, setInitError] = useState<string | null>(null);
    const [currentUserEmail, setCurrentUserEmail] = useState<string>('');

    useEffect(() => {
        if (!supabase) {
            setPhase('ready'); // Supabase가 비활성화된 경우 바로 앱을 실행
            return;
        }

        let cancelled = false;

        const checkAccessControl = async (email: string) => {
            try {
                // 1. Check if user exists in allowed_users
                const { data, error } = await supabase
                    .from('allowed_users')
                    .select('is_approved')
                    .eq('email', email)
                    .single();

                if (error && error.code === 'PGRST116') {
                    // Not found -> Insert request
                    await supabase
                        .from('allowed_users')
                        .insert([{ email, is_approved: false }] as any);

                    if (!cancelled) {
                        setCurrentUserEmail(email);
                        setPhase('pending_approval');
                    }
                    return;
                }

                if (data) {
                    const userStatus = data as { is_approved: boolean };
                    if (userStatus.is_approved) {
                        if (!cancelled) setPhase('ready');
                    } else {
                        if (!cancelled) {
                            setCurrentUserEmail(email);
                            setPhase('pending_approval');
                        }
                    }
                } else if (!cancelled && error?.code !== 'PGRST116') {
                    // [Fix] Handle real DB errors (e.g. table not found)
                    throw error || new Error('Unknown Access Control Error');
                }
            } catch (err: any) {
                console.error('Access control check failed:', err);
                if (!cancelled) {
                    // Show error instead of pending, so user knows if table is missing
                    const msg = err?.message || 'Access Check Failed';
                    // If error is "relation public.allowed_users does not exist", help user
                    if (msg.includes('does not exist')) {
                        setInitError(`DB Error: 'allowed_users' table missing. Run the SQL script!`);
                    } else {
                        setInitError(`Access Error: ${msg}`);
                    }
                    setPhase('error');
                }
            }
        };

        const ensureAuth = async () => {
            console.log('[App] Auth Check Started...'); // Debug

            // Fail-safe timeout
            const timeoutId = setTimeout(() => {
                if (!cancelled) {
                    // Silent - Auth check timeout is handled gracefully
                    // console.log('[App] Auth check timeout - retrying...');
                    localStorage.clear();
                    setPhase('unauthenticated');
                    setInitError('Authentication check timed out. Please try again.');
                }
            }, 5000);

            try {
                // 1. Supabase 클라이언트가 localStorage에서 세션을 자동으로 복원하도록 먼저 시도합니다.
                const { data: { session: initialSession }, error: sessionError } = await (supabase.auth as any).getSession();

                clearTimeout(timeoutId); // Clear timeout on success
                console.log('[App] Session retrieved:', initialSession ? 'Yes' : 'No', 'Error:', sessionError);

                if (sessionError) {
                    // 세션 에러가 나면 로그인을 다시 하도록 유도
                    console.warn('Session check failed, requiring login:', sessionError);
                    if (!cancelled) setPhase('unauthenticated');
                    return;
                }

                if (initialSession && initialSession.user) {
                    if (initialSession.user.email) {
                        // 세션이 있으면 접근 권한 확인
                        console.log('[App] Checking access for:', initialSession.user.email);
                        await checkAccessControl(initialSession.user.email);
                        return;
                    } else {
                        // Anonymous or invalid user found - Force logout
                        console.warn('[App] Invalid or anonymous user found. Signing out.');
                        await supabase.auth.signOut();
                        if (!cancelled) setPhase('unauthenticated');
                        return;
                    }
                }

                // 2. 세션이 없으면 로그인 페이지로 보냅니다. (자동 익명 로그인 제거됨)
                console.log('[App] No session found. Going to Login.');
                if (!cancelled) setPhase('unauthenticated');

            } catch (e: any) {
                clearTimeout(timeoutId);
                console.error('[App] EnsureAuth Error:', e);
                if (!cancelled) {
                    const message = e?.message || e?.error_description || (typeof e === 'object' && e !== null ? JSON.stringify(e, Object.getOwnPropertyNames(e), 2) : String(e));
                    setInitError(message);
                    setPhase('error');
                }
            }
        };

        ensureAuth();

        // Initialize autonomous trading system
        const initAutonomousSystem = async () => {
            try {
                console.log('[App] Initializing autonomous trading system...');

                // Connect KIS WebSocket (kis-proxy handles authentication)
                await kisWebSocketService.connect();

                // Start Autonomous Scheduler
                autonomousScheduler.start('KR'); // Default to KR market

                // Start Megatrend Scheduler (monthly analysis)
                megatrendScheduler.start();

                // Start AI Auto-Pilot Controller (auto-trading based on market regime)
                autoPilotController.start();

                // Start Morning/Closing Briefing Scheduler
                morningBriefingScheduler.start();

                // Start Playbook Scheduler (AI learning from historical success stories)
                const { playbookScheduler } = await import('./services/schedulers/PlaybookScheduler');
                playbookScheduler.start();

                // [Fix] Start System Command Listener (Remote Control)
                const { systemCommandListener } = await import('./services/SystemCommandListener');
                await systemCommandListener.start();

                console.log('[App] Autonomous trading system initialized successfully!');
            } catch (error) {
                console.error('[App] Error initializing autonomous system:', error);
            }
        };

        // Note: Autonomous system runs regardless of UI login state, as it's a backend-like service.
        // However, if it depends on Supabase, it might need auth. 
        // For now, we initialize it. Ideally it should wait for auth if it writes to DB.
        // But since we removed auto-anon login, we rely on persisited session or user logging in.
        // Let's keep it here.
        initAutonomousSystem();

        const { data: sub } = (supabase.auth as any).onAuthStateChange(async (event: any, session: any) => {
            if (event === 'SIGNED_OUT') {
                // 사용자가 명시적으로 로그아웃한 경우, 로그인 화면으로 이동
                localStorage.clear(); // Clear local state too
                setPhase('unauthenticated');
                setInitError(null);
            } else if (event === 'SIGNED_IN' && session && session.user.email) {
                // 로그인 시 권한 재확인
                await checkAccessControl(session.user.email);
            }
        });

        return () => {
            cancelled = true;
            sub?.subscription?.unsubscribe?.();
        };
    }, []);

    const handleLoginSuccess = () => {
        // Login success triggers onAuthStateChange -> checkAccessControl
        // So we don't strictly need to do anything here, but for safety:
        // window.location.reload(); 
    };

    if (phase === 'initializing') return <InitLoading />;
    if (phase === 'error') return <InitError message={initError ?? 'Unknown error'} />;
    if (phase === 'unauthenticated') return <LoginPage onLoginSuccess={handleLoginSuccess} />;
    if (phase === 'pending_approval') return <AccessControlPage email={currentUserEmail} />;

    return <InnerApp />;
};


// -----------------------------
// Inner App: 인증 후에만 렌더링되는 실제 앱
// -----------------------------
const InnerApp: React.FC = () => {
    const [marketTarget, setMarketTarget] = useState<MarketTarget>('KR');
    const [persona, setPersona] = useState<InvestmentPersona>('Balanced');

    const [bridgeStatus, setBridgeStatus] = useState<ProxyStatus>('connecting'); // Renamed from proxyStatus
    const [bridgeError, setBridgeError] = useState<string | null>(null); // Renamed from proxyError

    const [isFullRefreshLoading, setIsFullRefreshLoading] = useState(false);
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    const addToast = (type: 'success' | 'error' | 'info' | 'warning', message: string, duration = 3000) => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts(prev => [...prev, { id, type, message, duration }]);
    };

    const removeToast = (id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };



    // ...

    // [New] Global Event Observer (Decoupled Notification System)
    useEffect(() => {
        // 1. Toast Bus
        const sub1 = toastService.toast$.subscribe(event => {
            addToast(event.type, event.message, event.duration);
        });

        // 2. Scanner Hub Events
        const sub2 = scannerHub.event$.subscribe(event => {
            if (event.type === 'SCAN_START') addToast('info', `[Discovery] ${event.market} 시장 전체 스캔 시작...`);
            if (event.type === 'SCAN_COMPLETE') addToast('success', `[Discovery] 스캔 완료! ${event.count}개 종목 포착`);
            if (event.type === 'SCAN_ERROR') addToast('error', `[Discovery] 스캔 중 오류 발생: ${event.error}`);
        });

        // 3. Morning Briefing Events
        const sub3 = morningBriefingScheduler.event$.subscribe(event => {
            const marketName = event.market === 'KR' ? '한국' : '미국';
            if (event.type === 'BRIEFING_START') addToast('info', `[Auto-Pilot] ${marketName} 모닝 브리핑 생성 시작...`);
            if (event.type === 'BRIEFING_COMPLETE') addToast('success', `[Auto-Pilot] ${marketName} 모닝 브리핑 전송 완료!`);
            if (event.type === 'BRIEFING_ERROR') addToast('error', `[Auto-Pilot] 브리핑 생성 실패 (로그 확인)`);
        });

        return () => {
            sub1.unsubscribe();
            sub2.unsubscribe();
            sub3.unsubscribe();
        };
    }, []);

    const [isSnapshotModalOpen, setIsSnapshotModalOpen] = useState(false);
    const [viewingSnapshot, setViewingSnapshot] = useState<AnalysisResult | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Partial<PortfolioItem> | null>(null);
    const [aiRecommendationForForm, setAiRecommendationForForm] = useState<{ buyPlan: BuyPlan; reason: string } | null>(null);
    const [isTelegramModalOpen, setIsTelegramModalOpen] = useState(false);
    const [subscribingSignal, setSubscribingSignal] = useState<StrategyPlaybook | null>(null);
    const navigate = useNavigate();
    const location = useLocation();

    // --- Hooks ---
    // FIX: Reorder hook calls so that useStrategyLibrary is called before useAlphaEngine.
    const strategyLibrary = useStrategyLibrary(marketTarget); // Moved up
    const { activeUserStrategies } = strategyLibrary; // Destructure after definition

    useGlobalSignalMonitor(); // Activate the global background signal monitor
    const userWatchlist = useUserWatchlist(marketTarget);
    const discovery = useDiscovery(marketTarget);
    const bflScanner = useBFLScanner(marketTarget);

    const materialRadar = useMaterialRadar(marketTarget);
    const patternScreener = useChartPatternScreener(marketTarget);
    const supplyEagle = useSupplyEagle(marketTarget); // MOVED UP
    const aiQuantScreener = useAIQuantScreener(marketTarget); // NEW: AI Quant Screener

    const alphaLink = useAlphaLink(
        marketTarget,
        userWatchlist.watchlistItems,
        bflScanner.signals,
        materialRadar.detectedMaterials,
        patternScreener.results,
        supplyEagle.results, // FIX: Changed .signals to .results
        aiQuantScreener.results // NEW: Added
    ); // Activate the Alpha-Link listener and capture its state

    // ----------------------------------------------------------------------------------
    // [RACE CONDITION FIX] 중앙 통제 시스템: 'isReadyForAnalysis'
    // 모든 AI 엔진은 이 상태가 될 때까지 실행되지 않습니다.
    // ----------------------------------------------------------------------------------
    const [isReadyForAnalysis, setIsReadyForAnalysis] = useState(false);

    useEffect(() => {
        setIsReadyForAnalysis(!userWatchlist.isLoading);
    }, [userWatchlist.isLoading]);

    // FIX: Auto-load Market Regime on mount to prevent infinite loading
    const [marketRegimeStatus, setMarketRegimeStatus] = useState<any>(null);

    useEffect(() => {
        const loadRegime = async () => {
            try {
                const status = await marketRegimeService.analyzeCurrentRegime(marketTarget);
                setMarketRegimeStatus(status);
            } catch (error) {
                console.error('[App] Failed to load market regime:', error);
            }
        };
        loadRegime();

        // Refresh every 30 minutes
        const interval = setInterval(loadRegime, 1000 * 60 * 30);
        return () => clearInterval(interval);
    }, [marketTarget]);

    // DEPRECATED: Use direct marketRegimeStatus instead of discovery.marketHealth
    const marketRegimeAnalysis: MarketRegimeAnalysis | null = marketRegimeStatus
        ? {
            regime: marketRegimeStatus.regime as MarketRegime,
            summary: `Score: ${marketRegimeStatus.score} | Exposure: ${(marketRegimeStatus.recommendedExposure * 100).toFixed(0)}%`,
        }
        : null;


    const portfolio = usePortfolio(marketTarget);
    const aiTrader = useAITrader(marketTarget, discovery.marketHealth, []);
    const tenbagger = useTenbagger(marketTarget);
    const community = useCommunity(marketTarget);
    const strategy = useStrategy(marketTarget);
    const playbook = useTradingPlaybook(marketTarget);
    const portfolioChat = usePortfolioChat(marketTarget, portfolio.portfolioItems, portfolio.analysis, portfolio.overview);
    const aiEvolution = useAIEvolution();
    const memoir = useMemoir(marketTarget);
    const dayTrader = useDayTrader(marketTarget, userWatchlist.watchlistItems, isReadyForAnalysis);
    const strategyLab = useStrategyLab(marketTarget);
    const riskDashboard = useRiskDashboard(marketTarget, portfolio.portfolioItems);
    const operatorConsole = useOperatorConsole();
    const valuePivotScreener = useValuePivotScreener(marketTarget, userWatchlist.watchlistItems);

    const smartMoneyCycle = useSmartMoneyCycle(marketTarget);
    const programTrading = useProgramTrading(marketTarget);

    const alphaCore = useAlphaCore(marketTarget);

    // NEW: Advanced Strategies (Phase 1)
    const smcScanner = useSMCScanner(marketTarget);
    const volatilityBreakout = useVolatilityBreakout(marketTarget);
    const anchoredVWAP = useAnchoredVWAP(marketTarget);
    const oracle = useMarketLogic(marketTarget); // NEW: Oracle Logic Engine

    // NEW: Pass marketRegimeAnalysis to alphaEngine
    // FIX: Pass discovery.marketHealth as the 7th argument to useAlphaEngine to match its definition.
    // --- Alpha Engine (The Brain) ---
    const alphaEngine = useAlphaEngine(
        marketTarget,
        persona,
        {
            watchlist: userWatchlist.watchlistItems,
            bflSignals: bflScanner.signals,
            materials: materialRadar.detectedMaterials,
            patterns: patternScreener.results,
            supplyEagleSignals: null, // Placeholder
            lateSurgeSignals: null, // Placeholder
            shakeoutSignals: null, // Placeholder
            distributionSignals: null, // Placeholder
            programFlow: null, // Placeholder
            // NEW: Advanced Strategies (Phase 1)
            smcSignals: smcScanner.signals,
            anchoredVWAPs: anchoredVWAP.vwaps,
            volatilityBreakouts: volatilityBreakout.breakouts,
            logicChains: oracle.logicChains // NEW: Oracle Logic Chains 연결
        },
        isReadyForAnalysis,
        activeUserStrategies,
        marketRegimeAnalysis,
        discovery.marketHealth
    );

    const sessionState = getMarketSessionState(marketTarget);

    // FIX: Integrate KIS Proxy health check logic into a proper useEffect hook.
    useEffect(() => {
        const checkKisProxy = async () => {
            if (!IS_KIS_PROXY_ENABLED) {
                setBridgeStatus('error');
                setBridgeError('KIS Proxy is disabled in configuration');
                return;
            }

            try {
                setBridgeStatus('connecting');
                const response = await fetch(`${KIS_PROXY_URL}/health`, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' }
                });

                if (response.ok) {
                    setBridgeStatus('connected');
                    setBridgeError(null);
                    console.log('[KIS Proxy] Connection successful');
                } else {
                    throw new Error(`HTTP ${response.status}`);
                }
            } catch (error: any) {
                // Silent error - KIS Proxy is optional
                // console.log('[KIS Proxy] Optional service not available:', error.message);
                setBridgeStatus('error');
                setBridgeError(error.message || 'Connection failed');
            }
        };

        checkKisProxy();
        const intervalId = setInterval(checkKisProxy, 30000); // Check every 30 seconds

        return () => clearInterval(intervalId);
    }, []);

    // NEW: 고급 전략 자동 스캔 스케줄러 시작
    useEffect(() => {
        // 관심종목이 로드되면 스케줄러 설정 업데이트
        if (userWatchlist.watchlistItems.length > 0) {
            advancedStrategiesScheduler.updateConfig({
                marketTarget,
                watchlist: userWatchlist.watchlistItems.map(item => item.ticker)
            });

            // 스케줄러 시작
            advancedStrategiesScheduler.start();
            console.log('[고급 전략 스케줄러] 시작됨');
        }

        return () => {
            // 컴포넌트 언마운트 시 스케줄러 중지
            advancedStrategiesScheduler.stop();
        };
    }, [marketTarget, userWatchlist.watchlistItems]);

    // Automatic Market Switching based on Time (DISABLED per user feedback: interference with manual switch)
    /*
    useEffect(() => {
        const checkMarketTime = () => {
            const now = new Date();
            const kstTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
            const hours = kstTime.getHours();

            let target: MarketTarget = 'KR';
            // US Market Active: 22:00 ~ 08:00 (Next day)
            // KR Market Active: 08:00 ~ 22:00
            if (hours >= 22 || hours < 8) {
                target = 'US';
            } else {
                target = 'KR';
            }

            setMarketTarget(prev => {
                if (prev !== target) {
                    console.log(`[Auto Switch] Switching Market to ${target} based on time (${hours}h)`);
                    return target;
                }
                return prev;
            });
        };

        checkMarketTime(); // Check immediately
        const interval = setInterval(checkMarketTime, 60000); // Check every minute

        return () => clearInterval(interval);
    }, []);
    */

    const handleViewSnapshot = (analysis: AnalysisResult) => { setViewingSnapshot(analysis); setIsSnapshotModalOpen(true); };
    const handleOpenPortfolioForm = (item?: Partial<PortfolioItem> | null) => { setEditingItem(item || null); setAiRecommendationForForm(null); setIsFormOpen(true); };
    // FIX: Explicitly accept a third optional argument (_event?: any) to `handleOpenPortfolioFormFromAnalysis` to resolve an argument count mismatch.
    const handleOpenPortfolioFormFromAnalysis = useCallback((analysis: AnalysisResult, isAiGuided: boolean, _event?: any) => {
        const { ticker, stockName, synthesis } = analysis;
        const formInitialData: Partial<PortfolioItem> = { ticker, stockName };
        if (isAiGuided && synthesis?.buyPlan) setAiRecommendationForForm({ buyPlan: synthesis.buyPlan, reason: synthesis.finalVerdict.reason });
        else setAiRecommendationForForm(null);
        setEditingItem(formInitialData);
        setIsFormOpen(true);
        // FIX: The handleSavePosition function from `usePortfolio` expects `PortfolioItem` and `portfolioCash` as arguments.
        // It's not suitable to be directly called here as it's meant for the form's onSubmit.
        // Removed `portfolio.handleSavePosition` as it causes a type mismatch and `handleOpenPortfolioFormFromAnalysis`
        // This will be done in separate step after viewing file
        navigate('/assets');
    }, [setAiRecommendationForForm, setEditingItem, setIsFormOpen, navigate]);
    const handleExecuteSignal = (signal: ActiveSignal) => {
        const { ticker, stockName, tradingPlan } = signal;
        const formInitialData: Partial<PortfolioItem> = { ticker, stockName };
        const buyPlan: BuyPlan = {
            // FIX: Removed .toFixed(2) as parseFloat already returns a number, and .toFixed(2) returns a string.
            recommendedPrice: parseFloat(tradingPlan.entryPrice.replace(/[^0-9.]/g, '')),
            stopLossPrice: parseFloat(tradingPlan.stopLoss.replace(/[^0-9.]/g, '')),
            firstTargetPrice: parseFloat(tradingPlan.targets[0].replace(/[^0-9.]/g, '')),
            secondTargetPrice: tradingPlan.targets[1] ? parseFloat(tradingPlan.targets[1].replace(/[^0-9.]/g, '')) : null,
            positionSizing: tradingPlan.positionSizing,
        };
        setAiRecommendationForForm({ buyPlan, reason: tradingPlan.planRationale });
        setEditingItem(formInitialData);
        setIsFormOpen(true);
        navigate('/assets');
    };
    const handleCloseForm = () => { setIsFormOpen(false); setEditingItem(null); setAiRecommendationForForm(null); };
    const handleOpenTelegramModal = (signal?: StrategyPlaybook | null) => { setSubscribingSignal(signal || null); setIsTelegramModalOpen(true); };
    const handleCloseTelegramModal = () => { setIsTelegramModalOpen(false); setSubscribingSignal(null); };
    const handleFullDataRefresh = useCallback(async () => {
        if (isFullRefreshLoading) return;

        if (!IS_GEMINI_ENABLED) {
            addToast('error', 'Gemini API 키가 설정되지 않았습니다. .env 파일을 확인해주세요.');
            return;
        }

        setIsFullRefreshLoading(true);
        addToast('info', '전체 데이터 새로고침을 시작합니다...', 2000);

        // [RATE LIMIT FIX] Run refresh tasks sequentially to avoid overwhelming APIs.
        const refreshTasks = [
            { name: 'Market Health & Briefing', task: () => discovery.loadMarketHealth(marketTarget) },
            { name: 'Alpha Engine', task: () => alphaEngine.onRunEngine(true) },
            { name: 'BFL Scanner', task: () => bflScanner.handleScan() },

            { name: 'Material Radar', task: () => materialRadar.handleScan() },
            { name: 'Pattern Screener', task: () => patternScreener.runScan() },
            { name: 'Tenbagger Club', task: () => tenbagger.onFetch() },
            { name: 'Strategy Briefing', task: () => strategy.onFetch() },
            { name: 'Trading Playbook', task: () => playbook.onRefresh() },
            // FIX: Portfolio analysis now takes only 2 arguments: items and cash
            { name: 'Portfolio Analysis', task: () => portfolio.handleFetchPortfolioAnalysis(portfolio.portfolioItems, portfolio.portfolioCash) },
            // FIX: Added type assertion to resolve 'Property 'handleScan' does not exist on type 'void'.'
            { name: 'Day Trader', task: () => (dayTrader as ReturnType<typeof useDayTrader>).handleScan() },
            { name: 'Supply Eagle', task: () => supplyEagle.runScan() },
        ];

        let successCount = 0;
        let failCount = 0;

        for (const { name, task } of refreshTasks) {
            try {
                await task();
                successCount++;
            } catch (error) {
                console.error(`[Full Refresh] Task "${name}" failed, continuing to next...`, error);
                failCount++;
            }
        }

        setIsFullRefreshLoading(false);
        if (failCount === 0) {
            addToast('success', '모든 데이터가 성공적으로 갱신되었습니다.');
        } else {
            addToast('warning', `${successCount}개 성공, ${failCount}개 실패. (콘솔 확인)`);
        }
    }, [isFullRefreshLoading, marketTarget, discovery, alphaEngine, bflScanner, materialRadar, patternScreener, tenbagger, strategy, playbook, portfolio, dayTrader, supplyEagle]);

    // Updated main content logic
    const handleSelectStock = (ticker: string, rationale: string, stockName: string) => {
        discovery.handleSearch(ticker, rationale, stockName);
    };

    // [NAVIGATION FIX] Automatically redirect to Home when an analysis result is loaded from history or search
    useEffect(() => {
        // If we have a result, and we are NOT on the home page (where results are shown), go to home.
        if (discovery.analysisResult && location.pathname !== '/') {
            navigate('/');
        }
    }, [discovery.analysisResult, location.pathname, navigate]);

    return (
        <>
            {!IS_SUPABASE_ENABLED && (
                <div style={{ backgroundColor: 'rgb(220, 38, 38)', color: 'white', padding: '12px', textAlign: 'center', fontSize: '14px', fontWeight: 'bold', position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999 }}>
                    [설정 필요] Supabase 연결 정보가 없습니다. 'copy-of-sepa-ai/config.ts' 파일을 열어 당신의 프로젝트 정보로 수정해주세요.
                </div>
            )}
            <Routes>
                <Route path="strategy-lab-v2" element={<StrategyStudio marketTarget={marketTarget} marketStatus={discovery.marketHealth?.status} />} />
                <Route path="/" element={<Layout
                    marketTarget={marketTarget} handleMarketChange={setMarketTarget}
                    isLoading={discovery.analysisStatus === 'loading' || alphaEngine.isPlaybookLoading}
                    bridgeStatus={bridgeStatus} bridgeError={bridgeError} // Renamed to bridgeStatus/bridgeError
                    onFullDataRefresh={handleFullDataRefresh} isFullRefreshLoading={isFullRefreshLoading}
                    persona={persona} onPersonaChange={setPersona}
                    sessionLabel={sessionState.label}
                    execAlphaBrief={discovery.execAlphaBrief}
                    isBriefLoading={discovery.isBriefLoading}
                    marketRegime={marketRegimeAnalysis} // NEW: Pass derived regime to Layout
                    marketRegimeStatus={marketRegimeStatus} // FIX: Pass status for MarketReg imeIndicator
                />}>
                    <Route index element={
                        discovery.analysisResult ? (
                            <EnhancedResultsDisplay
                                result={discovery.analysisResult}
                                onOpenFormForAnalysis={handleOpenPortfolioFormFromAnalysis}
                                onUpdateUserNote={discovery.handleUpdateUserNote}
                                onGoHome={discovery.handleGoHome}
                                marketTarget={marketTarget}
                                onSubscribeTelegram={(ticker, stockName) => handleOpenTelegramModal({ id: `${ticker}-Watcher`, ticker, stockName, strategyName: '기타', strategySummary: '트리거 워처 실시간 모니터링', aiConfidence: 90, keyLevels: { entry: '분석 참조', stopLoss: '분석 참조', target: '분석 참조' }, analysisChecklist: [], isUserRecommended: true, addedAt: new Date().toISOString(), strategyType: 'SwingTrade' })}
                            />
                        ) : (
                            <Navigate to="/discovery" replace />
                        )
                    } />

                    <Route path="trading-room" element={<RealtimeTradingRoom dayTrader={dayTrader} marketTarget={marketTarget} />} />
                    <Route path="shadow" element={<ShadowDashboard marketTarget={marketTarget} />} />

                    {/* --- Integrated Hub Routes --- */}
                    {/* FIX: Pass missing onRefresh and onOpenForm props to PortfolioDashboard */}
                    <Route path="assets" element={<PortfolioDashboard
                        {...portfolio}
                        onRefresh={portfolio.onRefresh}
                        onOpenForm={handleOpenPortfolioForm}
                        riskDashboardData={riskDashboard}
                        onSelectStock={handleSelectStock} // Use the new common handler
                        marketTarget={marketTarget}
                    />} />

                    {/* NEW: Consolidated Scanner Hub */}
                    <Route path="scanner-hub" element={<ScannerHubDashboard
                        marketTarget={marketTarget}
                        valuePivotScreener={valuePivotScreener}
                        supplyEagle={supplyEagle}
                        bflScanner={bflScanner}
                        materialRadar={materialRadar}
                        patternScreener={patternScreener}
                        onSelectStock={handleSelectStock}
                    />} />

                    {/* NEW: Discovery Hub */}
                    <Route path="/discovery" element={<DiscoveryHubDashboard
                        marketTarget={marketTarget}
                        alphaLink={alphaLink}
                        alphaCore={alphaCore}
                        discovery={discovery}
                        userWatchlist={userWatchlist}
                        aiQuantScreener={aiQuantScreener} // NEW: Prop passed
                    />} />

                    {/* Deprecated Individual Routes (Redirect or Keep/Hidden if needed for links) */}
                    <Route path="value-pivot" element={<Navigate to="/scanner-hub" replace />} />
                    <Route path="supply-eagle" element={<Navigate to="/scanner-hub" replace />} />
                    <Route path="bfl-scanner" element={<Navigate to="/scanner-hub" replace />} />
                    <Route path="material-radar" element={<Navigate to="/scanner-hub" replace />} />
                    <Route path="pattern-screener" element={<Navigate to="/scanner-hub" replace />} />
                    <Route path="coin-scanner" element={<Navigate to="/" replace />} /> {/* Dead Route */}

                    <Route path="strategy-hub" element={<StrategyLibraryDashboard
                        {...strategyLibrary}
                        aiTraderData={aiTrader}
                        marketTarget={marketTarget}
                        marketStatus={discovery.marketHealth?.status}
                    />} />
                    {/* <Route path="strategy-hub/lab" element={<StrategyStudio marketTarget={marketTarget} marketStatus={discovery.marketHealth?.status} />} REMOVED for v2 consolidation */}
                    <Route path="megatrend" element={<MegatrendDashboard marketTarget={marketTarget} />} />
                    <Route path="ai-lab" element={<HubLayout title="AI 연구소" links={aiLabLinks} />} />

                    {/* --- Individual Scanner Routes (newly separated) --- */}
                    {/* Removed individual scanner routes */}
                    <Route path="time-machine" element={<TimeMachinePage marketTarget={marketTarget} />} />


                    {/* --- Legacy Redirects & Standalone --- */}
                    <Route path="discovery" element={<NavLink to="/" replace />} />
                    <Route path="my-portfolio" element={<NavLink to="/assets" replace />} />
                    <Route path="risk-dashboard" element={<NavLink to="/assets" replace />} />
                    <Route path="ai-trading-lab" element={<NavLink to="/strategy-hub" replace />} />
                    <Route path="strategy-studio" element={<NavLink to="/strategy-hub" replace />} />
                    <Route path="strategy-studio/lab" element={<StrategyStudio marketTarget={marketTarget} marketStatus={discovery.marketHealth?.status} />} />

                    <Route path="ai-evolution" element={<AIEvolutionDashboard evolutionData={aiEvolution} marketTarget={marketTarget} proxyStatus={bridgeStatus} />} />
                    <Route path="operator-console" element={<OperatorConsoleDashboard marketTarget={marketTarget} aiEvolution={aiEvolution} />} />
                    <Route path="memoir" element={<MemoirDashboard memoirData={memoir} />} />
                    <Route path="tenbagger-club" element={<TenbaggerDashboard {...tenbagger} marketTarget={marketTarget} />} />
                    <Route path="community-plaza" element={<CommunityPlaza {...community} marketTarget={marketTarget} />} />
                    <Route path="strategy-briefing" element={<StrategyBriefingDashboard {...strategy} marketTarget={marketTarget} />} />
                    <Route path="trading-playbook" element={<TradingPlaybookDashboard {...playbook} onReanalyze={(ticker, stockName) => discovery.handleSearch(ticker, undefined, stockName)} onViewSnapshot={handleViewSnapshot} />} />
                </Route>
            </Routes>
            <AnalysisSnapshotModal isOpen={isSnapshotModalOpen} onClose={() => setIsSnapshotModalOpen(false)} analysis={viewingSnapshot} marketTarget={marketTarget} />
            <AITraderDiagnosisModal isOpen={aiTrader.isDiagnosisModalOpen} onClose={() => aiTrader.setIsDiagnosisModalOpen(false)} diagnosis={aiTrader.aiDiagnosisResult} isLoading={aiTrader.isDiagnosisLoading} investmentStyle={aiTrader.activeStyle} />
            <AddPositionForm isOpen={isFormOpen} onClose={handleCloseForm} onSave={portfolio.handleSavePosition} initialData={editingItem} aiRecommendation={aiRecommendationForForm} marketTarget={marketTarget} portfolioCash={portfolio.portfolioCash} />
            {location.pathname.startsWith('/assets') && (<PortfolioChatbot {...portfolioChat} />)}
            <AIBriefingModal isOpen={portfolio.isBriefingModalOpen} onClose={portfolio.closeBriefingModal} item={portfolio.viewingBriefingItem} isLoading={portfolio.isBriefingLoading} />
            <TelegramSubscriptionModal isOpen={isTelegramModalOpen} onClose={handleCloseTelegramModal} signal={subscribingSignal} />
            <ToastNotification toasts={toasts} removeToast={removeToast} />
        </>
    );
};


const hubNavItems = [
    { path: '/', icon: MagnifyingGlassIcon, label: '탐색' },
    { path: '/assets', icon: BriefcaseIcon, label: '자산' },
    { path: '/scanner-hub', icon: RocketIcon, label: '스캐너 허브' }, // Consolidated Scanner Hub
    { path: '/megatrend', icon: GlobeIcon, label: '메가트렌드' }, // Macro-driven investment
    { path: '/strategy-hub', icon: BeakerIcon, label: '전략' },
    // { path: '/strategy-lab-v2', icon: AITradingLabIcon, label: '전략 랩 2.0' }, // Removed per user request (Duplicate)
    { path: '/ai-lab', icon: BrainIcon, label: 'AI 연구소' },
    { path: '/operator-console', icon: ToolboxIcon, label: '운영' },
    { path: '/time-machine', icon: TimerIcon, label: '블라인드 타임머신' },
];

const aiLabLinks = [
    { path: '/ai-evolution', icon: AIEvolutionIcon, label: 'AI 진화' },
    { path: '/trading-playbook', icon: TradingPlaybookIcon, label: '성공 투자 복기' },
    { path: '/community-plaza', icon: CommunityIcon, label: '커뮤니티' },
    { path: '/strategy-briefing', icon: StrategyIcon, label: '전략 전망' },
    { path: '/tenbagger-club', icon: RocketIcon, label: '텐배거 클럽' },
    { path: '/memoir', icon: ArchiveBoxIcon, label: '회고록' },
];


const PersonaSwitcher: React.FC<{
    currentPersona: InvestmentPersona;
    onPersonaChange: (persona: InvestmentPersona) => void;
}> = ({ currentPersona, onPersonaChange }) => {
    const personas: { key: InvestmentPersona; label: string }[] = [
        { key: 'Aggressive', label: '공격형' },
        { key: 'Balanced', label: '균형형' },
        { key: 'Conservative', label: '안정형' },
    ];
    const baseStyle = "flex items-center gap-2 px-3 py-2 text-sm font-bold transition-colors duration-200";
    const activeStyle = "text-white bg-purple-600/50 shadow-inner";
    const inactiveStyle = "text-gray-400 bg-gray-800/50 hover:bg-gray-700/50";

    return (
        <div className="flex p-1 bg-gray-900/50 rounded-lg">
            {personas.map((p, index) => (
                <button
                    key={p.key}
                    onClick={() => onPersonaChange(p.key)}
                    className={`${baseStyle} ${index === 0 ? 'rounded-l-md' : ''} ${index === personas.length - 1 ? 'rounded-r-md' : ''} ${currentPersona === p.key ? activeStyle : inactiveStyle}`}
                    aria-pressed={currentPersona === p.key}
                >
                    <BrainIcon className="h-4 w-4" />
                    <span className="hidden sm:inline">{p.label}</span>
                </button>
            ))}
        </div>
    );
};

const Layout: React.FC<{
    marketTarget: MarketTarget,
    handleMarketChange: (market: MarketTarget) => void,
    isLoading: boolean,
    bridgeStatus: ProxyStatus,
    bridgeError: string | null,
    onFullDataRefresh: () => void,
    isFullRefreshLoading: boolean,
    persona: InvestmentPersona,
    onPersonaChange: (persona: InvestmentPersona) => void,
    sessionLabel: string;
    execAlphaBrief: ExecAlphaBrief | null;
    isBriefLoading: boolean;
    marketRegime: MarketRegimeAnalysis | null;
    marketRegimeStatus: any; // FIX: Added for MarketRegimeIndicator
}> = ({
    marketTarget, handleMarketChange, isLoading,
    bridgeStatus, bridgeError, onFullDataRefresh, isFullRefreshLoading,
    persona, onPersonaChange,
    sessionLabel, execAlphaBrief, isBriefLoading,
    marketRegime, marketRegimeStatus // FIX: Added to destructuring
}) => {
        const [isGuideOpen, setIsGuideOpen] = useState(false);
        const [showShadowTrader, setShowShadowTrader] = useState(false);
        const [autoPilotStatus, setAutoPilotStatus] = useState(false);
        const navigate = useNavigate();

        // Poll Auto-Pilot status
        useEffect(() => {
            const checkAutoPilotStatus = async () => {
                // Dynamically import to avoid circular dependencies
                const { autoPilotService } = await import('./services/AutoPilotService');
                const status = autoPilotService.getStatus();
                setAutoPilotStatus(status.isRunning);
            };

            checkAutoPilotStatus();
            const interval = setInterval(checkAutoPilotStatus, 1000);
            return () => clearInterval(interval);
        }, []);

        return (
            <div className="bg-gray-900 text-gray-200 min-h-screen flex flex-col md:flex-row font-sans">
                <aside className="bg-gray-900 border-r border-gray-800 flex flex-row md:flex-col justify-between items-center p-2 md:p-4">
                    <div className="flex flex-row md:flex-col items-center gap-2 md:gap-6">
                        <NavLink to="/" className="mb-0 md:mb-8">
                            <LogoIcon className="h-10 w-10" marketTarget={marketTarget} />
                        </NavLink>
                        {hubNavItems.map(item => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                className={({ isActive }) =>
                                    `p-3 rounded-lg transition-colors duration-200 ${isActive ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-500 hover:bg-gray-700 hover:text-gray-200'}`
                                }
                                title={item.label}
                            >
                                <item.icon className="h-6 w-6" />
                            </NavLink>
                        ))}
                    </div>
                    <button
                        onClick={() => setIsGuideOpen(true)}
                        className="p-3 rounded-lg text-gray-500 hover:bg-gray-700 hover:text-gray-200"
                        title="도움말"
                    >
                        <HelpIcon className="h-6 w-6" />
                    </button>
                </aside>

                <div className="flex-1 flex flex-col min-w-0">
                    <header className="flex-shrink-0 bg-gray-900/80 backdrop-blur-sm border-b border-gray-800 p-4 flex justify-between items-center z-10">
                        <div className="flex items-center gap-3">
                            <NavLink
                                to="/shadow"
                                className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 transition-all"
                            >
                                SHADOW TRADER
                            </NavLink>
                            <span className="px-2 py-0.5 rounded text-xs font-bold bg-gray-800 text-gray-400 border border-gray-700">
                                {sessionLabel}
                            </span>
                            {/* Auto-Pilot Status Badge */}
                            {autoPilotStatus && (
                                <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-green-900/30 text-green-400 border border-green-800 animate-pulse">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                    AUTO-PILOT
                                </span>
                            )}
                        </div>


                        <div className="flex items-center gap-4">
                            <button
                                onClick={onFullDataRefresh}
                                disabled={isFullRefreshLoading}
                                className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold bg-gray-700 text-white rounded-md hover:bg-gray-600 disabled:opacity-50"
                                title="데이터베이스 초기화 후 모든 데이터를 다시 불러옵니다."
                            >
                                <RefreshIcon className={`h-4 w-4 ${isFullRefreshLoading ? 'animate-spin' : ''}`} />
                                <span className="hidden sm:inline">전체 데이터 새로고침</span>
                            </button>
                            {isFullRefreshLoading && (
                                <div className="flex items-center gap-2 text-sm text-cyan-400" title="AI가 모든 데이터를 새로고침하고 있습니다...">
                                    <RefreshIcon className="h-5 w-5 animate-spin" />
                                    <span className="hidden md:inline">
                                        전체 새로고침 중...
                                    </span>
                                </div>
                            )}
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setShowShadowTrader(!showShadowTrader)}
                                    className={`relative p-2 rounded-lg transition-colors ${showShadowTrader ? 'bg-purple-900/50 text-purple-300' : 'text-gray-500 hover:text-purple-400'}`}
                                    title="Shadow Trader (가상 매매 엔진)"
                                >
                                    🌑
                                    <span
                                        className={`absolute top-0 right-0 w-3 h-3 rounded-full border-2 border-gray-900 ${autoPilotStatus ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                                            }`}
                                        title={autoPilotStatus ? 'Auto-Pilot ON' : 'Auto-Pilot OFF'}
                                    />
                                </button>
                                <KiwoomBridgeStatusIndicator
                                    status={bridgeStatus}
                                    error={bridgeError}
                                    label={IS_KIS_PROXY_ENABLED ? 'KIS Proxy' : '키움 브릿지'}
                                />
                            </div>
                            <div className="hidden md:flex items-center gap-2">
                                <DataConnectionTester
                                    isLoading={isFullRefreshLoading}
                                    onRefresh={onFullDataRefresh}
                                    bridgeStatus={bridgeStatus}
                                    error={bridgeError}
                                    label={IS_KIS_PROXY_ENABLED ? 'KIS Proxy' : '키움 브릿지'}
                                />
                            </div>
                            <MarketRegimeIndicator status={marketRegimeStatus} marketTarget={marketTarget} />
                            <PersonaSwitcher currentPersona={persona} onPersonaChange={onPersonaChange} />
                            <MarketSwitcher currentMarket={marketTarget} onMarketChange={handleMarketChange} disabled={isLoading} />
                        </div>
                    </header>

                    <main className="flex-1 overflow-y-auto p-4 md:p-6 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
                        <ExecAlphaBriefBanner brief={execAlphaBrief} isLoading={isBriefLoading} />
                        {showShadowTrader && (
                            <div className="mb-8 animate-fade-in-down">
                                <ShadowDashboard marketTarget={marketTarget} />
                            </div>
                        )}
                        {/* --- Main Dashboard Content --- */}
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                            {/* Oracle Morning Brief (Project Oracle) */}
                            <OracleBrief marketTarget={marketTarget} />
                        </div>
                        <Outlet />
                    </main>
                </div>
                {isGuideOpen && <AppGuide onClose={() => setIsGuideOpen(false)} />}
            </div>
        );
    };

export default App;
