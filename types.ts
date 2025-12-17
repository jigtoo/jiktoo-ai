// copy-of-sepa-ai/types.ts

export interface AllowedUser {
    email: string;
    is_approved: boolean;
    created_at?: string;
}

// import type { Chat } from '@google/genai';

export type MarketTarget = 'KR' | 'US';
export type ScreenerTimeframe = 'Intraday' | 'Daily' | 'Weekly' | 'Monthly';
export type ProxyStatus = 'connecting' | 'connected' | 'error' | 'disabled';

// --- NEW: Phase 1 - Market Regime Types ---
export type MarketRegime = '저변동성 추세장' | '고변동성 혼란장' | '하락장' | '불확실' | '데이터 없음';

export interface MarketRegimeAnalysis {
    regime: MarketRegime;
    summary: string;
}

// --- Shadow Trader Strategy Types ---
export type TradingStrategy = 'DAY' | 'SWING' | 'LONG';

export interface StrategyConfig {
    name: string;
    displayName: string;
    takeProfitPercent: number;
    stopLossPercent: number;
    description: string;
}
// -----------------------------------------

export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

// --- NEW: Alpha Core Types ---
export interface AlphaCorePick {
    symbol_id: number;
    ticker: string;
    name: string;
    board: string;
    cap_bucket: string;
    scores: {
        M: number; F: number; V: number; Q: number; E: number;
        base_score: number;
        cc_bonus: number;
        K: number;
        adjusted_score: number;
    };
    rationale: {
        mda: { regime: string; weights: Record<string, number> };
        gi: { O: number; C: number; P: number; S: number; A: number; B: number; IB: number; BP: number; };
        cc: { applied: boolean; why: string; };
    };
    // NEW: Clear action signals
    actionSignal: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';
    signalStrength: number; // 0-100, confidence in the signal
    actionReason: string; // Why this action is recommended
}

export interface AlphaCoreResult {
    date: string;
    market: MarketTarget;
    final_pick: AlphaCorePick;
    candidates: { ticker: string; adjusted_score: number }[];
    pr_route: {
        used: boolean;
        steps: string[];
    };
    governance: {
        filters_passed: boolean;
        notes: string[];
    };
    alpha_decay_flag?: boolean;
}


// --- NEW: Value-Pivot Screener Type ---
export interface ValuePivotScreenerResult {
    stockName: string;
    ticker: string;
    summary: string;
    structuralChangeScore: {
        capexVsDepreciation: { pass: boolean; details: string; };
        businessMixShift: { pass: boolean; details: string; };
        irPivotMention: { pass: boolean; details: string; };
        total: number;
    };
    policyAlignmentScore: {
        pass: boolean;
        details: string;
        total: number;
    };
}

// --- NEW OPERATOR CONSOLE TYPES ---
export interface ExecutionQueueItem {
    id: string;
    created_at: string;
    target_system: string;
    command_type: string;
    command_payload: Json | null;
    status: 'pending' | 'running' | 'done' | 'failed' | 'pending_approval';
    priority: number;
    requested_by: string;
    attempts: number;
}

export interface ExecutionLogItem {
    id: string;
    queue_id: string;
    started_at: string | null;
    completed_at: string | null;
    status: 'running' | 'done' | 'failed';
    result_summary: string | null;
    error_details: string | null;
}

export interface TelegramSubscriber {
    chat_id: string;
    created_at: string;
}

export interface BrainwaveEvent {
    timestamp: string;
    type: 'collector' | 'signal' | 'resonance' | 'adaptation' | 'system';
    message: string;
    meta: Record<string, any>;
}


// --- NEW: Alpha-Link Realtime Signal ---
export interface RealtimeSignal {
    source: 'user' | 'bfl' | 'material' | 'coin' | 'pattern' | 'genome';
    ticker: string;
    stockName: string | null;
    rationale: string;
    weight: number; // 0.0 to 1.0
    meta?: any;
}

// --- NEW: Time Machine Genome Types ---
export interface StrategyGenome {
    maShort: number;
    maLong: number;
    rsiPeriod: number;
    rsiBuy: number;
    rsiSell: number;
    bbPeriod: number;
    bbDev: number;
    stochK: number;
    stochD: number;
    // Risk
    stopLoss: number;
    takeProfit: number;
}

export interface GenomeSignal {
    ticker: string;
    stockName: string;
    matchedPattern: string; // e.g. "RSI < 30 and Price > MA20"
    currentPrice: number;
    aiConfidence: number;
}


// --- NEW STRATEGY LAB TYPES ---
export interface UserDefinedStrategyRules {
    entryConditions: string[];
    exitConditions: string[];
    stopLoss: string | null;
    takeProfit: string | null;
}

export interface BacktestResult {
    period: string;
    totalTrades: number;
    winRate: number;
    profitFactor: number;
    avgProfit: number;
    avgLoss: number;
    maxDrawdown: number;
    cagr: number;
    aiAnalysis: string;
    aiOptimization: string;
    trades?: any[];
}

export interface UserStrategy {
    id: string;
    owner: string;
    created_at: string;
    name: string;
    description: string;
    rules: UserDefinedStrategyRules;
    backtest_result: BacktestResult;
    is_active: boolean;
    market: MarketTarget;
    isDefault?: boolean;
    // New Strategy Lab 2.0 Logic
    logic_v2?: LogicGroup;
}

// --- STRATEGY LAB 2.0: LOGIC SCHEMA ---

export type LogicOperator = 'AND' | 'OR';
export type ComparisonOperator = '>' | '>=' | '<' | '<=' | '=' | 'CROSS_UP' | 'CROSS_DOWN';

export interface StrategyParam {
    name: string;
    value: number | string;
}

export interface StrategyCondition {
    id: string;
    type: 'INDICATOR' | 'PATTERN' | 'FUNDAMENTAL' | 'PRICE';
    indicator: string; // e.g., 'RSI', 'SMA', 'Close'
    params: StrategyParam[]; // e.g., [{name: 'period', value: 14}]
    operator: ComparisonOperator;
    comparisonValue: number | string; // Threshold or another indicator key
    comparisonType: 'NUMBER' | 'INDICATOR'; // Is the value a constant or dynamic?
}

