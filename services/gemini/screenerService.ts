
// services/gemini/screenerService.ts
import { Type } from "@google/genai";
// FIX: Add ValuePivotScreenerResult and UserWatchlistItem to imports
import type { MarketTarget, AlphaEngineSignal, AlphaCoreResult, SupplyEagleSignal, ValuePivotScreenerResult, AnomalyItem, ScreenerTimeframe, ChartPatternResult, BFLSignal, StrategyGenome, GenomeSignal, UserWatchlistItem } from '../../types';
import { ai, AI_DISABLED_ERROR_MESSAGE, generateContentWithRetry } from './client';
import { sanitizeJsonString } from '../utils/jsonUtils';
import { marketInfo } from '../marketInfo';
import { ANTI_HALLUCINATION_RULE, DATA_GROUNDING_PROTOCOL } from './prompts/protocols';
import { getAlphaSource, getDailyCap, getMonthlyCap, getState } from '../appConfig';

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

const closingBetEntryPlanSchema = {
    type: Type.OBJECT,
    properties: {
        timing: { type: Type.STRING },
        strategy: { type: Type.STRING },
    },
    required: ['timing', 'strategy']
};

const nextDayExitScenariosSchema = {
    type: Type.OBJECT,
    properties: {
        gapUp: { type: Type.STRING },
        flat: { type: Type.STRING },
        gapDown: { type: Type.STRING },
    },
    required: ['gapUp', 'flat', 'gapDown']
};

