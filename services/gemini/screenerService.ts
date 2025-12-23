
// services/gemini/screenerService.ts
import { Type } from "@google/genai";
// FIX: Add ValuePivotScreenerResult and UserWatchlistItem to imports
import type { MarketTarget, AlphaEngineSignal, AlphaCoreResult, SupplyEagleSignal, ValuePivotScreenerResult, AnomalyItem, ScreenerTimeframe, ChartPatternResult, BFLSignal, StrategyGenome, GenomeSignal, UserWatchlistItem } from '../../types';
import { ai, AI_DISABLED_ERROR_MESSAGE, generateContentWithRetry } from './client';
import { sanitizeJsonString } from '../utils/jsonUtils';
import { marketInfo } from '../marketInfo';
import { ANTI_HALLUCINATION_RULE, DATA_GROUNDING_PROTOCOL } from './prompts/protocols';
// Removed unused imports from appConfig

// --- All Schemas moved to the top to prevent ReferenceError ---
const anomalyItemSchema = {
    type: Type.OBJECT,
    properties: {
        stockName: { type: Type.STRING },
        ticker: { type: Type.STRING },
        signals: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    text: { type: Type.STRING },
                    type: { type: Type.STRING, enum: ['price_action', 'volume', 'news', 'pattern', 'cta'] }
                },
                required: ['text', 'type']
            }
        },
        timestamp: { type: Type.STRING },
        tradingStatus: { type: Type.STRING, enum: ['Active', 'Halted'] },
        buySignalLikelihood: { type: Type.NUMBER },
        warningFlags: { type: Type.ARRAY, items: { type: Type.STRING } },
    },
    required: ['stockName', 'ticker', 'signals', 'timestamp', 'tradingStatus']
};

const tradePlanSchema = { type: Type.OBJECT, properties: { entry: { type: Type.OBJECT, properties: { type: { type: Type.STRING, enum: ['breakout', 'pullback', 'limit'] }, level: { type: Type.NUMBER } }, required: ['type', 'level'] }, stop: { type: Type.OBJECT, properties: { level: { type: Type.NUMBER }, reason: { type: Type.STRING } }, required: ['level', 'reason'] }, targets: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { level: { type: Type.NUMBER, nullable: true }, trail: { type: Type.STRING, nullable: true }, method: { type: Type.STRING } }, required: ['method'] } }, position_size: { type: Type.OBJECT, properties: { risk_per_trade_pct: { type: Type.NUMBER }, shares: { type: Type.NUMBER } }, required: ['risk_per_trade_pct', 'shares'] }, suitable_for: { type: Type.STRING } }, required: ['entry', 'stop', 'targets', 'position_size', 'suitable_for'] };

const chartPatternResultSchema = { type: Type.OBJECT, properties: { symbol: { type: Type.STRING }, stockName: { type: Type.STRING }, timeframe: { type: Type.STRING, enum: ['Intraday', 'Daily', 'Weekly', 'Monthly'] }, strategy_hits: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, passed: { type: Type.BOOLEAN }, notes: { type: Type.ARRAY, items: { type: Type.STRING } }, confidence: { type: Type.NUMBER } }, required: ['name', 'passed', 'notes', 'confidence'] } }, scores: { type: Type.OBJECT, properties: { final: { type: Type.NUMBER }, trend: { type: Type.NUMBER }, momentum: { type: Type.NUMBER }, volume: { type: Type.NUMBER }, risk_penalty: { type: Type.NUMBER }, timing_penalty: { type: Type.NUMBER }, tier: { type: Type.STRING, enum: ['S', 'A', 'B', 'C'] } }, required: ['final', 'trend', 'momentum', 'volume', 'risk_penalty', 'timing_penalty', 'tier'] }, risk: { type: Type.OBJECT, properties: { tags: { type: Type.ARRAY, items: { type: Type.STRING } }, atr_pct: { type: Type.NUMBER }, stop_method: { type: Type.STRING } }, required: ['tags', 'atr_pct', 'stop_method'] }, trade_plan: tradePlanSchema, audit: { type: Type.OBJECT, properties: { signals_time: { type: Type.STRING }, lookback_used: { type: Type.STRING }, data_integrity: { type: Type.STRING } }, required: ['signals_time', 'lookback_used', 'data_integrity'] } }, required: ['symbol', 'stockName', 'timeframe', 'strategy_hits', 'scores', 'risk', 'trade_plan', 'audit'] };

const bflKeyMetricSchema = {
    type: Type.OBJECT,
    properties: {
        name: { type: Type.STRING, enum: ['수급', '평균 수급량(RVol)', '순매수 강도 (CLV)', '대차잔고 감소', '외인/기관 수급', '거래량/회전율', '연기금 순매수', '외국인 순매수', '공매도 잔고감소', '임원/내부자 매수'] },
        value: { type: Type.STRING },
        isPass: { type: Type.BOOLEAN }
    },
    required: ['name', 'value', 'isPass']
};

// Unused schemas removed

const bflSignalSchema = {
    type: Type.OBJECT,
    properties: {
        stockName: { type: Type.STRING },
        ticker: { type: Type.STRING },
        rationale: { type: Type.STRING },
        currentPrice: { type: Type.STRING },
        keyMetrics: { type: Type.ARRAY, items: bflKeyMetricSchema },
        aiConfidence: { type: Type.NUMBER },
        entryPlan: {
            type: Type.OBJECT,
            properties: {
                timing: { type: Type.STRING },
                strategy: { type: Type.STRING }
            },
            required: ['timing', 'strategy']
        },
        exitScenarios: {
            type: Type.OBJECT,
            properties: {
                gapUp: { type: Type.STRING },
                flat: { type: Type.STRING },
                gapDown: { type: Type.STRING }
            },
            required: ['gapUp', 'flat', 'gapDown']
        }
    },
    required: ['stockName', 'ticker', 'rationale', 'currentPrice', 'keyMetrics', 'aiConfidence', 'entryPlan', 'exitScenarios']
};

const alphaEngineSignalSchema = {
    type: Type.OBJECT,
    properties: {
        id: { type: Type.STRING },
        stockName: { type: Type.STRING },
        ticker: { type: Type.STRING },
        signalType: { type: Type.STRING },
        status: {
            type: Type.STRING, name: { type: Type.STRING, enum: ['수급', '평균 수급량(RVol)', '순매수 강도 (CLV)', '대차잔고 감소', '외인/기관 수급', '거래량/회전율', '연기금 순매수', '외국인 순매수', '공매도 잔고감소', '임원/내부자 매수'] }
        },
        rationale: {
            type: Type.OBJECT,
            properties: {
                mda: { type: Type.OBJECT, properties: { regime: { type: Type.STRING }, weights: { type: Type.OBJECT, properties: { M: { type: Type.NUMBER }, F: { type: Type.NUMBER }, V: { type: Type.NUMBER }, Q: { type: Type.NUMBER }, E: { type: Type.NUMBER } } } } },
                gi: { type: Type.OBJECT, properties: { O: { type: Type.NUMBER }, C: { type: Type.NUMBER }, P: { type: Type.NUMBER }, S: { type: Type.NUMBER }, A: { type: Type.NUMBER }, B: { type: Type.NUMBER }, IB: { type: Type.NUMBER }, BP: { type: Type.NUMBER } } },
                cc: { type: Type.OBJECT, properties: { applied: { type: Type.BOOLEAN }, why: { type: Type.STRING } } }
            },
            required: ['mda', 'gi', 'cc']
        }
    },
    required: ['symbol_id', 'ticker', 'name', 'board', 'cap_bucket', 'scores', 'rationale']
};