export interface LogicGroup {
    id: string;
    type: 'GROUP';
    operator: LogicOperator; // Implementation: 'AND' = every(children), 'OR' = some(children)
    children: (StrategyCondition | LogicGroup)[];
}


// --- NEW STRATEGY PLAYBOOK TYPES ---

export interface StrategyChecklistItem {
    criterion: string;
    isMet: boolean;
    details: string;
}

export interface StrategyPlaybook {
    id: string; // Ticker + StrategyName
    stockName: string;
    ticker: string;
    strategyName: 'VCP (변동성 축소 패턴)' | 'Cup and Handle (컵앤핸들)' | '플랫 베이스 (Flat Base)' | '상승 삼각수렴 (Ascending Triangle)' | 'AI 매집봉 포착 (기관/외국인 쌍끌이)' | 'AI 상한가 포착 엔진 (시장 주도주)' | 'DB Signal' | 'Hybrid Signal' | '기타';
    strategySummary: string;
    aiConfidence: number;
    keyLevels: {
        entry: string;
        stopLoss: string;
        target: string;
    };
    analysisChecklist: StrategyChecklistItem[];
    isUserRecommended: boolean;
    addedAt: string; // ISO 8601
    // FIX: Add strategyType for use in AIEvolution analytics. Using English for consistency with existing analytics code.
    strategyType: 'DayTrade' | 'SwingTrade' | 'LongTerm';
    source?: 'db' | 'hybrid' | 'gemini';
    sources?: string[]; // For Alpha-Link
}

export interface TradeReviewNote {
    characterSentence: string;
    scenario: string;
    triggerBoardStatus: string;
    entryReason: string;
    invalidationCondition: string;
    emotionalEvent: string;
    improvementPoint: string;
    result: string; // e.g., "+15%" or "-5%"
}


// --- DATABASE TABLE ROW TYPES ---

export interface PortfolioDBRow {
    id: string;
    created_at: string;
    market: string;
    data: Json;
}

export interface PortfoliosDBRow {
    id: string;
    owner: string;
    positions: Json;
    meta: Json;
    updated_at: string;
}

export interface DailyQuantMetricsDBRow {
    date: string;
    market: string;
    ticker: string;
    stock_name: string | null;
    metrics: Json | null;
    gi: Json | null;
    mda: Json | null;
    risk: Json | null;
    created_at: string | null;
}


export interface AIPortfolioDBRow {
    market: string;
    style: string;
    data: Json;
    updated_at: string;
}

export interface AITradeLogDBRow {
    market: string;
    style: string;
    logs: Json;
    updated_at: string;
}

export interface WatchlistDBRow {
    market: string;
    items: Json;
    updated_at: string;
}

export interface UserWatchlistItem {
    ticker: string;
    stockName: string;
}

export interface TenbaggerDBRow {
    market: string;
    report_data: Json;
    updated_at: string;
}

export interface StrategyDBRow {
    market: string;
    report_data: Json;
    updated_at: string;
}

export interface PlaybookDBRow {
    market: string;
    stories: Json;
    updated_at: string;
}

export interface PortfolioChatHistoryDBRow {
    market: string;
    messages: Json;
    updated_at: string;
}

export interface BFLScannerDBRow {
    market: string;
    results: Json;
    updated_at: string;
}

export interface CoinStockScannerDBRow {
    market: string;
    results: Json;
    updated_at: string;
}

export interface MaterialRadarDBRow {
    market: string;
    results: Json;
    updated_at: string;
}

export interface ChartPatternScreenerDBRow {
    market: string;
    results: Json;
    updated_at: string;
}

export interface SignalEngineDBRow {
    market: string;
    playbook: Json;
    generated_at: string;
}

export interface AIPredictionsDBRow {
    id: string;
    created_at: string;
    market: string;
    prediction_type: string;
    prediction_data: Json;
    is_reviewed: boolean;
    price_at_prediction: number;
}

export interface GrowthJournalDBRow {
    id: string;
    created_at: string;
    prediction_id: string;
    entry_data: Json;
}

// --- USER-AI INTERACTION ---
export interface UserIntelligenceBriefing {
    id: string;
    created_at: string;
    title: string;
    content: string;
    related_tickers?: string | null;
    source_url?: string | null;
}

// --- JIKTOO Memoir ---
export interface JIKTOOMemoirEntry {
    id: string;
    created_at: string;
    case_type: string; // e.g., 'JIKTOO_Picks Trade Record', 'Major Thesis Change'
    title: string;
    content: Json; // e.g., { rationale: '...', finalReturn: 15.2 }
    market: MarketTarget;
}


// --- DASHBOARD & CORE TYPES ---

export interface MarketHealth {
    status: string; // Relaxed from strict union to allow AI-generated English statuses
    summary: string;
    positiveFactors: string[];
    negativeFactors: string[];
    keyMetric: {
        name: string;
        value: string;
    };
    regimeAnalysis: {
        regime: string;
        adaptationAdvice: string;
    };
    leadingSectors: string[];
    macroIndicators?: {
        name: string;
        value: string;
        trend: 'up' | 'down' | 'neutral';
    }[];
    market_sentiment?: string;
    freshness_label?: string;
    avg_change_1h?: string;
    avg_change_4h?: string;
    avg_change_1d?: string;
    supplyDemandAnalysis?: string;
}

export interface ExecAlphaBrief {
    id: number;
    created_at: string;
    content: string;
}

// FIX: Added InstitutionalFlowAnalysis and related types
export interface InstitutionalFlowAnalysis {
    kospi: { total: number; arbitrage: number; nonArbitrage: number; };
    kosdaq: { total: number; arbitrage: number; nonArbitrage: number; };
    futures: { foreignerNetBuy: number; };
    topSectors: { sectorName: string; netBuy: number; }[];
    aiVerdict: { status: string; summary: string; };
    date: string;
    dataStatus: 'live' | 'closed';
}

// FIX: Added FocusedStockData and WhaleRadarData
export interface FocusedStockData {
    stockName: string;
    ticker: string;
}

export interface WhaleRadarData extends FocusedStockData {
    institutionalNetBuy: number;
    foreignNetBuy: number;
    pensionNetBuy: number;
}


export interface DailyOnePickStock {
    rank: number;
    stockName: string;
    ticker: string;
    reason: string;
}