const bflSignalSchema = {
    type: Type.OBJECT,
    properties: {
        stockName: { type: Type.STRING },
        ticker: { type: Type.STRING },
        rationale: { type: Type.STRING },
        currentPrice: { type: Type.STRING },
        keyMetrics: { type: Type.ARRAY, items: bflKeyMetricSchema },
        aiConfidence: { type: Type.NUMBER },
        entryPlan: closingBetEntryPlanSchema,
        exitScenarios: nextDayExitScenariosSchema,
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
    Your mission is to find "Supply Eagles" (?瞘� ?��謔? in the ${marketInfo[marketTarget].name} market.

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
    1.  Use Google Search to identify top net-buy stocks by Institutions/Foreigners for the last 5-10 days.
    2.  For each candidate, check its chart pattern. **Is it still at the bottom?**
    3.  If price is already high, DISCARD IT. We only want "Pre-breakout" setups.
    4.  Verify the "Quality" of the buyer. Pension funds (연기금 are the best signal for long-term bottoms.

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
    - **accumulationPeriod**: e.g., "10일간 연속 매집"2鴥澎� 鴔𡢾� 諤木�".
    - **buyerType**: "연기금", "기관", "외국인"?資筏??, "?科�" etc.
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
    if (!ai) throw new Error(`AI 麆刮䂻 ?刮� ?欠�謔禺�諝??科鹻?????�𠽌?�𠹻.${AI_DISABLED_ERROR_MESSAGE} `);

    const gatheringPrompt = `
    You are an expert AI analyst specializing in "Supply-Price Divergence" (수급-가격 괴리율 분석).
    Your mission is to find "Supply Eagles" (?瞘� ?��謔? in the ${marketInfo[marketTarget].name} market.

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
    1.  Use Google Search to identify top net-buy stocks by Institutions/Foreigners for the last 5-10 days.
    2.  For each candidate, check its chart pattern. **Is it still at the bottom?**
    3.  If price is already high, DISCARD IT. We only want "Pre-breakout" setups.
    4.  Verify the "Quality" of the buyer. Pension funds (연기금 are the best signal for long-term bottoms.

    ${ANTI_HALLUCINATION_RULE}
    Present your findings as a detailed text report (CONTEXT) in Korean. Focus on the "Divergence" aspect in your explanation.
    `;

    const gatheringResponse = await generateContentWithRetry({ model: "gemini-2.0-flash-001", contents: gatheringPrompt, config: { tools: [{ googleSearch: {} }] } });
    const gatheredDataContext = gatheringResponse.text;

    const structuringPrompt = `
    ${DATA_GROUNDING_PROTOCOL}
    Based ONLY on the provided context, generate a structured JSON array of "Supply Eagle Signals".

    **CONTEXT:**
    ---
    ${gatheredDataContext}
    ---

    **Instructions:**
    - **accumulationPeriod**: e.g., "10일간 연속 매집"2鴥澎� 鴔𡢾� 諤木�".
    - **buyerType**: "연기금", "기관", "외국인"?資筏??, "?科�" etc.
    - **avgPrice**: Estimated avg buy price of smart money.
    - **status**: 'Accumulating' (Price <= Avg Buy Price) or 'ReadyToFly' (Price just started moving above Avg Buy Price).
    - **rationale**: Must explicitly mention **"가격-수급 괴리율(Divergence)"** or **"바닥권 매집"**. Explain WHY it's a good entry point now.
    - **aiConfidence**: Higher score (80+) for longer accumulation with flatter price action.

    ${ANTI_HALLUCINATION_RULE}
    **CRITICAL:** All text must be in Korean, EXCEPT for the 'ticker'. Respond ONLY with a valid JSON array matching the schema.
    `; // Updated Language Rule

    const response = await generateContentWithRetry({
        model: "gemini-2.0-flash-001",
        contents: structuringPrompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: { type: Type.ARRAY, items: chartPatternResultSchema }
        }
    });

    return JSON.parse(sanitizeJsonString(response.text || '[]'));
}

export async function scanForBFLStocks(marketTarget: MarketTarget): Promise<BFLSignal[]> {
    if (!ai) throw new Error(`AI 鮈�?諻堅� ?木�?�? ?科鹻?????�𠽌?�𠹻.${AI_DISABLED_ERROR_MESSAGE} `);



    const gatheringPrompt = `
    You are an expert AI analyst specializing in "Supply-Price Divergence" (수급-가격 괴리율 분석).
    Your mission is to find "Supply Eagles" (?瞘� ?��謔? in the ${marketInfo[marketTarget].name} market.

    **CORE STRATEGY: Hidden Accumulation (잠행 매집)**
    - **Concept:** "Smart money buys quietly." We are looking for stocks where **institutions/foreigners are buying, but the price has NOT popped yet.**
    - **Target Pattern:** 
        1. **Price:** Sideways or slight downtrend (Bottoming phase). Volatility is low (The calm before the storm).
        2. **Supply:** Significant net buying by Institutions (Pension, Insurance) or Foreigners for at least 5-10 days.
        3. **Divergence:** Price is flat, but Cumulative Volume (OBV style) is making new highs.

    **STRICT FILTERS:**
    - **EXCLUDE** stocks that have already surged >15% in the last 2 weeks. (We don't want to chase).
    - **EXCLUDE** penny stocks with low liquidity.

    **Execution:**
    1.  Use Google Search to identify top net-buy stocks by Institutions/Foreigners for the last 5-10 days.
    2.  For each candidate, check its chart pattern. **Is it still at the bottom?**
    3.  If price is already high, DISCARD IT. We only want "Pre-breakout" setups.
    4.  Verify the "Quality" of the buyer. Pension funds (연기금 are the best signal for long-term bottoms.

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
    - **accumulationPeriod**: e.g., "10일간 연속 매집"2鴥澎� 鴔𡢾� 諤木�".
    - **buyerType**: "연기금", "기관", "외국인"?資筏??, "?科�" etc.
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
            responseSchema: { type: Type.ARRAY, items: bflSignalSchema }
        }
    });

    const signals = JSON.parse(sanitizeJsonString(response.text || '[]'));
    // Filter out invalid signals with 0 confidence or empty rationale
    return signals.filter((s: BFLSignal) => s.aiConfidence > 0 && s.rationale && s.rationale.trim() !== "");
}


export async function scanForAlphaEngineSignals(marketTarget: MarketTarget): Promise<AlphaEngineSignal[]> {
    if (!ai) {
        throw new Error(`Alpha Engine???科鹻?????�𠽌?�𠹻.${AI_DISABLED_ERROR_MESSAGE} `);
    }

    const gatheringPrompt = `
    You are an expert AI analyst specializing in "Supply-Price Divergence" (수급-가격 괴리율 분석).
    Your mission is to find "Supply Eagles" (?瞘� ?��謔? in the ${marketInfo[marketTarget].name} market.

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
    1.  Use Google Search to identify top net-buy stocks by Institutions/Foreigners for the last 5-10 days.
    2.  For each candidate, check its chart pattern. **Is it still at the bottom?**
    3.  If price is already high, DISCARD IT. We only want "Pre-breakout" setups.
    4.  Verify the "Quality" of the buyer. Pension funds (연기금) are the best signal for long-term bottoms.

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
    - **accumulationPeriod**: e.g., "10일간 연속 매집"2鴥澎� 鴔𡢾� 諤木�".
    - **buyerType**: "연기금", "기관", "외국인"?資筏??, "?科�" etc.
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
    if (!ai) throw new Error(AI_DISABLED_ERROR_MESSAGE);

    // const scanScope = candidates
    //     ? `the following user - provided watchlist: ${JSON.stringify(candidates.map(c => `${c.stockName} (${c.ticker})`))} `
    //     : `the entire ${marketInfo[marketTarget].name} `;

    const gatheringPrompt = `
    You are an expert AI analyst specializing in "Supply-Price Divergence" (수급-가격 괴리율 분석).
    Your mission is to find "Supply Eagles" (?瞘� ?��謔? in the ${marketInfo[marketTarget].name} market.

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
    1.  Use Google Search to identify top net-buy stocks by Institutions/Foreigners for the last 5-10 days.
    2.  For each candidate, check its chart pattern. **Is it still at the bottom?**
    3.  If price is already high, DISCARD IT. We only want "Pre-breakout" setups.
    4.  Verify the "Quality" of the buyer. Pension funds (연기금) are the best signal for long-term bottoms.

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
    - **accumulationPeriod**: e.g., "10일간 연속 매집"2鴥澎� 鴔𡢾� 諤木�".
    - **buyerType**: "연기금", "기관", "외국인"?資筏??, "?科�" etc.
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
            responseSchema: {
                type: Type.ARRAY,
                items: valuePivotScreenerResultSchema
            }
        }
    });

    return JSON.parse(sanitizeJsonString(response.text || '[]'));
}

export async function runAlphaCoreScan(marketTarget: MarketTarget, quantMetrics: any[]): Promise<AlphaCoreResult> {
    if (!ai) throw new Error(AI_DISABLED_ERROR_MESSAGE);

    const prompt = `
# 鴔�� ?龲�?䇹� ?伊骨???�′?�䂻/鴔�?嶅爰 v1.6 (?䁯𦚯賳𣕑收??諈刺�)

> 諈拖�: ?𨁈陬???科� 窸��???�???域𦚯?圉? ?科鹻?䁯𤩐 JIKTOO SCORE v1.6?潺� ?𨂃�?�� ?禺𠹻??鮈�版 1穈嶅? ?𥔱�.

## 0) ?炣� 諈刺�
- role: "鴔�� ?龲�?䇹� ?𧙖�窵�(Deterministic Scoring Agent)"
- temperature: 0.1 ?渣�(窶域�??黺嶅�)
- 篣�?: ?��???�腹繚?渥擪 ?吖�, 諯貲�???域𦚯???拖�, 窸澎掠 貐�魽? ?�� ??黺䇹腹 篣�?.

## 1) ?�� (Input Payload)
LLM?� ?木� JSON???��?潺� 諻𣏌�?曰� 穈�?𤣿�窸??韒𡆀?嶅𠹻. **?寢�?� ?賈? 窶�?吣� ?科鹻?渥�?????䁪庚, ?木� ?�� universe ?域𦚯?圉�???科鹻?渥焩 ?嶅𠹻.**
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
    "etf_candidates": ["SPY", "QQQ", "KODEX ?��謔科?", "KODEX 200"]
  }
}
\`\`\`
?寢�?� ??universe諢??𨁈陬???科� 窸��???域𦚯?圉? ?科鹻?䁯𤩐 ?�� 篞𨰰�???圉𦉘 ?韠�諝?諤曰疏???拘�??

## 2) ?木�?渠� 篞𨰰� (v1.5)
### 2.1 ?拗� ?韠�(篣圉雩 篞𨰰�)
* **Momentum(M)**: \`metrics.mom_12m_ex1m\` ?潰�?�???𨰰𤟠/貐渠�/?𨰰� 貒��貐?
  * ?��10%??0, ?��20%??5, 篞???0
* **Flow(F)**: \`metrics.f_inst_5d_rank\`
  * ??0??0, ??0%??5, 篞???0
  * (US??穇圉�?�篣?鴞祢?????�諢?篞潰� 穈�??
* **Vol Squeeze(V)**: \`metrics.vol_squeeze_ratio\`
  * ??0.30??0, ??0.15??0, 篞???0
* **Quality(Q)**: \`metrics.quality_flag\` true??0, false??
* **Efficiency(E)**: \`metrics.efficiency_flag\` true??0, false??

### 2.2 MDA 穈�鴗𡢾� ?�鹻(base_score)
\`base_score = M*W_M + F*W_F + V*W_V + Q*W_Q + E*W_E\`
(mda.weights 穈吖眼 ?科鹻)

### 2.3 GI 貐渥� (Insight Bonus � Bias Penalty)
* \`IB = 1 + 0.1 * gi.gi_norm\` (?�� 1.15)
* \`BP = 1 - 0.05 * min(1, (gi.A + gi.B)/20)\` (?属� 0.90)
* **黖𨰰� 貐渥�**: \`K = IB � BP\`
* **adjusted_score = (base_score + metrics.cc_bonus) � K\`

### 2.4 CC 穈�???𣕑� ?�𦚯)
* \`metrics.cc_bonus\` 穈𨩆� ?科鹻.

### 2.5 ?�陷繚黖𨰰� ?𧙖�
* ?�陷: \`adjusted_score ??score_cut\`
* 黖𨰰� 1鮈�版: ?�陷 鴗?**M ?韠�(諈刺�?�)** 黖嶅? ???軤� ??**黖𨁈滂 穇圉�?�篣?鴞祢???* ?𨩆? 鮈�版

## 3) PR(諡渣�貐??�麮? 諴刮孨
1. **儢欠䂻?潰𥘵 ?属棅**: \`score_cut\` ??\`fallback_cuts[0]\` ??\`fallback_cuts[1]\` (黖嶅? 2??
2. **貐渠�/?𨰰� ?��**: KOSPI?𤀼OSDAQ, NYSE?塇asdaq
3. **ETF ?�麮?*: ?科�??諡渥�????\`etf_candidates\`?韠� 諈刺�?� ?�� 1穈?
## 4) 穇圉�?嵸擪/謔科擪??穈�??(IW 篣圉�)
* \`risk.halted\` ?韒� \`risk.manipulation_flag\`穈� true??鮈�版?� 鴞吣� ?𨰰烵

## 5) 黺嶅� (Output Payload)
**諻䁪�???渥� ?�′?�䂻??諈��???�眼 JSON ?欠�諤��諤??炣䠀. 賱��?籝� 諡賄𤟠 篣�?.**

## 6) ?韠� ?㴒�謔科�(?韠㜊???�馬 ?䇹烄)
1. ?𧙖�貒�擪??穈?鮈�版???拗� ?韠�(M/F/V/Q/E)諝?窸��
2. MDA 穈�鴗𡢾�諢?\`base_score\` ?吖�
3. CC 穈�???籝𥚃 ??GI 貐渥�窸�� K ?�鹻?䁯𤩐 \`adjusted_score\` ?㻂�
4. \`adjusted_score ??cut\` 黺拖§ 鮈�版諤??�陷諢??瑅䁥
5. 黖𨰰� 1穈? **M 黖嶅?** ???軤� ??穇圉�?�篣?鴞祢????𨩆? 鮈�版
6. 諡渣�貐渠庖 PR 諴刮孨 ?𨰰馬 ?欠�(?属棅儢猾�貐渠�?��?葕TF)
7. 穇圉�?嵸擪 ?��(?㻂?/魽域�/?𧙖�?? ?㻂𥘵 ??黖𨰰� JSON諤?黺嶅�

## 9) Alpha Decay 諈刺� (v1.6 PATCH)
> 諈拖�: ?龲� ?到銁??鴥赭萼 ?𨰰�?䁪� ?𨰰�???木�穈?穈韠? ??穈�鴗𡢾� ?韒� 貐渥�??貐渥�??謔科擪??鴗�𦚯窸?諻拖𩸭諈刺� ?��)
### B) ?韠�
* \`hit_rate_20trades < 0.45\` OR \`median(returns_forward_5d_last20) < 0\` ?渠庖 **Alpha Decay ON**
### C) 魽域�
* MDA 穈�鴗𡢾� ?韒� 貐渥�?? M(諈刺�?�) weight -20% ?�????属棅, F(?瞘�)+V(?欠�渥�) +10%???�棅
* score_cut ?�� +5 ?�棅(= 鴔�� ??篧𣕑𠹻諢?�)

## 10) 諈��???科� ?𡥄猹 ?吖� (v1.7 NEW)
> 諈拖�: ?科�?韀? 鴞吣� ?参�?????�� 諈��??BUY/HOLD/SELL ?𡥄猹 ?𨁈陬

### A) actionSignal 窶域� 篣域? (adjusted_score 篣圉�)
**CRITICAL**: 諻䁪�???木� 篣域????圉𦉘 actionSignal??窶域�?䁯�??

* **STRONG_BUY**: adjusted_score ??85
  - 諈刺� ?拗�穈� 穈瑅�?瞘� 篣𣽁�??  - 鴞吣� 諤木� 窷嵸𤟠 (?科??䁯� 30-50%)
  
* **BUY**: 70 ??adjusted_score < 85
  - ?�賱�賱�� ?拗�穈� 篣𣽁�??  - 賱�� 諤木� 窷嵸𤟠 (?科??䁯� 20-30%)
  
* **HOLD**: 40 ??adjusted_score < 70
  - ?潰�???𡥄猹, 諈��??諻拗棅???��
  - 窵�諤??韒� 篣域● ?科????𥔱?
  
* **SELL**: 20 ??adjusted_score < 40
  - 賱�?㻂� ?𡥄猹 ?域�
  - 貐渥� ??諤月� 窸𧙖𨸹
  
* **STRONG_SELL**: adjusted_score < 20
  - 穈瑅�??賱�?㻂� ?𡥄猹
  - 鴞吣� 諤月� 窷嵸𤟠

### B) signalStrength (?𡥄猹 穈瑅�, 0-100)
* adjusted_score諝?0-100 ?木??潺� ?𨴴�??* 85+ ??90-100 (諤木黱 穈𤣿𥚃)
* 70-84 ??70-89 (穈𤣿𥚃)
* 40-69 ??40-69 (鴗炣汗)
* 20-39 ??20-39 (?踫𥚃)
* <20 ??0-19 (諤木黱 ?踫𥚃)

### C) actionReason (?参� 篞澎掠)
**??諡賄𤟠?潺� 諈��?瞘� ?月�**:
* STRONG_BUY ?��: "諈刺�?�(M=20), ?瞘�(F=20), ?欠�渥�(V=20) 諈刺� 黖𨁈�?? 鴞吣� 諤木� 窷嵸𤟠."
* BUY ?��: "諈刺�?�(M=20)窸??瞘�(F=15) 穈㻂�. 賱�� 諤木� 黺䇹�."
* HOLD ?��: "諈刺�?�(M=15) 篣𣽁�?�𦚯???瞘�(F=0) ?趣�. 窵�諤?窷嵸𤟠."
* SELL ?��: "諈刺�?�(M=0), ?瞘�(F=0) 諈刺� ?趣�. 諤月� 窸𧙖𨸹."
* STRONG_SELL ?��: "諈刺� ?拗� 賱�?㻂�. 鴞吣� 麮?� 窷嵸𤟠."
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
    if (!ai) throw new Error(`AI ?瞘� ?��謔??木�?�? ?科鹻?????�𠽌?�𠹻. ${AI_DISABLED_ERROR_MESSAGE}`);

    const gatheringPrompt = `
    You are an expert AI analyst specializing in "Supply-Price Divergence" (수급-가격 괴리율 분석).
    Your mission is to find "Supply Eagles" (?瞘� ?��謔? in the ${marketInfo[marketTarget].name} market.

    **CORE STRATEGY: Hidden Accumulation (잠행 매집)**
    - **Concept:** "Smart money buys quietly." We are looking for stocks where **institutions/foreigners are buying, but the price has NOT popped yet.**
    - **Target Pattern:** 
        1. **Price:** Sideways or slight downtrend (Bottoming phase). Volatility is low (The calm before the storm).
        2. **Supply:** Significant net buying by Institutions (Pension, Insurance) or Foreigners for at least 5-10 days.
        3. **Divergence:** Price is flat, but Cumulative Volume (OBV style) is making new highs.

    **STRICT FILTERS:**
    - **EXCLUDE** stocks that have already surged >15% in the last 2 weeks. (We don't want to chase).
    - **EXCLUDE** penny stocks with low liquidity.

    **Execution:**
    1.  Use Google Search to identify top net-buy stocks by Institutions/Foreigners for the last 5-10 days.
    2.  For each candidate, check its chart pattern. **Is it still at the bottom?**
    3.  If price is already high, DISCARD IT. We only want "Pre-breakout" setups.
    4.  Verify the "Quality" of the buyer. Pension funds (연기금 are the best signal for long-term bottoms.

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
    - **accumulationPeriod**: e.g., "10일간 연속 매집"2鴥澎� 鴔𡢾� 諤木�".
    - **buyerType**: "연기금", "기관", "외국인"?資筏??, "?科�" etc.
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
            responseSchema: { type: Type.ARRAY, items: supplyEagleSignalSchema }
        }
    });

    return JSON.parse(sanitizeJsonString(response.text || '[]'));
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

    const prompt = `
You are the "Smart Money Tracker," an AI specialized in detecting institutional "Late Afternoon Surges" (장막판 수급급등) in the ${marketInfo[marketTarget].name}.

**STRATEGY: Late Afternoon Surge (?欠�??篣参𢲡)**
- **Concept:** Smart money often enters late (after 2:00 PM) to position for a next-day gap up, anticipating news or sector rotation.
- **Target:** Stocks that exhibit a sudden volume spike and price surge late in the trading session and *hold* those gains.

**SCANNING CRITERIA:**
1.  **Time:** Surge occurred after 14:00 (2:00 PM).
2.  **Volume:** Sudden spike > 5x the 5-minute average OR > 3x previous day's total volume.
3.  **Price Action:** Surged > 3% within 30 minutes.
4.  **Maintenance:** Price is holding near the high (no long upper wick).
5.  **Theme:** Must belong to an active, strong theme (e.g., AI, Power, Bio).

**YOUR TASK:**
1.  Use Google Search to find stocks in the ${marketInfo[marketTarget].name} that match this pattern *today*.
2.  Search for terms like "?欠�??篣参𢲡鴥?, "?伙�???瞘�", "?𨁈�???到𦉘穈� ?寢�鴥? (if applicable), "穇圉�??篣吣� 鮈�版".
3.  Analyze the *reason* for the surge (Theme/News).
4.  Return a JSON array of stocks that fit the criteria.

**OUTPUT FORMAT:**
Respond ONLY with a valid JSON array matching this schema:
{
  "stockName": string,
  "ticker": string,
  "surgeTime": string (e.g., "14:20"),
  "volumeMultiple": number (e.g., 5.5),
  "priceChangeInSurge": number (e.g., 4.5),
  "theme": string,
  "aiConfidence": number (0-100),
  "rationale": string
}
`;

    const response = await generateContentWithRetry({
        model: "gemini-2.0-flash-001",
        contents: prompt,
        config: {
            tools: [{ googleSearch: {} }],
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

    const prompt = `
You are the "Smart Money Tracker," specialized in detecting "Shakeout" (개미털기) patterns in the ${marketInfo[marketTarget].name}.

**STRATEGY: Shakeout (개미털기) Detection**
- **Concept:** Institutions often drive prices down sharply to trigger retail stop-losses before a major rally.
- **Target:** Stocks with sharp recent drops but hidden signs of accumulation (Smart Money entry).

**SCANNING CRITERIA:**
1.  **Price Drop:** Dropped > 7% in the last 1-3 days.
2.  **Oversold:** RSI(14) is low (< 30) or approaching it.
3.  **Hidden Buying:** OBV (On-Balance Volume) is flat or rising despite the price drop (Divergence).
4.  **Candle Pattern:** Long lower wick (Hammer/Pinbar) suggesting rejection of lower prices.
5.  **Volume:** High volume on the drop/reversal day (Panic selling absorbed by Smart Money).

**YOUR TASK:**
1.  Use Google Search to find stocks matching this pattern *today* or in the last 2 days.
2.  Search for "穈嶅??資萼 ?䁯𡠺 鮈�版", "窸潺坐??諻䁪𢲡鴥?, "?禺坐 ??篣國? 諤木�", "RSI 窸潺坐??鮈�版".
3.  Analyze if the drop seems artificial (news-less drop) or fundamental.
4.  Return a JSON array of candidates.

**OUTPUT FORMAT:**
Respond ONLY with a valid JSON array matching this schema:
{
  "stockName": string,
  "ticker": string,
  "dropPercent": number (e.g., -8.5),
  "rsi": number (estimated, e.g., 28),
  "obvTrend": "rising" | "flat",
  "institutionalBuying": boolean,
  "volumeSpike": number (e.g., 2.5),
  "recoveryStrength": number (intraday bounce %, e.g., 3.5),
  "aiConfidence": number,
  "rationale": string
}
`;

    const response = await generateContentWithRetry({
        model: "gemini-2.0-flash-001",
        contents: prompt,
        config: {
            tools: [{ googleSearch: {} }],
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

    const prompt = `
You are the "Smart Money Tracker," specialized in detecting "Distribution" (물량 분산) patterns in the ${marketInfo[marketTarget].name}.

**STRATEGY: Distribution (?賈� ?瑅收) Detection**
- **Concept:** Smart Money exits positions at the top while retail investors are buying the hype.
- **Target:** Stocks near highs that show signs of stalling and hidden selling.

**SCANNING CRITERIA:**
1.  **Price Location:** Near 20-day or 52-week highs.
2.  **Stalling:** Price failing to break out despite high volume (Churning).
3.  **Divergence:** Price makes new high, but RSI or OBV makes a lower high (Bearish Divergence).
4.  **Candle Pattern:** Long upper wicks (Shooting Star) or multiple Dojis.
5.  **Flow:** Foreign/Institutional net selling despite price holding up.

**YOUR TASK:**
1.  Use Google Search to find stocks matching this pattern *today*.
2.  Search for "窸𥔱� 諤月� ?𡥄猹", "?賈� ?渣� ?䁯𡠺", "穇圉�???域� ?𣕑�", "?資筏???�??諤月�".
3.  Return a JSON array of high-risk candidates.

**OUTPUT FORMAT:**
Respond ONLY with a valid JSON array matching this schema:
{
  "stockName": string,
  "ticker": string,
  "daysNearHigh": number (e.g., 5),
  "rsiDivergence": boolean,
  "obvDecline": number (days),
  "institutionalSelling": boolean,
  "upperWickCount": number,
  "executionStrengthTrend": "weakening" | "stable",
  "aiConfidence": number,
  "rationale": string,
  "riskLevel": "high" | "medium"
}
`;

    const response = await generateContentWithRetry({
        model: "gemini-2.0-flash-001",
        contents: prompt,
        config: {
            tools: [{ googleSearch: {} }],
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

    // Filter for High Conviction (at least 2 engines OR score >= 3)
    const results = Array.from(candidates.values())
        .filter(c => c.engines.length >= 2 || c.score >= 3)
        .sort((a, b) => b.score - a.score);

    console.log(`[Conviction] Found ${results.length} High Conviction signals.`);

    return results;
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

    const prompt = `
    You are a "Morning Gap Hunter" analyst.
    
    **MISSION:**
    Find stocks in ${marketInfo[market].name} that show **Gap Up (>3%)** patterns TODAY using REAL-TIME data.
    
    **CRITICAL PROTOCOL:**
    - **REAL DATA ONLY:** You must use the Google Search tool to verify open/current prices.
    - **NO HALLUCINATIONS:** If you cannot find confirmed news/data for today, return an empty array [].
    - **NO HYPOTHETICALS:** Do not invent scenarios or examples. 
    
    **Criteria:**
    1. **Gap Up:** Open price > Previous Close by at least 3%.
    2. **Momentum:** Price holding or rising from the open.
    3. **Volume:** Significant volume spike.
    4. **News:** Driven by actual news catalyst (Earnings, Contract, Policy).

    **Avoid:**
    - Penny stocks.
    - Listings with no recent news.

    **Execution:**
    - Use Google Search for "${marketInfo[market].name} 장시작 갭상승 today", "오전 수급급등".
    - Verify the date of the news is TODAY.

    **Output JSON:**
    Respond ONLY with a valid JSON array matching the schema.
    `;

    const response = await generateContentWithRetry({
        model: "gemini-2.0-flash-001",
        contents: prompt,
        config: {
            tools: [{ googleSearch: {} }],
            responseMimeType: "application/json",
            responseSchema: { type: Type.ARRAY, items: gapSignalSchema }
        }
    });

    try {
        return JSON.parse(sanitizeJsonString(response.text || '[]'));
    } catch (error) {
        console.error('[GAP Scanner] JSON parse failed:', error);
        return [];
    }
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

    if (!supabase) {
        console.warn("[Screener] Supabase client unavailable.");
    } else {
        try {
            const { data, error } = await supabase
                .from('strategies')
                .select('*')
                .eq('market', market)
                .eq('is_active', true)
                .maybeSingle();

            const strategyData = data as any;

            if (strategyData && strategyData.genome) {
                activeGenome = strategyData.genome;
                strategyName = strategyData.name;
            } else if (error) {
                // PGRST116 is "The result contains 0 rows", which is expected if no active strategy exists.
                if (error.code !== 'PGRST116') {
                    console.warn("[Screener] Error fetching strategy:", error.message || error);
                }
            }
        } catch (e) {
            console.warn("[Screener] Failed to fetch active genome, using default.", e);
        }
    }

    // Default if DB fails or no active strategy
    if (!activeGenome) {
        activeGenome = {
            maShort: 20, maLong: 60, rsiPeriod: 14, rsiBuy: 35, rsiSell: 70,
            bbPeriod: 20, bbDev: 2, stochK: 14, stochD: 3, stopLoss: 0.07, takeProfit: 0.15
        };
    }

    const genome = activeGenome; // Alias for cleaner usage

    const prompt = `
    You are "The Hunter" - an AI implementation of an evolved trading strategy named "${strategyName}".
    
    **MISSION:**
    Find stocks in ${marketInfo[market].name} that match the specific technical conditions of your Genome.
    
    **YOUR GENOME (Technical DNA):**
    1. **Moving Average:** Short-term (${genome.maShort}) > Long-term (${genome.maLong}) OR Golden Cross imminent.
    2. **RSI Requirement:** RSI(${genome.rsiPeriod}) must be UNDER ${genome.rsiBuy} (Oversold Dip) OR Breaking out from 50.
    3. **Bollinger Bands:** Price touching Lower Band (Buy Dip) OR Breaking Upper Band (Momentum) - *Context dependent*.
    4. **Stochastic:** (${genome.stochK}, ${genome.stochD}) - K crossing D upwards in oversold zone (<20) is BEST.
    
    **Target Setup:** "Momentum Dip" or "Early Breakout".
    - Avoid stocks already skyrocketed > 30% in 1 week.
    - Focus on stocks with solid volume.

    **Execution:**
    - Search for: "KOSPI RSI 窸潺坐???圉�鴥?, "窸刺�?禺�??鮈�版 黺䇹�", "?欠�儥韠擪??窸刺�?禺�??鮈�版".
    - Analyze charts of candidates against your Genome logic.

    **Output JSON:**
    [
        {
            "ticker": "005930", 
            "stockName": "Samsung Elec", 
            "matchedPattern": "Golden Cross (MA${genome.maShort} > MA${genome.maLong}) + RSI ${genome.rsiPeriod} is 40.", 
            "currentPrice": 72000, 
            "aiConfidence": 88
        }
    ]
    `;

    try {
        const response = await generateContentWithRetry({
            model: "gemini-2.0-flash-001",
            contents: prompt,
            config: {
                // Enforce JSON schema
                responseMimeType: "application/json",
                responseSchema: genomeSignalSchema,
                tools: [{ googleSearch: {} }]
            }
        });

        return JSON.parse(sanitizeJsonString(response.text || '[]'));

    } catch (e) {
        console.error('[Genome Scanner] Execution failed:', e);
        return [];
    }
}