const valuePivotScreenerResultSchema = {
    type: Type.OBJECT,
    properties: {
        stockName: { type: Type.STRING },
        ticker: { type: Type.STRING },
        summary: { type: Type.STRING },
        structuralChangeScore: {
            type: Type.OBJECT,
            properties: {
                capexVsDepreciation: { type: Type.OBJECT, properties: { pass: { type: Type.BOOLEAN }, details: { type: Type.STRING } } },
                businessMixShift: { type: Type.OBJECT, properties: { pass: { type: Type.BOOLEAN }, details: { type: Type.STRING } } },
                irPivotMention: { type: Type.OBJECT, properties: { pass: { type: Type.BOOLEAN }, details: { type: Type.STRING } } },
                total: { type: Type.NUMBER }
            }
        },
        policyAlignmentScore: {
            type: Type.OBJECT,
            properties: {
                pass: { type: Type.BOOLEAN },
                details: { type: Type.STRING },
                total: { type: Type.NUMBER }
            }
        }
    },
    required: ['stockName', 'ticker', 'summary', 'structuralChangeScore', 'policyAlignmentScore']
};

const genomeSignalSchema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            ticker: { type: Type.STRING },
            stockName: { type: Type.STRING },
            matchedPattern: { type: Type.STRING },
            currentPrice: { type: Type.NUMBER },
            aiConfidence: { type: Type.NUMBER }
        },
        required: ['ticker', 'stockName', 'matchedPattern', 'currentPrice', 'aiConfidence']
    }
};



export async function fetchAnomalies(marketTarget: MarketTarget): Promise<AnomalyItem[]> {
    if (!ai) {
        throw new Error(AI_DISABLED_ERROR_MESSAGE);
    }

    // Step 1: Gathering phase
    const gatheringPrompt = `
    You are an expert AI analyst specializing in "Supply-Price Divergence" (수급-가격 괴리율 분석).
    Your mission is to find "Supply Eagles" (수급의 독수리) in the ${marketInfo[marketTarget].name} market.

    **CORE STRATEGY: Hidden Accumulation (잠행 매집)**
    - **Concept:** "Smart money buys quietly." We are looking for stocks where **institutions/foreigners are buying, but the price has NOT popped yet.**
    - **Target Pattern:** 
        1. **Price:** Sideways or slight downtrend (Bottoming phase). Volatility is low (The calm before the storm).
        2. **Supply:** Significant net buying by Institutions (Pension, Insurance) or Foreigners for at least 5-10 days.
        3. **Divergence:** Price is flat, but Cumulative Volume (OBV style) is making new highs.

    **STRICT FILTERS:**
    - **EXCLUDE** stocks that have already surged >50% in the last 2 weeks. (Avoid extreme bubbles, but allow momentum).
    - **EXCLUDE** penny stocks with extremely low liquidity (< 1B KRW daily volume).

    **Execution:**
    1.  Use Google Search to identify top net-buy stocks by Institutions/Foreigners for the last 5-10 days in BOTH KOSPI and KOSDAQ.
    2.  Ensure a balanced mix of candidates from both markets, specifically looking for KOSDAQ bio/tech high-potential stocks.
    3.  For each candidate, check its chart pattern. **Is it still at the bottom?**
    4.  If price is already high, DISCARD IT. We only want "Pre-breakout" setups.
    5.  Verify the "Quality" of the buyer. Pension funds (연기금) are the best signal for long-term bottoms.

    ${ANTI_HALLUCINATION_RULE}
    Present your findings as a detailed text report (CONTEXT) in Korean. Focus on the "Divergence" aspect in your explanation.
    `;

    const gatheringResponse = await generateContentWithRetry({
        model: "gemini-2.0-flash-001",
        contents: gatheringPrompt,
        config: {
            tools: [{ googleSearch: {} }],
        }
    });
    const gatheredDataContext = gatheringResponse.text;

    // Step 2: Structuring phase
    const structuringPrompt = `
    ${DATA_GROUNDING_PROTOCOL}
    Based ONLY on the provided context, generate a structured JSON array of "Supply Eagle Signals".

    **CONTEXT:**
    ---
    ${gatheredDataContext}
    ---

    **Instructions:**
    - **accumulationPeriod**: e.g., "10일간 연속 매집".
    - **buyerType**: "연기금", "기관", "외국인", "기타".
    - **avgPrice**: Estimated avg buy price of smart money.
    - **status**: 'Accumulating' (Price <= Avg Buy Price) or 'ReadyToFly' (Price just started moving above Avg Buy Price).
    - **rationale**: Must explicitly mention **"가격-수급 괴리율(Divergence)"** or **"바닥권 매집"**. Explain WHY it's a good entry point now.
    - **aiConfidence**: Higher score (80+) for longer accumulation with flatter price action.

    ${ANTI_HALLUCINATION_RULE}
    **CRITICAL:** All text must be in Korean, EXCEPT for the 'ticker'. Respond ONLY with a valid JSON array matching the schema.
    `;

    const structuringResponse = await generateContentWithRetry({
        model: "gemini-2.0-flash-001",
        contents: structuringPrompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: anomalyItemSchema
            }
        }
    });

    const anomalies: AnomalyItem[] = JSON.parse(sanitizeJsonString(structuringResponse.text || '[]'));
    return anomalies.filter(item => item.tradingStatus === 'Active');
}


export async function runChartPatternScreener(marketTarget: MarketTarget, _timeframe: ScreenerTimeframe): Promise<ChartPatternResult[]> {
    if (!ai) throw new Error("AI 서비스가 비활성화되어 차트 패턴 분석을 수행할 수 없습니다.");

    // STEP 1: WIDE SCAN (Discovery)
    const discoveryPrompt = `
    Find top 10-15 stocks in ${marketInfo[marketTarget].name} forming high-quality classical chart patterns (VCP, Cup and Handle, Double Bottom, etc.).
    IMPORTANT: Search both KOSPI and KOSDAQ. Actively include KOSDAQ growth stocks.
    Avoid penny stocks and administrative issues.
    Return ONLY a comma-separated list of tickers.
    `;

    const discoveryResponse = await generateContentWithRetry({ model: "gemini-2.0-flash-001", contents: discoveryPrompt, config: { tools: [{ googleSearch: {} }] } });
    const tickers = discoveryResponse.text.match(/[A-Z0-9.]{3,10}/g) || [];
    const uniqueTickers = [...new Set(tickers)].slice(0, 15);

    console.log(`[ChartPattern] Discovered ${uniqueTickers.length} candidates. Fetching real candles...`);

    // STEP 2: DATA INJECTION
    const { fetchDailyCandles } = await import('../dataService');
    const candidates = await Promise.all(uniqueTickers.map(async (ticker) => {
        try {
            const tickerStr = ticker as string;
            const candles = await fetchDailyCandles(tickerStr, marketTarget, 50); // Need more history for patterns
            if (!candles || candles.length < 20) return null;
            return { ticker: tickerStr, candles: candles.reverse().slice(0, 50).reverse() }; // Ensure chronological order
        } catch (e) { return null; }
    }));
    const validCandidates = (candidates.filter(c => c !== null) as { ticker: string; candles: any[] }[]);
    if (validCandidates.length === 0) return [];

    // STEP 3: PRECISION STRIKE
    const analysisPrompt = `
    Analyze these ${validCandidates.length} candidates using provided REAL market data.
    Detect classical chart patterns and provide a detailed Trade Plan.

    **DATA:**
    ${JSON.stringify(validCandidates, null, 2)}

    ${ANTI_HALLUCINATION_RULE}
    Respond with a JSON array of ChartPatternResult objects.
    `;

    const response = await generateContentWithRetry({
        model: "gemini-2.0-flash-001",
        contents: analysisPrompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: { type: Type.ARRAY, items: chartPatternResultSchema }
        }
    });

    return JSON.parse(sanitizeJsonString(response.text || '[]'));
}