export interface DailyOnePick {
    picks: DailyOnePickStock[];
    overallReason: string;
    date: string;
}

export interface DashboardStock {
    stockName: string;
    ticker: string;
    market: string;
    rationale: string;
    referencePrice: string;
    priceTimestamp: string;
    pivotPoint: string;
    distanceToPivot: string;
    tradingStatus: 'Active' | 'Halted';
    aiScore?: number;
    updated_at?: string;
}

export interface AnomalySignal {
    text: string;
    type: 'price_action' | 'volume' | 'pattern' | 'news' | 'cta';
}

export interface AnomalyItem {
    stockName: string;
    ticker: string;
    signals: AnomalySignal[];
    timestamp: string;
    tradingStatus: 'Active' | 'Halted';
    buySignalLikelihood?: number;
    warningFlags?: string[];
}

export interface WatchlistHistoryItem {
    savedDate: string;
    analysis: AnalysisResult;
}

export interface GroundingSource {
    web: {
        uri: string;
        title: string;
    };
}


// --- ANALYSIS RESULT (MAIN TYPE) ---

export interface ChecklistItem {
    criterion: string;
    value: string;
    pass: boolean;
}

export interface BuyPlan {
    recommendedPrice: number | null;
    entryConditionText?: string | null;
    stopLossPrice: number | null;
    positionSizing: string;
    firstTargetPrice: number | null;
    secondTargetPrice: number | null;
    splitBuyTip?: string | null;
}

export interface CatalystItem {
    catalystTitle: string;
    catalystDescription: string;
}

export interface QualitativeRisk {
    riskTitle: string;
    riskDescription: string;
}

export interface CatalystStrengthAnalysis {
    strength: number;
    persistence: number;
    virality: number;
    summary: string;
}

export interface CatalystAnalysis {
    narrativeSummary: string;
    narrativeSentiment: '긍정적' | '중립' | '부정적';
    catalysts: CatalystItem[];
    qualitativeRisks: QualitativeRisk[];
    historicalPrecedent?: {
        precedentDescription: string;
        successRate: string;
    };
    triggerSignals?: {
        onSignals: { name: string; description: string }[];
        offSignals: { name: string; description: string }[];
    };
    strengthAnalysis?: CatalystStrengthAnalysis;
}

export interface RealtimeNewsItem {
    headline: string;
    source: string;
    url: string;
    publishedTime: string;
    sentiment: '긍정적' | '중립' | '부정적';
}

export interface PsychologyAnalysis {
    confidenceScore: number;
    confidenceReason: string;
    fearGreed: { summary: string };
    marketNarrative: {
        protagonist: string;
        antagonist: string;
        battleSummary: string;
    };
    psychologicalPattern: {
        patternName: string;
        description: string;
    };
    mediaThermometer: {
        level: '냉랭' | '미지근' | '관심' | '뜨거움' | '펄펄 끓음';
        reason: string;
    };
}

export interface BrandPowerAnalysis {
    summary: string;
    consumerTrendAlignment: '선도' | '동행' | '부진';
    onlineBuzz: '매우 긍정적' | '긍정적' | '중립' | '부정적';
}

export interface PsychoanalystAnalysis {
    psychologyAnalysis: PsychologyAnalysis;
    catalystAnalysis: CatalystAnalysis;
    realtimeNews: RealtimeNewsItem[];
    brandPowerAnalysis?: BrandPowerAnalysis | null;
}

export interface CompanyProfile {
    description: string;
    market: string;
    sector: string;
    marketCap: string;
    fiftyTwoWeekRange: string;
    foreignOwnership: string;
}

export interface EconomicMoatAnalysis {
    rating: 'Wide' | 'Narrow' | 'None';
    ratingReason: string;
    sources: string[];
    sustainability: string;
}

export interface GovernanceAnalysis {
    score: number;
    summary: string;
    positiveFactors: string[];
    negativeFactors: string[];
}

export interface AnalystConsensus {
    summary: string;
    ratings: {
        analyst: string;
        rating: string;
        priceTarget: string | null;
    }[];
}

export interface FundamentalAnalysis {
    summary: string;
    keyMetrics?: { name: string; value: string }[];
    financialStatementHighlights?: {
        income: string[];
        balanceSheet: string[];
        cashFlow: string[];
    };
}

export interface VcpAnalysis {
    analysisText: string;
    pivotPoint: number | null;
    priceData: { date: string; price: number }[];
    contractions: { endDate: string; contraction: string }[];
}

export interface CandlestickPattern {
    patternName: string;
    interpretation: string;
    location: string;
    reliability: '높음' | '중간' | '낮음';
}
export interface CandlestickAnalysis {
    summary: string;
    patterns?: CandlestickPattern[];
}

export interface WhaleSignal {
    type: '매수 신호' | '매도 신호' | '단기 과열 경고' | '저평가 기회';
    description: string;
    date: string;
    price: number;
}

export interface WhaleTrackerAnalysis {
    averageCost: number;
    deviationPercent: number;
    phase: '매집' | '분산' | '중립';
    accumulationType?: '기관 주도형' | '스마트머니 매집형' | '혼합형';
    phaseEvidence: string;
    signals: WhaleSignal[];
    summary: string;
}

export interface TradingPlaybookAnalysis {
    appliedStrategy: string;
    keyPattern: {
        name: string;
        status: string;
    };
    signalStrength: number;
    confirmationSignals: string[];
    expertAlignment: string;
    summary: string;
}

export interface IchimokuAnalysis {
    summary: string;
    trendHealthScore: number;
    currentState: {
        trend: string;
        momentum: string;
        resistance: string;
    };
    futureForecast: {
        supportResistance: string;
        trendChangeWarning: string;
    };
}

export interface KeyIndicatorAnalysis {
    rsi: {
        value: number;
        interpretation: '과매수' | '과매도' | '중립';
    };
    movingAverages: {
        shortTerm: { period: number; value: number; trend: '상승' | '하락' | '횡보' };
        mediumTerm: { period: number; value: number; trend: '상승' | '하락' | '횡보' };
        longTerm: { period: number; value: number; trend: '상승' | '하락' | '횡보' };
        summary: string;
    };
    volumeAnalysis: {
        recentVolumeVsAverage: string;
        interpretation: string;
    };
    vwap: {
        value: number;
        pricePosition: '상회' | '하회' | '근접';
        interpretation: string;
    };
}

export interface TechnicalAnalysis {
    pivotPoint: string;
    currentTrend: string;
    vcpAnalysis: VcpAnalysis;
    candlestickAnalysis?: CandlestickAnalysis;
    whaleTrackerAnalysis: WhaleTrackerAnalysis;
    tradingPlaybookAnalysis: TradingPlaybookAnalysis;
    ichimokuAnalysis: IchimokuAnalysis;
    keyIndicators: KeyIndicatorAnalysis;
}

export interface RiskAnalysis { summary: string; }

export interface PreMortemAnalysis {
    failureScenario: string;
    failureSignals: string[];
    defensiveStrategy: string;
}

export interface FairValueAnalysis {
    fairValueLowerBound: number | null;
    fairValueUpperBound: number | null;
    summary: string;
    valuationModels: {
        modelName: string;
        value: number | null;
        description: string;
    }[];
    scorecard: {
        category: string;
        score: number;
        summary: string;
    }[];
}

export interface ShortSellingAnalysis {
    shortBalanceRatio: string;
    lendingBalanceChange: string;
    shortInterestVolume: string;
    interpretation: string;
}

export interface HedgeFundAnalysis {
    summary: string;
    sentiment: 'Positive' | 'Neutral' | 'Negative' | 'Mixed';
    netActivityShares: number;
    topBuyers: { fundName: string; changeDescription: string; }[];
    topSellers: { fundName: string; changeDescription: string; }[];
}

export interface StrategistAnalysis {
    companyProfile: CompanyProfile;
    economicMoatAnalysis: EconomicMoatAnalysis;
    governanceAnalysis: GovernanceAnalysis;
    analystConsensus: AnalystConsensus;
    fundamentalAnalysis: FundamentalAnalysis;
    technicalAnalysis: TechnicalAnalysis;
    riskAnalysis: RiskAnalysis;
    fairValueAnalysis: FairValueAnalysis;
    preMortemAnalysis: PreMortemAnalysis;
    checklist: ChecklistItem[];
    shortSellingAnalysis?: ShortSellingAnalysis | null;
    hedgeFundAnalysis?: HedgeFundAnalysis | null;
}

export interface Synthesis {
    finalVerdict: {
        recommendation: 'ActionableSignal' | 'Watchlist' | 'NotActionable';
        reason: string;
    };
    psychoanalystSummary: string;
    strategistSummary: string;
    buyPlan: BuyPlan | null;
}

export interface UserNote {
    content: string;
    isPublic: boolean;
}
export interface PublicNote {
    author: string;
    note: string;
}

export interface StockBehaviorProfile {
    profileSummary: string;
    keyLevels: { level: string; description: string; }[];
    majorSignals: { signal: string; interpretation: string; }[];
    volatility: { atrPercent: number; analysis: string; };
    tradingStrategy: string;
}

export interface TradingPlaybook {
    strategyName: '스캘핑' | '추세매매 (박스권 돌파)' | '눌림목 매수' | '박스권 대응' | '기타';
    strategyType: '단타' | '스윙' | '중장기';
    description: string;
    entryConditions: string[];
    exitConditions: string[];
}

export interface TriggerBoard {
    news: '켜짐' | '꺼짐';
    technical: '켜짐' | '꺼짐';
    supply: '켜짐' | '꺼짐';
    psychology: '켜짐' | '꺼짐';
}

export interface DossierInsights {
    signalReliability: { name: string; value: string; }[];
    entryChecklist: string[];
    commonTraps: { trap: string; avoidance: string; }[];
}

export interface StockDossier {
    behaviorProfile: StockBehaviorProfile;
    tradingPlaybook: TradingPlaybook;
    triggerBoard: TriggerBoard;
    insights: DossierInsights;
}

export interface TradeReviewNote {
    characterSentence: string;
    scenario: string;
    triggerBoardStatus: string;
    entryReason: string;
    invalidationCondition: string;
    emotionalEvent: string;
    improvementPoint: string;
    result: string;
}


export interface AnalysisResult {
    stockName: string;
    ticker: string;
    referencePrice: number | string;
    priceTimestamp: string;
    status: 'ActionableSignal' | 'Watchlist' | 'NotActionable';
    psychoanalystAnalysis: PsychoanalystAnalysis;
    strategistAnalysis: StrategistAnalysis;
    synthesis: Synthesis;
    stockDossier: StockDossier;
    userNote?: UserNote;
    publicNotes?: PublicNote[];
    groundingSources?: GroundingSource[];
    source?: 'db' | 'hybrid' | 'gemini' | 'cache';
    cachedAt?: string;
}

export interface TopConvictionPick {
    stockName: string;
    ticker: string;
    rationale: string;
}

export interface LeadingIndicator {
    source: '재료 레이더' | '코인주 스캐너' | '이상 신호' | 'AI 추천' | '시장 건강' | '패턴 스크리너';
    signal: string;
}

export interface PortfolioImmunityAnalysis {
    concentrationRiskScore: number;
    summary: string;
    counterNarrativePick: TopConvictionPick | null;
}

export interface ChiefAnalystBriefing {
    marketThesis: string;
    topConvictionPicks: TopConvictionPick[];
    leadingIndicators: LeadingIndicator[];
    portfolioImmunityAnalysis: PortfolioImmunityAnalysis | null;
}

export interface TopConvictionPickData {
    ticker: string;
    stockName: string;
    rationale: string;
}

// FIX: Add missing type definitions for Advanced Analytics
// --- ADVANCED ANALYSIS TYPES ---

export interface ChiefAnalystInsightResult {
    insight: string;
    score: number;
    reasoning: string;
    observation: number;
    connection: number;
    pattern: number;
    synthesis: number;
    fixedIdeas: number;
    bias: number;
}

export interface MultiDimensionalAnalysis {
    score: number;
    insights: string[];
    timeD: { past: number; present: number; future: number };
    spaceD: { local: number; global: number };
    abstractD: { concrete: number; abstract: number };
    causalD: { cause: number; effect: number };
    hierarchyD: { micro: number; macro: number };
}