// bflSignalSchema is defined at the top

export async function scanForBFLStocks(marketTarget: MarketTarget): Promise<BFLSignal[]> {
    if (!ai) throw new Error(`AI 서비스가 비활성화되었습니다. ${AI_DISABLED_ERROR_MESSAGE}`);

    // STEP 1: Discovery (Wide Scan via Google Search)
    const discoveryPrompt = `
    Find top 10-15 "Supply Eagle" candidates in the ${marketInfo[marketTarget].name} market (Include KOSPI/KOSDAQ).
    Identify items where price has NOT popped yet despite heavy accumulation.
    Return ONLY a comma-separated list of tickers.
    `;

    const discoveryResponse = await generateContentWithRetry({
        model: "gemini-2.0-flash-001",
        contents: discoveryPrompt,
        config: { tools: [{ googleSearch: {} }] }
    });

    const tickers = discoveryResponse.text.match(/[A-Z0-9.]{3,10}/g) || [];
    const uniqueTickers = [...new Set(tickers)].slice(0, 15);

    console.log(`[BFLScanner] Discovered ${uniqueTickers.length} candidates. Fetching real data...`);

    // STEP 2: DATA INJECTION (Fetch Real Candles)
    const { fetchDailyCandles } = await import('../dataService');
    const candidates = await Promise.all(uniqueTickers.map(async (ticker) => {
        try {
            const candles = await fetchDailyCandles(ticker as string, marketTarget, 20);
            if (!candles || candles.length === 0) return null;
            return {
                ticker,
                candles: candles.slice(-20)
            };
        } catch (e) { return null; }
    }));

    const validCandidates = candidates.filter(c => c !== null);
    if (validCandidates.length === 0) return [];

    // STEP 3: PRECISION STRIKE (AI Analysis on REAL DATA)
    const analysisPrompt = `
    Analyze these ${validCandidates.length} candidates for the "BFL (Big Flow)" strategy using REAL data.
    BFL signals require strong institutional buying flow and a clear entry/exit plan.

    **DATA:**
    ${JSON.stringify(validCandidates, null, 2)}

    ${ANTI_HALLUCINATION_RULE}
    Respond with a JSON array of BFLSignal objects.
    FORCE: Use real prices for 'currentPrice'.
    `;

    const response = await generateContentWithRetry({
        model: "gemini-2.0-flash-001",
        contents: analysisPrompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: { type: Type.ARRAY, items: bflSignalSchema }
        }
    });

    const signals: BFLSignal[] = JSON.parse(sanitizeJsonString(response.text || '[]'));
    // Filter out invalid signals with 0 confidence or empty rationale
    return signals.filter((s: BFLSignal) => s.aiConfidence > 0 && s.rationale && s.rationale.trim() !== "");
}


export async function scanForAlphaEngineSignals(marketTarget: MarketTarget): Promise<AlphaEngineSignal[]> {
    if (!ai) {
        throw new Error(`Alpha Engine 서비스가 비활성화되었습니다. ${AI_DISABLED_ERROR_MESSAGE} `);
    }

    const gatheringPrompt = `
    You are an expert AI analyst specializing in "Supply-Price Divergence" (수급-가격 괴리율 분석).
    Your mission is to find "Supply Eagles" (수급의 독수리) in the ${marketInfo[marketTarget].name} market.

    **CORE STRATEGY: Hidden Accumulation (잠행 매집)**
    - **Concept:** "Smart money buys quietly." We are looking for stocks where **institutions/foreigners are buying, but the price has NOT popped yet.**
    - **Target Pattern:**
        1. **Price:** Sideways or slight downtrend (Bottoming phase). Volatility is low (The calm before the storm).
        2. **Supply:** Significant net buying by Institutions (Pension, Insurance) or Foreigners for at least 5-10 days.
        3. **Divergence:** Price is flat, but Cumulative Volume (OBV style) is making new highs.

    **STRICT FILTERS:**
    - **EXCLUDE** stocks that have already surged >50% in the last 2 weeks. (Avoid extreme bubbles, but allow momentum).
    - **EXCLUDE** penny stocks with extremely low liquidity (< 1B KRW daily volume).

    **Execution:**
    1.  Use Google Search to identify top net-buy stocks by Institutions/Foreigners for the last 5-10 days in BOTH KOSPI and KOSDAQ.
    2.  Ensure at least 50% of candidates are from the KOSDAQ market, focusing on mid-cap growth and bio sectors.
    3.  For each candidate, check its chart pattern. **Is it still at the bottom?**
    4.  If price is already high, DISCARD IT. We only want "Pre-breakout" setups.
    5.  Verify the "Quality" of the buyer. Pension funds (연기금) are the best signal for long-term bottoms.

    ${ANTI_HALLUCINATION_RULE}
    Present your findings as a detailed text report (CONTEXT) in Korean. Focus on the "Divergence" aspect in your explanation.
    `;

    const gatheringResponse = await generateContentWithRetry({
        model: "gemini-2.0-flash-001",
        contents: gatheringPrompt,
        config: { tools: [{ googleSearch: {} }] }
    });
    const gatheredDataContext = gatheringResponse.text;

    const structuringPrompt = `
    ${DATA_GROUNDING_PROTOCOL}
    Based ONLY on the provided context, generate a structured JSON array of "Supply Eagle Signals".

    **CONTEXT:**
    ---
    ${gatheredDataContext}
    ---

    **Instructions:**
    - **accumulationPeriod**: e.g., "10일간 연속 매집".
    - **buyerType**: "연기금", "기관", "외국인", "기타".
    - **avgPrice**: Estimated avg buy price of smart money.
    - **status**: 'Accumulating' (Price <= Avg Buy Price) or 'ReadyToFly' (Price just started moving above Avg Buy Price).
    - **rationale**: Must explicitly mention **"가격-수급 괴리율(Divergence)"** or **"바닥권 매집"**. Explain WHY it's a good entry point now.
    - **aiConfidence**: Higher score (80+) for longer accumulation with flatter price action.

    ${ANTI_HALLUCINATION_RULE}
    **CRITICAL:** All text must be in Korean, EXCEPT for the 'ticker'. Respond ONLY with a valid JSON array matching the schema.
    `;

    const response = await generateContentWithRetry({
        model: "gemini-2.0-flash-001",
        contents: structuringPrompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: { type: Type.ARRAY, items: alphaEngineSignalSchema }
        }
    });

    return JSON.parse(sanitizeJsonString(response.text || '[]'));
}