export interface CreativeConnectionMatrix {
    score: number;
    intersection: string[];
    difference: string[];
    transfer: string[];
}

export interface IntegratedWisdom {
    score: number;
    knowledge: number;
    understanding: number;
    wisdom: number;
    empathy: number;
    execution: number;
    humility: number;
    ethics: number;
}

// --- ACTIONABLE GUIDE TYPES ---

export interface PriceStrategyMapEntry {
    zone: string;
    priceRange: string;
    strategyWeight: string;
    stopLossCriteria: string;
    firstTarget: string;
    secondTarget?: string;
}

interface Trigger {
    description: string;
    sources?: { name: string; url: string }[];
}

export interface ActionableGuide {
    oneLineSummary: string;
    checklist: {
        category: string;
        task: string;
        sources?: { name: string; url: string }[];
    }[];
    strategyMap: PriceStrategyMapEntry[];
    onOffTriggers: {
        on: Trigger[];
        off: Trigger[];
    };
    riskManagement: {
        totalWeightRange: string;
        timeframe: string;
        hedging: string;
        newsSourceDiscipline: string;
    };
    factCheck: {
        content: string;
        sources?: { name: string; url: string }[];
    }[];
}


// --- PORTFOLIO TYPES ---

export interface AIBriefing {
    triggeredBy: string;
    summary: string;
    recommendedAction: string;
}

export interface PortfolioItem {
    id: string;
    ticker: string;
    stockName: string;
    entryPrice: number;
    quantity: number;
    memo?: string;
    purchaseTimestamp: string;
    autopilotStatus?: 'monitoring' | 'analyzing' | 'briefing_ready';
    aiBriefing?: AIBriefing | null;
    executionStatus?: 'idle' | 'executing';
}

export interface PortfolioItemAnalysis {
    id: string;
    referencePrice: number;
    priceTimestamp: string;
    profitOrLoss: number;
    profitOrLossPercent: number;
    aiAlert?: {
        type: 'info' | 'warning' | 'critical';
        message: string;
    };
    ichimokuSignal?: {
        status: 'stable' | 'caution' | 'risk';
        message: string;
    };
    strategistAnalysis?: Partial<StrategistAnalysis>;
    error?: string;
}

export interface PortfolioCompositionItem {
    name: string;
    value: number;
    percentage: number;
}

export interface PortfolioOverviewAnalysis {
    healthScore: number;
    summary: string;
    composition: PortfolioCompositionItem[];
}

// --- RISK DASHBOARD TYPES ---
export type RiskSeverity = '높음' | '중간' | '낮음';

export interface RiskAlert {
    id: string;
    ticker: string;
    stockName: string;
    riskType: string;
    summary: string;
    severity: RiskSeverity;
    timestamp: string;
    relatedNews?: string;
    priceChangePercent?: number;
    marketReactionAnalysis?: string;
}

export interface PortfolioRiskScore {
    score: number;
    summary: string;
}

export interface RiskDashboardData {
    portfolioRiskScore: PortfolioRiskScore;
    alerts: RiskAlert[];
}


// --- CHAT TYPES ---
export interface AnalysisChatMessage {
    role: 'user' | 'model';
    text: string;
}

// --- AI TRADER LAB TYPES ---

export type AIInvestmentStyle = 'conservative' | 'balanced' | 'aggressive';
export type AITurnType = 'general' | 'rebalance' | 'pyramiding';

// FIX: Added missing AITradeDecisionBriefing interface.
export interface AITradeDecisionBriefing {
    marketSituation: string;
    candidateComparison: string;
    coreReasoning: string;
    riskAssessment: string;
}

// FIX: Added missing AITradeLogEntry interface.
export interface AITradeLogEntry {
    id: string;
    timestamp: string;
    type: 'buy' | 'sell';
    ticker: string;
    stockName: string;
    quantity: number;
    price: number;
    reason: string;
    decisionBriefing?: AITradeDecisionBriefing;
}

export interface AIPortfolioState {
    initialCapital: number;
    cash: number;
    holdings: PortfolioItem[];
    currentValue: number;
    profitOrLoss: number;
    profitOrLossPercent: number;
    investmentStyle: AIInvestmentStyle;
}

export type AIPortfolios = Record<AIInvestmentStyle, AIPortfolioState | null>;

export type AITradeLogs = Record<AIInvestmentStyle, AITradeLogEntry[]>;

export interface AITurnDecision {
    trades: Omit<AITradeLogEntry, 'id' | 'timestamp'>[];
    overallReason: string;
}

export interface AITraderAlert {
    id: string;
    type: 'info' | 'warning' | 'critical';
    message: string;
}

export interface AITraderDiagnosis {
    diagnosisScore: number;
    summary: string;
    strengths: string[];
    weaknesses: string[];
    recommendations: {
        title: string;
        description: string;
    }[];
}

// --- TENBAGGER CLUB TYPES ---
export interface TenbaggerStock {
    ticker: string;
    stockName: string;
    country: string;
    industry: string;
    tenbaggerScore: number;
    status: '관리 중' | '주의' | '탈락';
    summary: string;
    drivers: string[];
    risks: string[];
    quantMetrics: {
        epsYoY: string;
        revenueCAGR: string;
        peg: number | null;
        psr: number | null;
        roe: number | null;
    };
    detailedScorecard: {
        explosiveGrowth: number;
        reasonableValuation: number;
        innovation: number;
        underTheRadar: number;
        qualityManagement: number;
        fortressBalanceSheet: number;
        compellingStory: number;
    };
    lastChecked: string;
    addDate: string;
    performanceSinceAdded: number;
}

export interface TenbaggerChangeLogEntry {
    date: string;
    type: '추가' | '제거' | '상태 변경' | '코멘트';
    stockName: string;
    ticker: string;
    summary: string;
}

export interface TenbaggerAnalysis {
    stocks: TenbaggerStock[];
    managerCommentary: string;
    changeLog: TenbaggerChangeLogEntry[];
}


// --- COMMUNITY PLAZA TYPES ---
export interface CommunityPost {
    id: string;
    stockName: string;
    ticker: string;
    title: string;
    content: string;
    author: string;
    createdAt: string;
    upvotes: number;
    downvotes: number;
    market: MarketTarget;
    voted?: 'up' | 'down';
}

// --- STRATEGY BRIEFING TYPES ---
export interface StrategicOutlook {
    reportDate: string;
    title: string;
    marketReview: {
        summary: string;
        leadingSectors: string[];
        laggingSectors: string[];
    };
    macroOutlook: {
        summary: string;
        keyRisks: { title: string; description: string; }[];
    };
    weekAhead: {
        summary: string;
        keyEvents: { date: string; event: string; importance: 'high' | 'medium' | 'low' }[];
    };
    aiStrategy: {
        summary: string;
        recommendedStance: '공격적 매수' | '선별적 매수' | '관망 및 현금 확보' | '위험 관리';
        focusSectors: string[];
    };
}

// --- TRADING PLAYBOOK TYPES ---
export interface SuccessStoryItem {
    stockName: string;
    ticker: string;
    breakoutPrice: string;
    breakoutDate: string;
    pivotPoint: string;
    sinceBreakoutPercent: number;
    marketCondition: string;
    originalAnalysisSnapshot?: AnalysisResult;
    keyLearnings: string;
    performanceMetrics: {
        timeToTarget: string | null;
        maxGainPercent: number | null;
        drawdownFromPeakPercent: number | null;
    };
}

// --- JIKTOO PICKS TYPES ---
export interface JIKTOOPicksItem {
    id: string;
    ticker: string;
    stockName: string;
    sector: string;
    rating: string; // e.g., 'STRONG BUY', 'Hold', 'Sell'
    purchaseTimestamp: string;
    purchasePrice: number;
    currentPrice: number;
    currentReturn: number;
    holdingPercent: number;
}

export interface JIKTOOPicksPortfolio {
    marketThesis: string;
    overview: {
        totalReturn: number;
        sp500Return: number;
        history: { date: string; portfolioValue: number; sp500Value: number }[];
    };
    activeItems: JIKTOOPicksItem[];
    closedItems: JIKTOOPicksItem[];
    lastManagedDate: string | null;
}

// --- SCREENER TYPES ---
export interface ScreenerMessage {
    role: 'model' | 'user';
    text: string;
    results?: DashboardStock[];
}

export interface ChartPatternResult {
    symbol: string;
    stockName: string;
    timeframe: ScreenerTimeframe;
    strategy_hits: {
        name: string;
        passed: boolean;
        notes: string[];
        confidence: number;
    }[];
    scores: ScreenerScores;
    risk: {
        tags: string[];
        atr_pct: number;
        stop_method: string;
    };
    trade_plan: {
        entry: { type: string; level: number };
        stop: { level: number; reason: string };
        targets: { level: number | null; trail: string | null; method: string }[];
        position_size: { risk_per_trade_pct: number; shares: number };
        suitable_for: string;
    };
    audit: {
        signals_time: string;
        lookback_used: string;
        data_integrity: string;
    };
}

export interface ScreenerScores {
    final: number;
    trend: number;
    momentum: number;
    volume: number;
    risk_penalty: number;
    timing_penalty: number;
    tier: 'S' | 'A' | 'B' | 'C';
}

export interface QuantitativeSignalResult {
    ticker: string;
    pattern: string;
    scores: {
        News: number;
        Flow: number;
        Psy: number;
        Defense: number;
        InsightScore: number;
        PsychologicalEdge?: number;
    };
    entry_plan: {
        type: string;
        levels: string[];
        volume_condition: string;
    };
    risk_plan: {
        stop: string;
        atr: string;
        rr: string;
        trailing: string;
    };
    targets: string[];
    position_sizing: {
        risk_per_trade_pct: number;
        daily_risk_cap_pct: number;
    };
    tripwires: string[];
    thesis: string;
    decision: 'ENTER' | 'WAIT' | 'INVALID';
    notes: string | null;
}

export interface QuantScreeningCriteria {
    per: [number, number];
    pbr: [number, number];
    roe: [number, number];
    marketCap: [number, number];
}

// --- KIWOOM PROXY TYPES ---
export interface KiwoomTRResponse {
    [key: string]: any;
}

// --- MATERIAL RADAR ---
export interface MaterialSignal {
    type: 'volume' | 'news' | 'social' | 'regulatory' | 'options' | 'darkpool' | 'supply_chain';
    text: string;
    timestamp: string;
}

export interface DetectedMaterial {
    id: string;
    title: string;
    relatedStocks: {
        stockName: string;
        ticker: string;
    }[];
    signals: MaterialSignal[];
    reliabilityScore: number;
    reliabilityGrade: 'A' | 'B' | 'C';
    aiBriefing: string;
    status: 'new' | 'acknowledged';
}

// --- COIN STOCK SCANNER ---
export interface CoinStockSignal {
    stockName: string;
    ticker: string;
    currentPrice: string;
    detectedSignals: {
        type: 'volume' | 'pattern' | 'moving_average' | 'order_book' | 'momentum';
        description: string;
    }[];
    aiConfidence: number;
    strategyBrief: string;
}

// --- BFL (CLOSING BET) SCANNER ---
export interface ClosingBetEntryPlan {
    timing: string;
    strategy: string;
}

export interface NextDayExitScenarios {
    gapUp: string;
    flat: string;
    gapDown: string;
}

export interface BFLKeyMetric {
    name: '거래대금' | '상대 거래량 (RVol)' | '종가 위치 (CLV)' | '윗꼬리 비율' | '수급 동조' | '추세/돌파' | '재료 연속성' | '수급 연속성' | '테마 대장주' | '단기과열 여부';
    value: string;
    isPass: boolean;
}

export interface BFLSignal {
    stockName: string;
    ticker: string;
    rationale: string;
    currentPrice: string;
    keyMetrics: BFLKeyMetric[];
    aiConfidence: number;
    entryPlan: {
        timing: string;
        strategy: string;
    };
    exitScenarios: {
        gapUp: string;
        flat: string;
        gapDown: string;
    };
}

export interface SupplyEagleSignal {
    stockName: string;
    ticker: string;
    accumulationPeriod: string; // e.g., "10일 연속", "2주간"
    buyerType: string; // e.g., "기관", "연기금", "외국인"
    avgPrice: string; // Estimated average price of accumulation
    currentPrice: string;
    rationale: string;
    aiConfidence: number;
    status: 'Accumulating' | 'ReadyToFly';
}