export async function runStructuralGrowthScan(marketTarget: MarketTarget, candidates?: UserWatchlistItem[]): Promise<ValuePivotScreenerResult[]> {
    if (!ai) throw new Error("AI 서비스가 비활성화되었습니다.");

    let targetTickers: string[] = [];

    if (candidates && candidates.length > 0) {
        targetTickers = candidates.map(c => c.ticker);
    } else {
        // Discovery (Wide Scan)
        const discoveryPrompt = `
        Find top 10-15 "Value Pivot" candidates (Hidden Champions, CAPEX cycle, Business Transformation) in the ${marketInfo[marketTarget].name} market.
        Ensure you look for KOSDAQ "Small/Mid Giant" stocks that are entering a growth phase.
        Return ONLY a comma-separated list of tickers.
        `;
        const discoveryResponse = await generateContentWithRetry({ model: "gemini-2.0-flash-001", contents: discoveryPrompt, config: { tools: [{ googleSearch: {} }] } });
        targetTickers = (discoveryResponse.text as string).match(/[A-Z0-9.]{3,10}/g) || [];
    }

    const uniqueTickers = [...new Set(targetTickers)].slice(0, 15);
    console.log(`[ValuePivot] Analyzing ${uniqueTickers.length} candidates with data injection...`);

    // Fetch real data
    const { fetchDailyCandles } = await import('../dataService');
    const datasets = await Promise.all(uniqueTickers.map(async (ticker) => {
        try {
            const candles = await fetchDailyCandles(ticker as string, marketTarget, 20);
            if (!candles || candles.length === 0) return null;
            return { ticker: ticker as string, candles: candles.reverse().slice(0, 20).reverse() };
        } catch (e) { return null; }
    }));
    const validDatasets = (datasets.filter(d => d !== null) as { ticker: string; candles: any[] }[]);
    if (validDatasets.length === 0) return [];

    const analysisPrompt = `
    Analyze these ${validDatasets.length} candidates using REAL market data for "Structural Growth & Pivot".
    Focus on "Value with a Catalyst".

    **DATA:**
    ${JSON.stringify(datasets, null, 2)}

    ${ANTI_HALLUCINATION_RULE}
    Respond with a JSON array of ValuePivotScreenerResult.
    `;

    const response = await generateContentWithRetry({
        model: "gemini-2.0-flash-001",
        contents: analysisPrompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: { type: Type.ARRAY, items: valuePivotScreenerResultSchema }
        }
    });

    return JSON.parse(sanitizeJsonString(response.text || '[]'));
}

export async function runAlphaCoreScan(marketTarget: MarketTarget, quantMetrics: any[]): Promise<AlphaCoreResult> {
    if (!ai) throw new Error(AI_DISABLED_ERROR_MESSAGE);

    const prompt = `
# 알파 코어 전략 최적화 엔진 v1.6 (정밀 타겟팅 모델)

> 역할: 제공된 퀀트 데이터를 바탕으로 JIKTOO SCORE v1.6을 산출하여 최적의 종목을 선정합니다.

## 0) 에이전트 설정
- role: "알파 코어 분석 에이전트(Deterministic Scoring Agent)"
- temperature: 0.1 이하 (결과값 일관성 유지)
- 사명: 최적의 수익률을 달성하기 위한 데이터 기반 종목 분석 및 선정.

## 1) 입력 데이터 (Input Payload)
제시된 JSON 데이터를 바탕으로 분석을 수행합니다. **반드시 KOSPI와 KOSDAQ 종목을 골고루 분석하며, KOSDAQ의 유력 혁신 기업들을 발굴해야 합니다.**
\`\`\`json
{
  "date": "${quantMetrics[0]?.date || new Date().toISOString().split('T')[0]}",
  "market": "${marketTarget}",
  "universe": ${JSON.stringify(quantMetrics.map(q => ({ ticker: q.ticker, name: q.stock_name, ...q })), null, 2)},
  "params": {
    "score_cut": 80,
    "fallback_cuts": [75, 70],
    "max_fallback_steps": 2,
    "pr_switch_allow_etf": true,
    "etf_candidates": ["SPY", "QQQ", "KODEX 레버리지", "KODEX 200"]
  }
}
\`\`\`
위 universe에서 제시된 퀀트 지표를 바탕으로 JIKTOO SCORE v1.6 산출 및 최종 1순위 종목을 선정하십시오.

## 2) 점수 산정 로직 (v1.5)
### 2.1 주요 지표 (모멘텀 및 수급)
* **Momentum(M)**: \`metrics.mom_12m_ex1m\` 기반 점수.
* **Flow(F)**: \`metrics.f_inst_ rank\` 기반 점수.
* **Vol Squeeze(V)**: \`metrics.vol_squeeze_ratio\` (변동성 축소 비율).
* **Quality(Q)**: 퀄리티 필터 (True/False).
* **Efficiency(E)**: 효율성 필터 (True/False).

### 2.2 MDA 가중치 적용 (base_score)
\`base_score = M*W_M + F*W_F + V*W_V + Q*W_Q + E*W_E\`

### 2.3 GI 보정 (Insight Bonus & Bias Penalty)
* **IB (Insight Bonus)**: 인사이트 가점.
* **BP (Bias Penalty)**: 편향 감점.
* **최종 보정 계수**: \`K = IB * BP\`
* **adjusted_score = (base_score + metrics.cc_bonus) * K\`

### 2.4 CC (결정적 촉매제 보너스)
* \`metrics.cc_bonus\`: 호재성 재료 등에 의한 가점.

### 2.5 최종 선정 원칙
* 선정 조건: \`adjusted_score >= score_cut\`
* 동점자 처리: 모멘텀(M)이 높은 순으로 선정.

## 3) PR (Panic Recovery) 대응 프로토콜
1. **시장 급락 시 컷 하향**: \`score_cut\`을 순차적으로 하향 조정.
2. **시장 전환 대응**: KOSPI/KOSDAQ 혼조 시 안정적 종목 우선.
3. **ETF 스위칭**: 적합한 종목이 없을 경우 ETF(KODEX 200 등)로 대체.

## 4) 리스크 관리 및 거버넌스
* 거래정지(Halted) 또는 시세조종 의심 종목은 절대 제외.

## 5) 출력 결과 (Output Payload)
**반드시 제시된 JSON 스키마를 준수하여 결과를 반환하십시오.**
**모든 텍스트 설명(rationale, actionReason 등)은 반드시 한국어(Korean)로 작성하십시오.**

## 6) 실행 단계
1. 각 종목별 모멘텀/수급 지표 분석.
2. MDA 가중치 적용하여 기초 점수 산출.
3. CC 보너스 및 GI 보정 계수 적용하여 최종 점수(adjusted_score) 도출.
4. 선정 기준 점수(cut)를 넘는 종목 중 최우선 종목 선정.
5. 유효한 종목이 없을 경우 PR 프로토콜에 따라 ETF 또는 차순위 선정.

## 9) Alpha Decay 감지 (v1.6 PATCH)
> 최근 승률이 낮거나 기대 수익률이 마이너스인 경우 알파 감쇄 보정 모드 가동.
* 모멘텀 가중치 축소 및 수급/변동성 가중치 확대.

## 10) 최종 투자 의견 및 강도 산출 (v1.7 NEW)
* **STRONG_BUY**: 85점 이상 (강력 매수)
* **BUY**: 70~84점 (매수)
* **HOLD**: 40~69점 (보유)
* **SELL**: 20~39점 (매도)
* **STRONG_SELL**: 20점 미만 (강력 매매 금지)

**actionReason 예시**:
* STRONG_BUY: "모멘텀, 수급, 변동성 지표가 모두 최상위권이며 강력한 촉매제가 확인됨."
* BUY: "수급 유입이 뚜렷하고 차트 패턴이 완성 단계에 있음."
* HOLD: "모멘텀은 유지되고 있으나 단기 수급 정체 구간임."
* SELL: "주요 지지선 이탈 및 기관 매도세 강화."
* STRONG_SELL: "펀더멘탈 훼손 및 추세 하락 전환."
`;

    const fullOutputSchema = {
        type: Type.OBJECT,
        properties: {
            date: { type: Type.STRING },
            market: { type: Type.STRING },
            final_pick: {
                type: Type.OBJECT,
                properties: {
                    symbol_id: { type: Type.NUMBER },
                    ticker: { type: Type.STRING },
                    name: { type: Type.STRING },
                    board: { type: Type.STRING },
                    cap_bucket: { type: Type.STRING },
                    scores: {
                        type: Type.OBJECT,
                        properties: {
                            M: { type: Type.NUMBER }, F: { type: Type.NUMBER }, V: { type: Type.NUMBER }, Q: { type: Type.NUMBER }, E: { type: Type.NUMBER },
                            base_score: { type: Type.NUMBER }, cc_bonus: { type: Type.NUMBER }, K: { type: Type.NUMBER }, adjusted_score: { type: Type.NUMBER }
                        },
                        required: ['M', 'F', 'V', 'Q', 'E', 'base_score', 'cc_bonus', 'K', 'adjusted_score']
                    },
                    rationale: {
                        type: Type.OBJECT,
                        properties: {
                            mda: { type: Type.OBJECT, properties: { regime: { type: Type.STRING }, weights: { type: Type.OBJECT, properties: { M: { type: Type.NUMBER }, F: { type: Type.NUMBER }, V: { type: Type.NUMBER }, Q: { type: Type.NUMBER }, E: { type: Type.NUMBER } } } } },
                            gi: { type: Type.OBJECT, properties: { O: { type: Type.NUMBER }, C: { type: Type.NUMBER }, P: { type: Type.NUMBER }, S: { type: Type.NUMBER }, A: { type: Type.NUMBER }, B: { type: Type.NUMBER }, IB: { type: Type.NUMBER }, BP: { type: Type.NUMBER } } },
                            cc: { type: Type.OBJECT, properties: { applied: { type: Type.BOOLEAN }, why: { type: Type.STRING } } }
                        },
                        required: ['mda', 'gi', 'cc']
                    },
                    actionSignal: { type: Type.STRING, enum: ['STRONG_BUY', 'BUY', 'HOLD', 'SELL', 'STRONG_SELL'] },
                    signalStrength: { type: Type.NUMBER },
                    actionReason: { type: Type.STRING }
                },
                required: ['symbol_id', 'ticker', 'name', 'board', 'cap_bucket', 'scores', 'rationale', 'actionSignal', 'signalStrength', 'actionReason']
            },
            candidates: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { ticker: { type: Type.STRING }, adjusted_score: { type: Type.NUMBER } }, required: ['ticker', 'adjusted_score'] } },
            pr_route: { type: Type.OBJECT, properties: { used: { type: Type.BOOLEAN }, steps: { type: Type.ARRAY, items: { type: Type.STRING } } }, required: ['used', 'steps'] },
            governance: { type: Type.OBJECT, properties: { filters_passed: { type: Type.BOOLEAN }, notes: { type: Type.ARRAY, items: { type: Type.STRING } } }, required: ['filters_passed', 'notes'] },
            alpha_decay_flag: { type: Type.BOOLEAN, nullable: true }
        },
        required: ['date', 'market', 'final_pick', 'candidates', 'pr_route', 'governance']
    };

    const response = await generateContentWithRetry({
        model: "gemini-2.0-flash-001", // Flash is sufficient for screening
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: fullOutputSchema,
        }
    });

    return JSON.parse(sanitizeJsonString(response.text || '[]'));
}

const supplyEagleSignalSchema = {
    type: Type.OBJECT,
    properties: {
        stockName: { type: Type.STRING },
        ticker: { type: Type.STRING },
        accumulationPeriod: { type: Type.STRING },
        buyerType: { type: Type.STRING },
        avgPrice: { type: Type.STRING },
        currentPrice: { type: Type.STRING },
        rationale: { type: Type.STRING },
        aiConfidence: { type: Type.NUMBER },
        status: { type: Type.STRING, enum: ['Accumulating', 'ReadyToFly'] }
    },
    required: ['stockName', 'ticker', 'accumulationPeriod', 'buyerType', 'avgPrice', 'currentPrice', 'rationale', 'aiConfidence', 'status']
};

export async function scanForSupplyEagle(marketTarget: MarketTarget): Promise<SupplyEagleSignal[]> {
    if (!ai) throw new Error(`AI 공급이 비활성화되었습니다. ${AI_DISABLED_ERROR_MESSAGE}`);

    // STEP 1: WIDE SCAN (Discovery via Google Search)
    const discoveryPrompt = `
    Find top 10-15 "Supply Eagle" candidates (Institutional/Foreigner net buying stocks at bottom) in the ${marketInfo[marketTarget].name} market.
    IMPORTANT: Provide a mix of KOSPI and KOSDAQ stocks. Look for hidden KOSDAQ gems where accumulation is happening.
    Identify items where price has NOT popped yet despite heavy accumulation.
    Return ONLY a comma-separated list of tickers.
    `;

    const discoveryResponse = await generateContentWithRetry({
        model: "gemini-2.0-flash-001",
        contents: discoveryPrompt,
        config: { tools: [{ googleSearch: {} }] }
    });

    const tickers = discoveryResponse.text.match(/[A-Z0-9.]{3,10}/g) || [];
    const uniqueTickers = [...new Set(tickers)].slice(0, 15);

    console.log(`[SupplyEagle] Discovered ${uniqueTickers.length} candidates. Fetching real data...`);

    // STEP 2: DATA INJECTION (Fetch Real Candles)
    const { fetchDailyCandles } = await import('../dataService');
    const candidates = await Promise.all(uniqueTickers.map(async (ticker) => {
        try {
            const candles = await fetchDailyCandles(ticker as string, marketTarget, 20);
            if (!candles || candles.length === 0) return null;
            return {
                ticker,
                candles: candles.slice(-20)
            };
        } catch (e) { return null; }
    }));

    const validCandidates = candidates.filter(c => c !== null);
    if (validCandidates.length === 0) return [];

    // STEP 3: PRECISION STRIKE (AI Analysis on REAL DATA)
    const analysisPrompt = `
    Analyze these ${validCandidates.length} candidates using the provided REAL market data.
    Identify true "Supply Eagles" where price is in a bottom/consolidation phase while volume/accumulation signals are strong.

    **DATA:**
    ${JSON.stringify(validCandidates, null, 2)}

    ${ANTI_HALLUCINATION_RULE}
    Respond with a JSON array of SupplyEagleSignal objects.
    FORCE: Use the provided data for 'currentPrice'.
    `;

    const response = await generateContentWithRetry({
        model: "gemini-2.0-flash-001",
        contents: analysisPrompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: { type: Type.ARRAY, items: supplyEagleSignalSchema }
        }
    });

    const signals: SupplyEagleSignal[] = JSON.parse(sanitizeJsonString(response.text || '[]'));

    // STEP 4: CROSS-VERIFICATION (Final filtering)
    return signals.map(s => {
        const real = validCandidates.find(v => v!.ticker === s.ticker);
        if (!real) return null;
        return {
            ...s,
            currentPrice: real.candles[real.candles.length - 1].close.toString() // Ensure REAL price
        };
    }).filter(s => s !== null) as SupplyEagleSignal[];
}