export interface LateSurgeSignal {
    stockName: string;
    ticker: string;
    surgeTime: string; // e.g., "14:15"
    volumeMultiple: number; // e.g., 5.2x
    priceChangeInSurge: number; // e.g., +4.5%
    theme: string;
    aiConfidence: number;
    rationale: string;
}

export interface ShakeoutSignal {
    stockName: string;
    ticker: string;
    dropPercent: number; // e.g., -8.5%
    rsi: number;
    obvTrend: 'rising' | 'flat'; // Despite price drop
    institutionalBuying: boolean;
    volumeSpike: number; // Multiple of average
    recoveryStrength: number; // Intraday bounce %
    aiConfidence: number;
    rationale: string;
}

export interface DistributionSignal {
    stockName: string;
    ticker: string;
    daysNearHigh: number;
    rsiDivergence: boolean;
    obvDecline: number; // Days declining
    institutionalSelling: boolean;
    upperWickCount: number;
    executionStrengthTrend: 'weakening' | 'stable';
    aiConfidence: number;
    rationale: string;
    riskLevel: 'high' | 'medium';
}

// --- Alpha Engine ---
export interface AutopilotStatus {
    isEnabled: boolean;
    lastRun: string | null;
    nextRun: string | null;
    reason: string | null;
}

export interface AlphaEngineSignal {
    id: string;
    stockName: string;
    ticker: string;
    signalType: string;
    status: 'pending' | 'active';
    aiConfidence: number;
    tradingPlan: {
        planRationale: string;
        entryPrice: string;
        stopLoss: string;
        targets: string[];
        positionSizing: string;
    };
    invalidationCondition: string;
    triggerSignal: string;
    patternTimeframe: ScreenerTimeframe;
    isUserRecommended?: boolean;
}

export interface AlphaEngineStatefulResult {
    updatedPlaybook: StrategyPlaybook[];
    changeSummary: string;
    reviewLog: {
        stockName: string;
        decision: '유지' | '수정' | '제외' | '신규 편입';
        reason: string;
    }[];
}

export interface ProgramFlow {
    timestamp: string;
    netFlow: number; // Positive for net buy, negative for net sell (in millions KRW)
    intensity: 'High' | 'Medium' | 'Low';
    sectorFocus: string[]; // Sectors being targeted
    topBuys: string[]; // Tickers being bought
    topSells: string[]; // Tickers being sold
    rationale: string;
}

// -----------------------------
// NEW: Market Logic Oracle (Project Oracle)
// -----------------------------
export interface LogicChain {
    id: string;
    primaryKeyword: string;      // 핵심 키워드 (예: AI 데이터센터)
    cause: string;               // 원인 (예: 전력 소비 급증)
    effect: string;              // 결과 (예: 변압기/냉각 시스템 부족)
    beneficiarySector: string;   // 수혜 섹터
    relatedTickers: string[];    // 관련 종목 코드
    logicStrength: number;       // 논리 강도 (0-100)
    alphaGap: number;            // 정보 격차 (0-100, 높을수록 대중이 모름)
    rationale: string;           // 상세 논리 설명
    timestamp: string;
}

export interface AlphaEngineSources {
    watchlist: UserWatchlistItem[];
    bflSignals: BFLSignal[] | null;
    materials: DetectedMaterial[] | null;
    patterns: ChartPatternResult[] | null;
    supplyEagleSignals: SupplyEagleSignal[] | null;
    lateSurgeSignals: LateSurgeSignal[] | null;
    shakeoutSignals: ShakeoutSignal[] | null;
    distributionSignals: DistributionSignal[] | null;
    programFlow: ProgramFlow | null;
    // NEW: Advanced Strategies (Phase 1)
    smcSignals: SMCSignal[] | null;
    anchoredVWAPs: AnchoredVWAP[] | null;
    volatilityBreakouts: VolatilityBreakout[] | null;
    logicChains: LogicChain[] | null; // NEW: 오라클 논리 사슬
}

export type EngineStatus = {
    stage: 'idle' | 'sentry' | 'scout' | 'strategist';
    stockName?: string;
    message: string;
}


// --- Alpha Scalper ---
export interface DayTraderSignal {
    ticker: string;
    stockName: string;
    rationale: string;
    breakoutPrice: string;
    stopLoss: string;
    target: string;
    aiConfidence: number;
}


// --- AI EVOLUTION ---

export interface PerformanceStats {
    totalReviewed: number;
    successRate: number;
    swingTrade: {
        count: number;
        successRate: number;
    };
    dayTrade: {
        count: number;
        successRate: number;
    };
    // FIX: Add missing 'last_updated_ts' property to align with its usage in useAIEvolution and PerformanceStatsDashboard.
    last_updated_ts: string | null;
}


export interface CollectorHealthStatus {
    now_utc: string;
    last_ingested_at: string;
    minutes_since_last: number | null;
}

export interface AILearningReport {
    id: number;
    created_at: string;
    market: string;
    window_from: string;
    window_to: string;
    total_msgs: number;
    // FIX: Changed `any` back to `Json` to fix type inference issues with Supabase realtime.
    top_channels: Json;
    top_keywords: Json;
    sample_msgs: Json;
    summary: string;
}

export interface TelegramLearningReport {
    generatedDate: string;
    summary: string;
    keyTakeaways: string[];
    emergingThemes: string[];
    actionableInsights: {
        insight: string;
        relatedStocks?: { name: string, ticker: string }[];
    }[];
}

export interface EnrichedLearningReport extends AILearningReport {
    richAnalysis?: TelegramLearningReport;
    isAnalyzing: boolean;
}


export interface AIEvolutionEvent {
    event_type: string;
    content: string;
    created_at: string;
    isSample?: boolean;
}

// FIX: Add 'market' property to align with mock data.
export interface ModelTrainingLog {
    id: string;
    trained_at: string;
    model_version: string;
    training_sample_count: number;
    accuracy: number;
    improvement_note: string;
    market: string;
}

// FIX: Add missing type definitions
export type InvestmentPersona = 'Aggressive' | 'Balanced' | 'Conservative';