const lateSurgeSignalSchema = {
    type: Type.OBJECT,
    properties: {
        stockName: { type: Type.STRING },
        ticker: { type: Type.STRING },
        surgeTime: { type: Type.STRING },
        volumeMultiple: { type: Type.NUMBER },
        priceChangeInSurge: { type: Type.NUMBER },
        theme: { type: Type.STRING },
        aiConfidence: { type: Type.NUMBER },
        rationale: { type: Type.STRING }
    },
    required: ['stockName', 'ticker', 'surgeTime', 'volumeMultiple', 'priceChangeInSurge', 'theme', 'aiConfidence', 'rationale']
};

export interface LateSurgeSignal {
    stockName: string;
    ticker: string;
    surgeTime: string;
    volumeMultiple: number;
    priceChangeInSurge: number;
    theme: string;
    aiConfidence: number;
    rationale: string;
}

export async function scanForLateSurge(marketTarget: MarketTarget): Promise<LateSurgeSignal[]> {
    if (!ai) throw new Error(AI_DISABLED_ERROR_MESSAGE);

    // STEP 1: Discovery
    const discoveryPrompt = `
    Identify stocks in ${marketInfo[marketTarget].name} showing Late Afternoon Surge (strong close with volume spike).
    Return ONLY a comma-separated list of tickers.
    `;
    const discoveryResponse = await generateContentWithRetry({
        model: "gemini-2.0-flash-001",
        contents: discoveryPrompt,
        config: { tools: [{ googleSearch: {} }] }
    });
    const tickers = discoveryResponse.text.match(/[A-Z0-9.]{3,10}/g) || [];
    const uniqueTickers = [...new Set(tickers)].slice(0, 10);

    console.log(`[LateSurge] Discovered ${uniqueTickers.length} candidates. Injecting data...`);

    // STEP 2: DATA INJECTION
    const { fetchDailyCandles } = await import('../dataService');
    const datasets = await Promise.all(uniqueTickers.map(async (ticker) => {
        try {
            const candles = await fetchDailyCandles(ticker as string, marketTarget, 5);
            if (!candles || candles.length === 0) return null;
            return { ticker: ticker as string, candles: candles.reverse().slice(0, 5).reverse() };
        } catch (e) { return null; }
    }));
    const validDatasets = (datasets.filter(d => d !== null) as { ticker: string; candles: any[] }[]);
    if (validDatasets.length === 0) return [];

    // STEP 3: PRECISION STRIKE
    const analysisPrompt = `
    Analyze these ${validDatasets.length} candidates for "Late Afternoon Surge".
    DATA: ${JSON.stringify(validDatasets, null, 2)}
    Respond with a JSON array of LateSurgeSignal.
    `;

    const response = await generateContentWithRetry({
        model: "gemini-2.0-flash-001",
        contents: analysisPrompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: { type: Type.ARRAY, items: lateSurgeSignalSchema }
        }
    });

    try {
        return JSON.parse(sanitizeJsonString(response.text || '[]'));
    } catch (e) {
        console.error('[LateSurge Scanner] JSON parse failed:', e);
        return [];
    }
}

const shakeoutSignalSchema = {
    type: Type.OBJECT,
    properties: {
        stockName: { type: Type.STRING },
        ticker: { type: Type.STRING },
        dropPercent: { type: Type.NUMBER },
        rsi: { type: Type.NUMBER },
        obvTrend: { type: Type.STRING, enum: ['rising', 'flat'] },
        institutionalBuying: { type: Type.BOOLEAN },
        volumeSpike: { type: Type.NUMBER },
        recoveryStrength: { type: Type.NUMBER },
        aiConfidence: { type: Type.NUMBER },
        rationale: { type: Type.STRING }
    },
    required: ['stockName', 'ticker', 'dropPercent', 'rsi', 'obvTrend', 'institutionalBuying', 'volumeSpike', 'recoveryStrength', 'aiConfidence', 'rationale']
};

export interface ShakeoutSignal {
    stockName: string;
    ticker: string;
    dropPercent: number;
    rsi: number;
    obvTrend: 'rising' | 'flat';
    institutionalBuying: boolean;
    volumeSpike: number;
    recoveryStrength: number;
    aiConfidence: number;
    rationale: string;
}

export async function scanForShakeout(marketTarget: MarketTarget): Promise<ShakeoutSignal[]> {
    if (!ai) throw new Error(AI_DISABLED_ERROR_MESSAGE);

    // STEP 1: Discovery
    const discoveryPrompt = `
    Find top 10 stocks in ${marketInfo[marketTarget].name} potential for "Shakeout" (sharp drop followed by hidden accumulation).
    Actively look for KOSDAQ bio/tech stocks where smart money is accumulating after a sharp decline.
    Return ONLY a comma-separated list of tickers (e.g., 005930, 298380).
    `;
    const discoveryResponse = await generateContentWithRetry({
        model: "gemini-2.0-flash-001",
        contents: discoveryPrompt,
        config: { tools: [{ googleSearch: {} }] }
    });
    const tickers = discoveryResponse.text.match(/[A-Z0-9.]{3,10}/g) || [];
    const uniqueTickers = [...new Set(tickers)].slice(0, 10);

    // STEP 2: DATA INJECTION
    const { fetchDailyCandles } = await import('../dataService');
    const datasets = await Promise.all(uniqueTickers.map(async (ticker) => {
        try {
            const candles = await fetchDailyCandles(ticker as string, marketTarget, 10);
            if (!candles || candles.length < 5) return null;
            return { ticker: ticker as string, candles: candles.reverse().slice(0, 10).reverse() };
        } catch (e) { return null; }
    }));
    const validDatasets = (datasets.filter(d => d !== null) as { ticker: string; candles: any[] }[]);
    if (validDatasets.length === 0) return [];

    // STEP 3: PRECISION STRIKE
    const analysisPrompt = `
    Analyze these ${validDatasets.length} candidates for a "Shakeout" pattern using REAL data.
    DATA: ${JSON.stringify(validDatasets, null, 2)}
    Respond with a JSON array of ShakeoutSignal.
    `;

    const response = await generateContentWithRetry({
        model: "gemini-2.0-flash-001",
        contents: analysisPrompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: { type: Type.ARRAY, items: shakeoutSignalSchema }
        }
    });

    try {
        return JSON.parse(sanitizeJsonString(response.text || '[]'));
    } catch (e) {
        console.error('[Shakeout Scanner] JSON parse failed:', e);
        return [];
    }
}