export interface ActiveSignal {
    ticker: string;
    stockName: string;
    signalType: 'BUY' | 'SELL';
    tradingPlan: {
        entryPrice: string;
        stopLoss: string;
        targets: string[];
        positionSizing: string;
        planRationale: string;
    };
    warning?: string | null;
}

export interface NeutralSignal {
    type: 'NEUTRAL';
    ticker: string;
    stockName: string;
    reason: string;
    conflictingSignals: string[];
    warning?: string | null;
}

export type Signal = ActiveSignal | NeutralSignal;

export interface AIGrowthJournalEntry {
    id: string;
    // FIX: Corrected String to string to fix call signature error.
    timestamp: string;
    caseTitle: string;
    caseType: 'False Positive' | 'False Negative' | 'Success Case';
    summary: string;
    rootCauseAnalysis: string;
    modelImprovements: string;
    futureMonitoringPlan: string;
}

export type AIPrediction = AIPredictionsDBRow;

export interface AlertAccuracyLog {
    id: string;
    date: string;
    total_alerts: number;
    true_positives: number;
    false_positives: number;
    false_negatives: number;
    market: string;
}

export interface FeedbackReflectionLog {
    id: string;
    date: string;
    feedback_received: number;
    feedback_applied: number;
    market: string;
}

export interface RuleChangeLog {
    id: string;
    changed_at: string;
    rule_type: string;
    target: string;
    before_value: string;
    after_value: string;
    market: string;
}

export interface AlertExplanationLog {
    id: string;
    alert_id: string;
    market: string;
    created_at: string;
    top_keywords: string[];
    supporting_sentences: string[];
    similarity_score: number;
    explanation: string;
}

export interface SystemSignalStatus {
    pending_signals: number;
    failed_signals_24h: number;
    last_sent_at: string | null;
}

export interface SystemSignalLog {
    id: string;
    event_type: string;
    delivery_status: 'pending' | 'done' | 'error';
    created_at: string;
    payload: { message?: string; severity?: string; title?: string; event_type?: string } | null;
    last_error: string | null;
}

export interface CronJobRunDetail {
    runid: number;
    command: string;
    status: 'succeeded' | 'failed';
    start_time: string;
}

export interface KpiSummary {
    avg_delta_return_gap_7d: number | null;
    avg_delta_bad_follow_rate_7d: number | null;
    avg_delta_coverage: number | null;
    execution_count: number | null;
}

export interface KpiDelta {
    log_id: string;
    completed_at: string;
    command_type: string;
    delta_return_gap_7d: number | null;
    delta_bad_follow_rate_7d: number | null;
    delta_coverage: number | null;
}

export interface WeeklyDeformationRow {
    week_start: string;
    event_tag: string;
    event_count: number;
}

// ============================================
// ADVANCED TRADING STRATEGIES (Phase 1)
// Based on 10-year market research (2015-2025)
// ============================================

// --- SMC (Smart Money Concepts) Types ---
export interface FairValueGap {
    detected: boolean;
    startPrice: number;
    endPrice: number;
    gapSize: number; // Percentage
    direction: 'bullish' | 'bearish';
    strength: number; // 0-100
    timestamp: string;
}

export interface LiquiditySweep {
    detected: boolean;
    sweptLevel: number; // Previous high/low that was swept
    sweptType: 'high' | 'low';
    fakeout: boolean; // True if price reversed after sweep
    volume: number;
    reversalStrength: number; // 0-100
}

export interface OrderBlock {
    priceLevel: number;
    strength: number; // 0-100 (based on volume and rejection)
    type: 'bullish' | 'bearish';
    timestamp: string;
    volume: number;
}

export interface SMCSignal {
    ticker: string;
    stockName: string;
    market: MarketTarget;
    fvg: FairValueGap;
    liquiditySweep: LiquiditySweep;
    orderBlock: OrderBlock;
    confidence: number; // 0-100
    rationale: string;
    entryPrice: number;
    targetPrice: number;
    stopLoss: number;
    riskRewardRatio: number;
    timestamp: string;
}

// --- Anchored VWAP Types ---
export interface AnchoredVWAP {
    ticker: string;
    stockName: string;
    anchorDate: string; // Event date (earnings, 52w low, 52w high)
    anchorEvent: string; // Description: "Earnings Report", "52-Week Low", etc.
    anchorPrice: number;
    vwapPrice: number;
    currentPrice: number;
    distancePercent: number; // Distance from VWAP (%)
    isSupport: boolean; // Acting as support (true) or resistance (false)
    strength: number; // 0-100 (based on bounces and volume)
    priceAction: 'approaching' | 'bouncing' | 'breaking' | 'neutral';
    confidence: number;
}

// --- Dynamic K Volatility Breakout Types ---
export interface VolatilityBreakout {
    ticker: string;
    stockName: string;
    market: MarketTarget;
    date: string;
    kValue: number; // Dynamic K based on VIX/volatility
    vixLevel: number; // Current VIX or volatility index
    previousDayRange: number; // High - Low
    openPrice: number;
    breakoutPrice: number; // Entry price = Open + (Range × K)
    currentPrice: number;
    targetPrice: number;
    stopLoss: number;
    confidence: number; // 0-100
    rationale: string;
    marketCondition: 'low_volatility' | 'normal' | 'high_volatility' | 'extreme';
}

// --- Update AlphaEngineSources to include new strategies ---
export interface AdvancedStrategySources {
    smcSignals: SMCSignal[] | null;
    anchoredVWAPs: AnchoredVWAP[] | null;
    volatilityBreakouts: VolatilityBreakout[] | null;
}

// --- Scanner Tools Result Type ---
export interface ScannerResult {
    ticker: string;
    stockName: string;
    matchType: string;
    price: number;
    changeRate: number;
    volumeStrength: number;
    reason: string;
    technicalSignal?: string;
}

// --- SMC Analysis Type (Simplified for Scanner) ---
export interface SMCAnalysis {
    ticker: string;
    stockName: string;
    patternType: 'OrderBlock' | 'FVG' | 'LiquiditySweep' | 'MSS';
    timeframe: string;
    signalDate: string;
    entryPrice: number;
    stopLoss: number;
    takeProfit: number;
    confidence: number;
    rationale: string;
    smartMoneyActivity: string;
}