const distributionSignalSchema = {
    type: Type.OBJECT,
    properties: {
        stockName: { type: Type.STRING },
        ticker: { type: Type.STRING },
        daysNearHigh: { type: Type.NUMBER },
        rsiDivergence: { type: Type.BOOLEAN },
        obvDecline: { type: Type.NUMBER },
        institutionalSelling: { type: Type.BOOLEAN },
        upperWickCount: { type: Type.NUMBER },
        executionStrengthTrend: { type: Type.STRING, enum: ['weakening', 'stable'] },
        aiConfidence: { type: Type.NUMBER },
        rationale: { type: Type.STRING },
        riskLevel: { type: Type.STRING, enum: ['high', 'medium'] }
    },
    required: ['stockName', 'ticker', 'daysNearHigh', 'rsiDivergence', 'obvDecline', 'institutionalSelling', 'upperWickCount', 'executionStrengthTrend', 'aiConfidence', 'rationale', 'riskLevel']
};

export interface DistributionSignal {
    stockName: string;
    ticker: string;
    daysNearHigh: number;
    rsiDivergence: boolean;
    obvDecline: number;
    institutionalSelling: boolean;
    upperWickCount: number;
    executionStrengthTrend: 'weakening' | 'stable';
    aiConfidence: number;
    rationale: string;
    riskLevel: 'high' | 'medium';
}

export async function scanForDistribution(marketTarget: MarketTarget): Promise<DistributionSignal[]> {
    if (!ai) throw new Error(AI_DISABLED_ERROR_MESSAGE);

    // STEP 1: Discovery
    const discoveryPrompt = `
    Find top 10 stocks in ${marketInfo[marketTarget].name} potential for "Distribution" (stalling near highs with hidden selling).
    Make sure to scan KOSDAQ high-flyers that might be entering a distribution phase.
    Return ONLY a comma-separated list of tickers.
    `;
    const discoveryResponse = await generateContentWithRetry({
        model: "gemini-2.0-flash-001",
        contents: discoveryPrompt,
        config: { tools: [{ googleSearch: {} }] }
    });
    const tickers = discoveryResponse.text.match(/[A-Z0-9.]{3,10}/g) || [];
    const uniqueTickers = [...new Set(tickers)].slice(0, 10);

    // STEP 2: DATA INJECTION
    const { fetchDailyCandles } = await import('../dataService');
    const datasets = await Promise.all(uniqueTickers.map(async (ticker) => {
        try {
            const candles = await fetchDailyCandles(ticker as string, marketTarget, 20);
            if (!candles || candles.length < 10) return null;
            return { ticker: ticker as string, candles: candles.reverse().slice(0, 20).reverse() };
        } catch (e) { return null; }
    }));
    const validDatasets = (datasets.filter(d => d !== null) as { ticker: string; candles: any[] }[]);
    if (validDatasets.length === 0) return [];

    // STEP 3: PRECISION STRIKE
    const analysisPrompt = `
    Analyze these ${validDatasets.length} candidates for a "Distribution" pattern using REAL data.
    DATA: ${JSON.stringify(validDatasets, null, 2)}
    Respond with a JSON array of DistributionSignal.
    `;

    const response = await generateContentWithRetry({
        model: "gemini-2.0-flash-001",
        contents: analysisPrompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: { type: Type.ARRAY, items: distributionSignalSchema }
        }
    });

    try {
        return JSON.parse(sanitizeJsonString(response.text || '[]'));
    } catch (e) {
        console.error('[Distribution Scanner] JSON parse failed:', e);
        return [];
    }
}

export interface ConvictionSignal {
    ticker: string;
    stockName: string;
    engines: string[]; // ["SupplyEagle", "ChartPattern", "ValuePivot"]
    score: number; // Count of engines triggered
    reasons: string[];
}

export async function scanForConviction(market: MarketTarget): Promise<ConvictionSignal[]> {
    if (!ai) throw new Error(`Conviction Scanner諝??科鹻?????�𠽌?�𠹻.${AI_DISABLED_ERROR_MESSAGE}`);

    console.log(`[Conviction] Starting Composite Scan for ${market}...`);

    // Run all engines in parallel
    const [supplySignals, chartSignals, valueSignals] = await Promise.all([
        scanForSupplyEagle(market).catch(e => { console.error(e); return []; }),
        runChartPatternScreener(market, 'Daily').catch(e => { console.error(e); return []; }),
        runStructuralGrowthScan(market).catch(e => { console.error(e); return []; })
    ]);

    const candidates = new Map<string, ConvictionSignal>();

    // 1. Process Supply Eagle
    supplySignals.forEach(s => {
        if (!candidates.has(s.ticker)) {
            candidates.set(s.ticker, { ticker: s.ticker, stockName: s.stockName, engines: [], score: 0, reasons: [] });
        }
        const c = candidates.get(s.ticker)!;
        c.engines.push('SupplyEagle');
        c.score += 1; // Base score
        c.reasons.push(`[수급] ${s.rationale}`);
    });

    // 2. Process Chart Pattern
    chartSignals.forEach(s => {
        // ChartPattern uses 'symbol' in result schema but 'ticker' is usually the standard. 
        // Let's assume 'symbol' or 'ticker' might be present.
        const ticker = (s as any).ticker || s.symbol;
        if (!ticker) return;

        if (!candidates.has(ticker)) {
            candidates.set(ticker, { ticker: ticker, stockName: s.stockName, engines: [], score: 0, reasons: [] });
        }
        const c = candidates.get(ticker)!;
        c.engines.push('ChartPattern');
        c.score += 1;
        // Check tier
        if (s.scores.tier === 'S') c.score += 2; // Bonus for S-tier
        if (s.scores.tier === 'A') c.score += 1;
        c.reasons.push(`[차트] ${s.trade_plan.suitable_for} pattern`);
    });

    // 3. Process Value Pivot
    valueSignals.forEach(s => {
        if (!candidates.has(s.ticker)) {
            candidates.set(s.ticker, { ticker: s.ticker, stockName: s.stockName, engines: [], score: 0, reasons: [] });
        }
        const c = candidates.get(s.ticker)!;
        c.engines.push('ValuePivot');
        c.score += 1;
        if (s.structuralChangeScore.total >= 80) c.score += 1;
        c.reasons.push(`[가치] ${s.summary}`);
    });

    // Filter for Conviction (Aggressive Mode: Allow Score >= 2 or Engines >= 1)
    // Relaxed to ensure we get candidates for active learning.
    const rawResults = Array.from(candidates.values())
        .filter(c => c.engines.length >= 1 || c.score >= 2)
        .sort((a, b) => b.score - a.score);

    console.log(`[Conviction] Found ${rawResults.length} candidates (Aggressive Mode). Validating prices...`);

    // [FIX] Real-time Price Validation & Market Classification
    const { fetchLatestPrice } = await import('../dataService');
    // We will use Gemini to batch-classify Market Type (KOSPI vs KOSDAQ) for accuracy
    // because ticker patterns are not 100% reliable.
    const topCandidates = rawResults.slice(0, 20);
    const tickersToClassify = topCandidates.map(c => c.ticker);
    let marketMap = new Map<string, string>();

    if (market === 'KR' && tickersToClassify.length > 0) {
        try {
            const classificationPrompt = `
            Classify these Korean stock tickers into KOSPI or KOSDAQ.
            Tickers: ${tickersToClassify.join(', ')}
            
            RETURN ONLY JSON ARRAY: [{ "ticker": "...", "market": "KOSPI" or "KOSDAQ" }]
            `;

            const clsResponse = await generateContentWithRetry({
                model: "gemini-2.0-flash-001",
                contents: classificationPrompt,
                config: { responseMimeType: "application/json" }
            });

            const clsData = JSON.parse(sanitizeJsonString(clsResponse.text || '[]'));
            if (Array.isArray(clsData)) {
                clsData.forEach((item: any) => {
                    if (item.ticker && item.market) marketMap.set(item.ticker, item.market.toUpperCase());
                });
            }
        } catch (e) {
            console.warn('[Conviction] Market classification failed, defaulting to logic/KR');
        }
    }

    const validatedResults = await Promise.all(topCandidates.map(async (res) => {
        try {
            // 1. Fetch Real Price
            const realData = await fetchLatestPrice(res.ticker, '', market);
            if (realData.price > 0) {
                (res as any).price = realData.price;
                (res as any).changeRate = realData.changeRate;
            }

            // 2. Assign Market Label
            if (market === 'KR') {
                // Priority: Gemini Classification > Heuristic (if we worked on it) > Default 'KOSPI'
                // But since 'market' prop defaults to 'KR' usually, frontend shows 'KOSPI' (red) usually if we send 'KR'.
                // We MUST send 'KOSDAQ' explicitly.
                const classified = marketMap.get(res.ticker);
                if (classified) {
                    (res as any).market = classified;
                } else {
                    // Fallback: If not classified, at least set to KOSPI (or keep KR if handled)
                    (res as any).market = 'KOSPI';
                }
            } else {
                (res as any).market = 'US';
            }
            return res;
        } catch (e) {
            return res;
        }
    }));

    return validatedResults;
}

export interface GapSignal {
    ticker: string;
    stockName: string;
    gapPercent: number;
    currentChange: number;
    volumeRatio: number; // vs yesterday
    news: string;
    aiConfidence: number;
}

const gapSignalSchema = {
    type: Type.OBJECT,
    properties: {
        ticker: { type: Type.STRING },
        stockName: { type: Type.STRING },
        gapPercent: { type: Type.NUMBER },
        currentChange: { type: Type.NUMBER },
        volumeRatio: { type: Type.NUMBER },
        news: { type: Type.STRING },
        aiConfidence: { type: Type.NUMBER }
    },
    required: ['ticker', 'stockName', 'gapPercent', 'currentChange', 'volumeRatio', 'news', 'aiConfidence']
};

export async function scanForGapStocks(market: MarketTarget): Promise<GapSignal[]> {
    if (!ai) throw new Error(AI_DISABLED_ERROR_MESSAGE);

    // STEP 1: Discovery (Wide Scan)
    const prompt = `
    Find top 10 stocks in ${marketInfo[market].name} showing Gap Up (>3%) pattern TODAY.
    Return ONLY a comma-separated list of tickers.
    `;

    const discoveryResponse = await generateContentWithRetry({
        model: "gemini-2.0-flash-001",
        contents: prompt,
        config: {
            tools: [{ googleSearch: {} }],
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: gapSignalSchema
            }
        }
    });

    const tickers = discoveryResponse.text.match(/[A-Z0-9.]{3,10}/g) || [];
    const uniqueTickers = [...new Set(tickers)].slice(0, 10);

    console.log(`[GapScanner] Discovered ${uniqueTickers.length} candidates. Verifying prices...`);

    // STEP 2: Real-time Price Verification
    const { fetchLatestPrice } = await import('../dataService');
    const results: GapSignal[] = [];

    for (const ticker of uniqueTickers) {
        try {
            const tickerStr = ticker as string;
            const realData = await fetchLatestPrice(tickerStr, '', market);
            if (realData.price > 0) {
                results.push({
                    ticker: tickerStr,
                    stockName: tickerStr,
                    gapPercent: realData.changeRate,
                    currentChange: realData.changeRate,
                    volumeRatio: 0,
                    news: "검증된 실시간 데이터",
                    aiConfidence: 90
                });
            }
        } catch (e) { }
    }

    return results;
}

// FIX: Import StrategyGenome and GenomeSignal from types via alias or relative path if needed, 
// but types.ts handles exports. 
import { supabase } from '../supabaseClient';
// Make sure supabase is imported or passed. If not available in this file scope, use import.

export async function scanForGenomeMomentum(market: MarketTarget): Promise<GenomeSignal[]> {
    if (!ai) throw new Error(AI_DISABLED_ERROR_MESSAGE);

    // 1. Fetch Active Strategy Genome from DB
    let activeGenome: StrategyGenome | null = null;
    let strategyName = "Default Technical";

    if (supabase) {
        try {
            const { data } = await supabase.from('strategies').select('*').eq('market', market).eq('is_active', true).maybeSingle();
            if (data && (data as any).genome) {
                activeGenome = (data as any).genome;
                strategyName = (data as any).name;
            }
        } catch (e) { }
    }
    if (!activeGenome) {
        activeGenome = { maShort: 20, maLong: 60, rsiPeriod: 14, rsiBuy: 35, rsiSell: 70, bbPeriod: 20, bbDev: 2, stochK: 14, stochD: 3, stopLoss: 0.07, takeProfit: 0.15 };
    }

    // STEP 1: Discovery
    const discoveryPrompt = `
    Find top 10 stocks in ${marketInfo[market].name} that potentially match a momentum-dip or early breakout pattern.
    Return ONLY a comma-separated list of tickers.
    `;
    const discoveryResponse = await generateContentWithRetry({ model: "gemini-2.0-flash-001", contents: discoveryPrompt, config: { tools: [{ googleSearch: {} }] } });
    let tickers: string[] = [];
    if (market === 'KR') {
        tickers = (discoveryResponse.text as string).match(/\b\d{6}\b/g) || [];
    } else {
        const matches = (discoveryResponse.text as string).match(/\b[A-Z]{2,5}\b/g) || [];
        const exclude = ['RSI', 'EMA', 'SMA', 'MACD', 'BB'];
        tickers = matches.filter(t => !exclude.includes(t));
    }
    const uniqueTickers = [...new Set(tickers)].slice(0, 15);

    console.log(`[GenomeHunter] Analyzing ${uniqueTickers.length} candidates for strategy "${strategyName}"...`);

    // STEP 2: Data Injection
    const { fetchDailyCandles } = await import('../dataService');
    const validCandidates = await Promise.all(uniqueTickers.map(async (ticker) => {
        try {
            const candles = await fetchDailyCandles(ticker as string, market, 60);
            if (!candles || candles.length < 20) return null;
            return { ticker, candles: candles.reverse().slice(0, 60).reverse() };
        } catch (e) { return null; }
    }));
    const datasets = validCandidates.filter(d => d !== null);

    // STEP 3: Precision Strike
    const analysisPrompt = `
    Analyze these ${datasets.length} candidates using REAL market data against the "${strategyName}" Genome.

    **GENOME DNA:**
    - MA: ${activeGenome.maShort} vs ${activeGenome.maLong}
    - RSI: ${activeGenome.rsiPeriod} (Buy under ${activeGenome.rsiBuy})
    - BB: ${activeGenome.bbPeriod}

    **DATA:**
    ${JSON.stringify(datasets, null, 2)}

    ${ANTI_HALLUCINATION_RULE}
    Respond with a JSON array of GenomeSignal objects.
    `;

    const response = await generateContentWithRetry({
        model: "gemini-2.0-flash-001",
        contents: analysisPrompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: genomeSignalSchema
        }
    });

    return JSON.parse(sanitizeJsonString(response.text || '[]'));
}
