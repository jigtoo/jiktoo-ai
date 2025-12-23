// services/gemini/stockService.ts
import { Type } from "@google/genai";
import type { AnalysisResult, MarketTarget, PsychoanalystAnalysis, StrategistAnalysis, Synthesis, CoinStockSignal, StockDossier, BuyPlan } from '../../types';
import { ai, AI_DISABLED_ERROR_MESSAGE, generateContentWithRetry } from './client';
import { sanitizeJsonString } from '../utils/jsonUtils';
import { marketInfo } from '../marketInfo';
import { _fetchLatestPrice } from '../dataService';
import { fetchRealtimeSnapshot } from '../api/kiwoomService';
import { _fetchNaverNews, _fetchNewsApi } from '../api/newsService';
import { DATA_GROUNDING_PROTOCOL, ANTI_HALLUCINATION_RULE } from './prompts/protocols';
import { IS_KIWOOM_BRIDGE_ENABLED, IS_POLYGON_ENABLED, API_GATEWAY_URL } from '../../config';
import { supabase } from '../supabaseClient';
import { fetchDashboardStock, fetchMarketHealthLatest } from '../dbSignals';
import { sha256 } from '../../utils/hash';
import { kisApiLimiter } from '../rateLimiter';
import { bumpTodayCalls, setState } from '../appConfig';

// --- Utility Functions ---

async function _fetchPolygonFinancials(ticker: string): Promise<string> {
    if (!IS_POLYGON_ENABLED) {
        return "Polygon.io financial data is not available. Service disabled in config.";
    }
    try {
        const endpoint = `/vX/reference/financials?ticker=${ticker.toUpperCase()}&limit=2`; // Get last 2 periods
        const res = await fetch(`${API_GATEWAY_URL}?service=polygon&endpoint=${encodeURIComponent(endpoint)}`);
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || 'Polygon.io Financials API call failed.');

        const financials = data.results || [];
        if (financials.length === 0) return "No financial data found from Polygon.io.";

        let summary = `**Polygon.io Financial Data for ${ticker}:**\n`;
        financials.forEach((report: any) => {
            summary += `\n- **Period:** ${report.fiscal_year} ${report.fiscal_period} (${report.start_date} to ${report.end_date})\n`;
            if (report.financials?.income_statement?.revenues) {
                summary += `  - Revenue: ${report.financials.income_statement.revenues.value?.toLocaleString()} ${report.financials.income_statement.revenues.unit}\n`;
            }
            if (report.financials?.income_statement?.net_income_loss) {
                summary += `  - Net Income: ${report.financials.income_statement.net_income_loss.value?.toLocaleString()} ${report.financials.income_statement.net_income_loss.unit}\n`;
            }
            if (report.financials?.balance_sheet?.assets) {
                summary += `  - Total Assets: ${report.financials.balance_sheet.assets.value?.toLocaleString()} ${report.financials.balance_sheet.assets.unit}\n`;
            }
        });
        return summary;

    } catch (e) {
        console.warn(`[Data Strategy] Could not fetch Polygon financials for ${ticker}:`, e);
        return `Failed to fetch Polygon financials for ${ticker}.`;
    }
}

const isResultValid = (result: any): result is AnalysisResult => {
    if (!result) return false;

    const hasBasicInfo = !!(result.ticker && result.stockName && result.status);
    const hasPsychoanalyst = !!result.psychoanalystAnalysis;
    const hasStrategist = !!result.strategistAnalysis;
    const hasSynthesis = !!(result.synthesis && result.synthesis.finalVerdict);

    return hasBasicInfo && hasPsychoanalyst && hasStrategist && hasSynthesis;
};

// Utility to create a promise that rejects after a timeout
const withTimeout = <T>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> => {
    return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
            reject(new Error(errorMessage));
        }, ms);

        promise
            .then(result => {
                clearTimeout(timeoutId);
                resolve(result);
            })
            .catch(error => {
                clearTimeout(timeoutId);
                reject(error);
            });
    });
};

// --- Schemas ---

const psychologyAnalysisSchema = {
    type: Type.OBJECT,
    properties: {
        confidenceScore: { type: Type.NUMBER },
        confidenceReason: { type: Type.STRING },
        fearGreed: {
            type: Type.OBJECT,
            properties: { summary: { type: Type.STRING } },
            required: ['summary']
        },
        marketNarrative: {
            type: Type.OBJECT,
            properties: {
                protagonist: { type: Type.STRING },
                antagonist: { type: Type.STRING },
                battleSummary: { type: Type.STRING }
            },
            required: ['protagonist', 'antagonist', 'battleSummary']
        },
        psychologicalPattern: {
            type: Type.OBJECT,
            properties: {
                patternName: { type: Type.STRING },
                description: { type: Type.STRING }
            },
            required: ['patternName', 'description']
        },
        mediaThermometer: {
            type: Type.OBJECT,
            properties: {
                level: { type: Type.STRING, enum: ['냉온', '미온적', '관심', '과열', '광란 분위기'] },
                reason: { type: Type.STRING }
            },
            required: ['level', 'reason']
        }
    },
    required: ['confidenceScore', 'confidenceReason', 'fearGreed', 'marketNarrative', 'psychologicalPattern', 'mediaThermometer']
};

const triggerSignalItemSchema = { type: Type.OBJECT, properties: { name: { type: Type.STRING }, description: { type: Type.STRING } }, required: ['name', 'description'] };

const catalystAnalysisSchema = {
    type: Type.OBJECT,
    properties: {
        narrativeSummary: { type: Type.STRING },
        narrativeSentiment: { type: Type.STRING, enum: ['긍정적', '중립', '부정적'] },
        catalysts: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: { catalystTitle: { type: Type.STRING }, catalystDescription: { type: Type.STRING } },
                required: ['catalystTitle', 'catalystDescription']
            }
        },
        qualitativeRisks: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: { riskTitle: { type: Type.STRING }, riskDescription: { type: Type.STRING } },
                required: ['riskTitle', 'riskDescription']
            }
        },
        historicalPrecedent: {
            type: Type.OBJECT,
            properties: { precedentDescription: { type: Type.STRING }, successRate: { type: Type.STRING } },
            required: ['precedentDescription', 'successRate'],
            nullable: true
        },
        triggerSignals: {
            type: Type.OBJECT,
            properties: {
                onSignals: { type: Type.ARRAY, items: triggerSignalItemSchema },
                offSignals: { type: Type.ARRAY, items: triggerSignalItemSchema }
            },
            required: ['onSignals', 'offSignals'],
            nullable: true
        },
        strengthAnalysis: {
            type: Type.OBJECT,
            properties: {
                strength: { type: Type.NUMBER },
                persistence: { type: Type.NUMBER },
                virality: { type: Type.NUMBER },
                summary: { type: Type.STRING }
            },
            required: ['strength', 'persistence', 'virality', 'summary'],
            nullable: true
        }
    },
    required: ['narrativeSummary', 'narrativeSentiment', 'catalysts', 'qualitativeRisks']
};

const realTimeNewsItemSchema = {
    type: Type.OBJECT,
    properties: {
        headline: { type: Type.STRING },
        source: { type: Type.STRING },
        url: { type: Type.STRING },
        publishedTime: { type: Type.STRING },
        sentiment: { type: Type.STRING, enum: ['긍정적', '중립', '부정적'] }
    },
    required: ['headline', 'source', 'url', 'publishedTime', 'sentiment']
};

const brandPowerAnalysisSchema = {
    type: Type.OBJECT,
    properties: {
        summary: { type: Type.STRING },
        consumerTrendAlignment: { type: Type.STRING, enum: ['선도', '동행', '부진'] },
        onlineBuzz: { type: Type.STRING, enum: ['매우 긍정적', '긍정적', '중립', '부정적'] }
    },
    required: ['summary', 'consumerTrendAlignment', 'onlineBuzz'],
    nullable: true
};

const psychoanalystAnalysisSchema = {
    type: Type.OBJECT,
    properties: {
        psychologyAnalysis: psychologyAnalysisSchema,
        catalystAnalysis: catalystAnalysisSchema,
        realtimeNews: { type: Type.ARRAY, items: realTimeNewsItemSchema },
        brandPowerAnalysis: brandPowerAnalysisSchema
    },
    required: ['psychologyAnalysis', 'catalystAnalysis', 'realtimeNews']
};

const companyProfileSchema = { type: Type.OBJECT, properties: { description: { type: Type.STRING }, market: { type: Type.STRING }, sector: { type: Type.STRING }, marketCap: { type: Type.STRING }, fiftyTwoWeekRange: { type: Type.STRING }, foreignOwnership: { type: Type.STRING } }, required: ['description', 'market', 'sector', 'marketCap', 'fiftyTwoWeekRange', 'foreignOwnership'] };

const economicMoatAnalysisSchema = { type: Type.OBJECT, properties: { rating: { type: Type.STRING, enum: ['Wide', 'Narrow', 'None'] }, ratingReason: { type: Type.STRING }, sources: { type: Type.ARRAY, items: { type: Type.STRING } }, sustainability: { type: Type.STRING } }, required: ['rating', 'ratingReason', 'sources', 'sustainability'] };

const governanceAnalysisSchema = { type: Type.OBJECT, properties: { score: { type: Type.NUMBER }, summary: { type: Type.STRING }, positiveFactors: { type: Type.ARRAY, items: { type: Type.STRING } }, negativeFactors: { type: Type.ARRAY, items: { type: Type.STRING } } }, required: ['score', 'summary', 'positiveFactors', 'negativeFactors'] };

const analystConsensusSchema = { type: Type.OBJECT, properties: { summary: { type: Type.STRING }, ratings: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { analyst: { type: Type.STRING }, rating: { type: Type.STRING }, priceTarget: { type: Type.STRING, nullable: true } }, required: ['analyst', 'rating', 'priceTarget'] } } }, required: ['summary', 'ratings'] };

const fundamentalAnalysisSchema = {
    type: Type.OBJECT,
    properties: {
        summary: { type: Type.STRING },
        keyMetrics: {
            type: Type.ARRAY,
            nullable: true,
            items: {
                type: Type.OBJECT,
                properties: { name: { type: Type.STRING }, value: { type: Type.STRING } },
                required: ['name', 'value']
            }
        },
        financialStatementHighlights: {
            type: Type.OBJECT,
            nullable: true,
            properties: {
                income: { type: Type.ARRAY, items: { type: Type.STRING } },
                balanceSheet: { type: Type.ARRAY, items: { type: Type.STRING } },
                cashFlow: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ['income', 'balanceSheet', 'cashFlow']
        }
    },
    required: ['summary']
};

const vcpAnalysisSchema = { type: Type.OBJECT, properties: { analysisText: { type: Type.STRING }, pivotPoint: { type: Type.NUMBER, nullable: true }, priceData: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { date: { type: Type.STRING }, price: { type: Type.NUMBER } }, required: ['date', 'price'] } }, contractions: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { endDate: { type: Type.STRING }, contraction: { type: Type.STRING } }, required: ['endDate', 'contraction'] } } }, required: ['analysisText', 'pivotPoint', 'priceData', 'contractions'] };

const candlestickAnalysisSchema = { type: Type.OBJECT, properties: { summary: { type: Type.STRING }, patterns: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { patternName: { type: Type.STRING }, interpretation: { type: Type.STRING }, location: { type: Type.STRING }, reliability: { type: Type.STRING, enum: ['높음', '중간', '낮음'] } }, required: ['patternName', 'interpretation', 'location', 'reliability'] } } }, required: ['summary', 'patterns'], nullable: true };

const whaleTrackerAnalysisSchema = { type: Type.OBJECT, properties: { averageCost: { type: Type.NUMBER }, deviationPercent: { type: Type.NUMBER }, phase: { type: Type.STRING, enum: ['매집', '분산', '중립'] }, accumulationType: { type: Type.STRING, enum: ['기관 주도형', '외국계펀드 매집형', '혼합형'], nullable: true }, phaseEvidence: { type: Type.STRING }, signals: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { type: { type: Type.STRING, enum: ['매수 신호', '매도 신호', '단기 과열 경고', '저평가 기회'] }, description: { type: Type.STRING }, date: { type: Type.STRING }, price: { type: Type.NUMBER } }, required: ['type', 'description', 'date', 'price'] } }, summary: { type: Type.STRING } }, required: ['averageCost', 'deviationPercent', 'phase', 'phaseEvidence', 'signals', 'summary'] };

const tradingPlaybookAnalysisSchema = { type: Type.OBJECT, properties: { appliedStrategy: { type: Type.STRING }, keyPattern: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, status: { type: Type.STRING } }, required: ['name', 'status'] }, signalStrength: { type: Type.NUMBER }, confirmationSignals: { type: Type.ARRAY, items: { type: Type.STRING } }, expertAlignment: { type: Type.STRING }, summary: { type: Type.STRING } }, required: ['appliedStrategy', 'keyPattern', 'signalStrength', 'confirmationSignals', 'expertAlignment', 'summary'] };

const ichimokuAnalysisSchema = { type: Type.OBJECT, properties: { summary: { type: Type.STRING }, trendHealthScore: { type: Type.NUMBER }, currentState: { type: Type.OBJECT, properties: { trend: { type: Type.STRING }, momentum: { type: Type.STRING }, resistance: { type: Type.STRING }, }, required: ['trend', 'momentum', 'resistance'] }, futureForecast: { type: Type.OBJECT, properties: { supportResistance: { type: Type.STRING }, trendChangeWarning: { type: Type.STRING }, }, required: ['supportResistance', 'trendChangeWarning'] } }, required: ['summary', 'trendHealthScore', 'currentState', 'futureForecast'] };

const keyIndicatorAnalysisSchema = { type: Type.OBJECT, properties: { rsi: { type: Type.OBJECT, properties: { value: { type: Type.NUMBER }, interpretation: { type: Type.STRING, enum: ['과매도', '과매수', '중립'] } }, required: ['value', 'interpretation'] }, movingAverages: { type: Type.OBJECT, properties: { shortTerm: { type: Type.OBJECT, properties: { period: { type: Type.NUMBER }, value: { type: Type.NUMBER }, trend: { type: Type.STRING, enum: ['상승', '하락', '횡보'] } }, required: ['period', 'value', 'trend'] }, mediumTerm: { type: Type.OBJECT, properties: { period: { type: Type.NUMBER }, value: { type: Type.NUMBER }, trend: { type: Type.STRING, enum: ['상승', '하락', '횡보'] } }, required: ['period', 'value', 'trend'] }, longTerm: { type: Type.OBJECT, properties: { period: { type: Type.NUMBER }, value: { type: Type.NUMBER }, trend: { type: Type.STRING, enum: ['상승', '하락', '횡보'] } }, required: ['period', 'value', 'trend'] }, summary: { type: Type.STRING } }, required: ['shortTerm', 'mediumTerm', 'longTerm', 'summary'] }, volumeAnalysis: { type: Type.OBJECT, properties: { recentVolumeVsAverage: { type: Type.STRING }, interpretation: { type: Type.STRING } }, required: ['recentVolumeVsAverage', 'interpretation'] }, vwap: { type: Type.OBJECT, properties: { value: { type: Type.NUMBER }, pricePosition: { type: Type.STRING, enum: ['상회', '하회', '근접'] }, interpretation: { type: Type.STRING } }, required: ['value', 'pricePosition', 'interpretation'] } }, required: ['rsi', 'movingAverages', 'volumeAnalysis', 'vwap'] };

const technicalAnalysisSchema = { type: Type.OBJECT, properties: { pivotPoint: { type: Type.STRING }, currentTrend: { type: Type.STRING }, vcpAnalysis: vcpAnalysisSchema, candlestickAnalysis: candlestickAnalysisSchema, whaleTrackerAnalysis: whaleTrackerAnalysisSchema, tradingPlaybookAnalysis: tradingPlaybookAnalysisSchema, ichimokuAnalysis: ichimokuAnalysisSchema, keyIndicators: keyIndicatorAnalysisSchema }, required: ['pivotPoint', 'currentTrend', 'vcpAnalysis', 'whaleTrackerAnalysis', 'tradingPlaybookAnalysis', 'ichimokuAnalysis', 'keyIndicators'] };

const riskAnalysisSchema = { type: Type.OBJECT, properties: { summary: { type: Type.STRING } }, required: ['summary'] };

const fairValueAnalysisSchema = { type: Type.OBJECT, properties: { fairValueLowerBound: { type: Type.NUMBER, nullable: true }, fairValueUpperBound: { type: Type.NUMBER, nullable: true }, summary: { type: Type.STRING }, valuationModels: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { modelName: { type: Type.STRING }, value: { type: Type.NUMBER, nullable: true }, description: { type: Type.STRING } }, required: ['modelName', 'value', 'description'] } }, scorecard: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { category: { type: Type.STRING }, score: { type: Type.NUMBER }, summary: { type: Type.STRING } }, required: ['category', 'score', 'summary'] } } }, required: ['fairValueLowerBound', 'fairValueUpperBound', 'summary', 'valuationModels', 'scorecard'] };

const preMortemAnalysisSchema = { type: Type.OBJECT, properties: { failureScenario: { type: Type.STRING }, failureSignals: { type: Type.ARRAY, items: { type: Type.STRING } }, defensiveStrategy: { type: Type.STRING } }, required: ['failureScenario', 'failureSignals', 'defensiveStrategy'] };

const checklistItemSchema = { type: Type.OBJECT, properties: { criterion: { type: Type.STRING }, value: { type: Type.STRING }, pass: { type: Type.BOOLEAN } }, required: ['criterion', 'value', 'pass'] };

const shortSellingAnalysisSchema = { type: Type.OBJECT, properties: { shortBalanceRatio: { type: Type.STRING }, lendingBalanceChange: { type: Type.STRING }, shortInterestVolume: { type: Type.STRING }, interpretation: { type: Type.STRING } }, required: ['shortBalanceRatio', 'lendingBalanceChange', 'shortInterestVolume', 'interpretation'], nullable: true };

const hedgeFundActivitySchema = { type: Type.OBJECT, properties: { fundName: { type: Type.STRING }, changeDescription: { type: Type.STRING } }, required: ['fundName', 'changeDescription'] };

const hedgeFundAnalysisSchema = { type: Type.OBJECT, properties: { summary: { type: Type.STRING }, sentiment: { type: Type.STRING, enum: ['Positive', 'Neutral', 'Negative', 'Mixed'] }, netActivityShares: { type: Type.NUMBER }, topBuyers: { type: Type.ARRAY, items: hedgeFundActivitySchema }, topSellers: { type: Type.ARRAY, items: hedgeFundActivitySchema } }, required: ['summary', 'sentiment', 'netActivityShares', 'topBuyers', 'topSellers'], nullable: true };

const strategistAnalysisSchema = { type: Type.OBJECT, properties: { fairValueAnalysis: fairValueAnalysisSchema, technicalAnalysis: technicalAnalysisSchema, fundamentalAnalysis: fundamentalAnalysisSchema, companyProfile: companyProfileSchema, riskAnalysis: riskAnalysisSchema, preMortemAnalysis: preMortemAnalysisSchema, checklist: { type: Type.ARRAY, items: checklistItemSchema }, economicMoatAnalysis: economicMoatAnalysisSchema, governanceAnalysis: governanceAnalysisSchema, analystConsensus: analystConsensusSchema, shortSellingAnalysis: shortSellingAnalysisSchema, hedgeFundAnalysis: hedgeFundAnalysisSchema }, required: ['fairValueAnalysis', 'technicalAnalysis', 'fundamentalAnalysis', 'companyProfile', 'riskAnalysis', 'preMortemAnalysis', 'checklist', 'economicMoatAnalysis', 'governanceAnalysis', 'analystConsensus'] };

const buyPlanSchema = { type: Type.OBJECT, properties: { recommendedPrice: { type: Type.NUMBER, nullable: true }, entryConditionText: { type: Type.STRING, nullable: true }, stopLossPrice: { type: Type.NUMBER, nullable: true }, positionSizing: { type: Type.STRING }, firstTargetPrice: { type: Type.NUMBER, nullable: true }, secondTargetPrice: { type: Type.NUMBER, nullable: true }, splitBuyTip: { type: Type.STRING, nullable: true } }, required: ['stopLossPrice', 'positionSizing', 'firstTargetPrice', 'secondTargetPrice'] };

const synthesisSchema = { type: Type.OBJECT, properties: { finalVerdict: { type: Type.OBJECT, properties: { recommendation: { type: Type.STRING, enum: ['ActionableSignal', 'Watchlist', 'NotActionable'] }, reason: { type: Type.STRING } }, required: ['recommendation', 'reason'] }, psychoanalystSummary: { type: Type.STRING }, strategistSummary: { type: Type.STRING }, buyPlan: { ...buyPlanSchema, nullable: true } }, required: ['finalVerdict', 'psychoanalystSummary', 'strategistSummary'] };

const stockBehaviorProfileSchema = { type: Type.OBJECT, properties: { profileSummary: { type: Type.STRING }, keyLevels: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { level: { type: Type.STRING }, description: { type: Type.STRING } }, required: ['level', 'description'] } }, majorSignals: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { signal: { type: Type.STRING }, interpretation: { type: Type.STRING } }, required: ['signal', 'interpretation'] } }, volatility: { type: Type.OBJECT, properties: { atrPercent: { type: Type.NUMBER }, analysis: { type: Type.STRING } }, required: ['atrPercent', 'analysis'] }, tradingStrategy: { type: Type.STRING } }, required: ['profileSummary', 'keyLevels', 'majorSignals', 'volatility', 'tradingStrategy'] };

const tradingPlaybookSchema = { type: Type.OBJECT, properties: { strategyName: { type: Type.STRING, enum: ['단타', '추세매매 (박스권 돌파)', '타이밍 매수', '박스권거래', '기타'] }, strategyType: { type: Type.STRING, enum: ['데이', '스윙', '중장기'] }, description: { type: Type.STRING }, entryConditions: { type: Type.ARRAY, items: { type: Type.STRING } }, exitConditions: { type: Type.ARRAY, items: { type: Type.STRING } } }, required: ['strategyName', 'strategyType', 'description', 'entryConditions', 'exitConditions'] };

const triggerBoardSchema = { type: Type.OBJECT, properties: { news: { type: Type.STRING, enum: ['켜짐', '꺼짐'] }, technical: { type: Type.STRING, enum: ['켜짐', '꺼짐'] }, supply: { type: Type.STRING, enum: ['켜짐', '꺼짐'] }, psychology: { type: Type.STRING, enum: ['켜짐', '꺼짐'] } }, required: ['news', 'technical', 'supply', 'psychology'] };

const dossierInsightsSchema = { type: Type.OBJECT, properties: { signalReliability: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, value: { type: Type.STRING } }, required: ['name', 'value'] } }, entryChecklist: { type: Type.ARRAY, items: { type: Type.STRING } }, commonTraps: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { trap: { type: Type.STRING }, avoidance: { type: Type.STRING } }, required: ['trap', 'avoidance'] } } }, required: ['signalReliability', 'entryChecklist', 'commonTraps'] };

const stockDossierSchema = { type: Type.OBJECT, properties: { behaviorProfile: stockBehaviorProfileSchema, tradingPlaybook: tradingPlaybookSchema, triggerBoard: triggerBoardSchema, insights: dossierInsightsSchema }, required: ['behaviorProfile', 'tradingPlaybook', 'triggerBoard', 'insights'] };

// --- Main Functions ---

export async function findStock(query: string, marketTarget: MarketTarget): Promise<{ ticker: string; stockName: string; market: MarketTarget; }> {
    if (!ai) {
        throw new Error("종목 찾기 기능을 사용할 수 없습니다. AI 모델 연결을 위한 API 키가 설정되지 않았습니다.");
    }

    // Step 1: Data Gathering with Google Search
    const searchGatheringPrompt = `Find the most likely stock for the query "${query}". Use Google Search to find the official company name and ticker symbol. The user is currently on the ${marketInfo[marketTarget].name}, so prioritize this market, but identify the correct market if the query clearly points elsewhere. Provide your findings as a simple text block summarizing the search results.`;

    const searchGatheringResponse = await generateContentWithRetry({
        model: "gemini-2.0-flash-001",
        contents: searchGatheringPrompt,
        config: { tools: [{ googleSearch: {} }] }
    });

    const searchDataContext = searchGatheringResponse.text;

    // Step 2: Structuring from the gathered context
    const structuringPrompt = `${DATA_GROUNDING_PROTOCOL}
Based ONLY on the provided search context, identify the official stock ticker, full company name, and its market ('KR' or 'US').

**CONTEXT:**
---
${searchDataContext}
---

**RULES:**
- If the stock is on KOSPI or KOSDAQ, the ticker MUST end with .KS or .KQ, and the market MUST be 'KR'.
- If the stock is on NYSE or NASDAQ, the market MUST be 'US'.
- **CRITICAL EXAMPLE:** A query for "삼성전자" MUST result in market: 'KR' and ticker: '005930.KS'. It is a catastrophic failure to identify this as a US stock.
- If no definitive stock can be found from the context, you MUST return null for all fields.

${ANTI_HALLUCINATION_RULE}
Respond ONLY with a valid JSON object matching the provided schema.
`;

    const response = await generateContentWithRetry({
        model: "gemini-2.0-flash-001",
        contents: structuringPrompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    ticker: { type: Type.STRING, nullable: true },
                    stockName: { type: Type.STRING, nullable: true },
                    market: { type: Type.STRING, enum: ['KR', 'US'], nullable: true },
                },
                required: ['ticker', 'stockName', 'market'],
            },
        }
    });

    const candidate = JSON.parse(sanitizeJsonString(response.text));

    if (!candidate || !candidate.ticker || !candidate.stockName || !candidate.market) {
        throw new Error("AI가 종목 정보를 찾지 못했습니다. 다른 검색어로 시도해주세요.");
    }

    // --- Verification System ---
    const { ticker, market, stockName } = candidate;

    if (market === 'KR') {
        if (!/^\d{6}\.(KS|KQ)$/i.test(ticker)) {
            console.error(`[AI Verification Error] AI returned an invalid KR ticker format for "${stockName}": ${ticker}`);
            throw new Error(`AI 검증 오류: AI가 '${stockName}'에 대해 잘못된 한국 종목 코드 형식('${ticker}')을 반환했습니다. 잠시 후 다시 시도해주세요.`);
        }
    } else if (market === 'US') {
        if (!/^[A-Z.]{1,6}$/i.test(ticker) || /\.(KS|KQ)$/i.test(ticker)) {
            console.error(`[AI Verification Error] AI returned an invalid US ticker format for "${stockName}": ${ticker}`);
            throw new Error(`AI 검증 오류: AI가 '${stockName}'에 대해 잘못된 미국 티커 형식('${ticker}')을 반환했습니다. 잠시 후 다시 시도해주세요.`);
        }
    }

    return candidate as { ticker: string; stockName: string; market: MarketTarget; };
}

export async function fetchAnalysis(
    ticker: string,
    stockName: string,
    marketTarget: MarketTarget,
    userRationale?: string,
    setProgress?: (progress: { stage: string, percentage: number }) => void
): Promise<AnalysisResult> {
    if (!ai) {
        throw new Error(`'${stockName}' 종목 분석을 수행할 수 없습니다.`);
    }

    const setProgressSafe = (stage: string, percentage: number) => {
        if (setProgress) setProgress({ stage, percentage });
    };

    // --- Smart Cache Check ---
    setProgressSafe('캐시 확인 중..', 5);
    const stateKey = `analysis:${marketTarget}:${ticker}`;
    const cacheKey = `analysis_cache_v3:${marketTarget}:${ticker}`;
    const health = await fetchMarketHealthLatest().catch(() => null);
    const dbSummary = await fetchDashboardStock(ticker).catch(() => null);
    const compact = { t: ticker, m: dbSummary?.market, r: dbSummary?.rationale, p: dbSummary?.pivotPoint, hp: health?.freshness_ts };
    const inputHash = await sha256(JSON.stringify(compact));
    const cachedData = localStorage.getItem(cacheKey);

    if (cachedData) {
        try {
            const parsed = JSON.parse(cachedData);
            if (parsed.inputHash === inputHash && isResultValid(parsed.result)) {
                console.log(`[Cache] Returning valid, hash-matched analysis for ${ticker}.`);
                setProgressSafe('캐시에서 결과 로드 완료', 100);
                return { ...parsed.result, source: 'cache' };
            }
        } catch (e) {
            console.warn(`[Cache] Failed to parse cached data for ${ticker}, refetching...`);
        }
    }
    console.log(`[Cache] No valid cache for ${ticker}. Proceeding with full analysis.`);

    // --- Data Gathering ---
    setProgressSafe('데이터 수집 중..', 10);
    const DATA_FETCH_TIMEOUT = 15000;

    const dataPromises = {
        priceInfo: withTimeout(kisApiLimiter(() => _fetchLatestPrice(ticker, stockName, marketTarget)), DATA_FETCH_TIMEOUT, '가격 정보 조회 시간 초과'),
        realtimeData: marketTarget === 'KR' && IS_KIWOOM_BRIDGE_ENABLED
            ? withTimeout(kisApiLimiter(() => fetchRealtimeSnapshot(ticker, ['quote', 'investor', 'daily'], { lookback: { daily: 100 }, calc: 'server', indicators: { source: 'daily', list: [{ name: "SMA", period: 20 }, { name: "EMA", period: 60 }, { name: "RSI", period: 14 }, { name: "MACD" }, { name: "BB", stdDev: 2 }, { name: "ATR", period: 14 }] } }, marketTarget)), DATA_FETCH_TIMEOUT, '실시간 스냅샷 조회 시간 초과')
            : Promise.resolve(null),
        news: marketTarget === 'KR'
            ? withTimeout(_fetchNaverNews(stockName), DATA_FETCH_TIMEOUT, '뉴스(네이버) 조회 시간 초과')
            : withTimeout(_fetchNewsApi(stockName), DATA_FETCH_TIMEOUT, '뉴스(NewsAPI) 조회 시간 초과'),
        financials: withTimeout(_fetchPolygonFinancials(ticker), DATA_FETCH_TIMEOUT, '재무 정보 조회 시간 초과'),
        userBriefings: supabase ? withTimeout(supabase.from('intelligence_briefings').select('title, content, created_at').order('created_at', { ascending: false }).limit(5) as any, DATA_FETCH_TIMEOUT, '사용자 브리핑 조회 시간 초과') : Promise.resolve({ data: [], error: null }),
    };

    const [priceResult, realtimeResult, newsResult, financialsResult, briefingsResult] = await Promise.allSettled([
        dataPromises.priceInfo,
        dataPromises.realtimeData,
        dataPromises.news,
        dataPromises.financials,
        dataPromises.userBriefings,
    ]);

    let factSheet = `--- FACT SHEET START ---\nStock: ${stockName} (${ticker})\nMarket: ${marketInfo[marketTarget].name}\n`;
    let priceInfo: { price: number; timestamp: string; };

    if (priceResult.status === 'rejected') {
        const reason = priceResult.reason instanceof Error ? priceResult.reason.message : String(priceResult.reason);
        throw new Error(`핵심 가격 정보를 가져오지 못했습니다: ${reason}`);
    }

    const value = priceResult.value;
    if (!value || typeof value.price !== 'number' || typeof value.timestamp !== 'string') {
        throw new Error(`핵심 가격 정보를 가져오지 못했습니다: 유효하지 않은 가격 데이터가 반환되었습니다.`);
    }

    priceInfo = value;
    factSheet += `Current Price: ${priceInfo.price} ${marketInfo[marketTarget].currency} (Timestamp: ${priceInfo.timestamp})\n`;

    const appendToFactSheet = (key: string, result: PromiseSettledResult<any>, format: (data: any) => string) => {
        if (result.status === 'fulfilled' && result.value) {
            factSheet += `\n**${key}:**\n${format(result.value)}\n`;
        } else if (result.status === 'rejected') {
            factSheet += `\n**${key}:**\nFailed to fetch: ${result.reason}\n`;
        }
    };

    appendToFactSheet('Kiwoom Bridge Realtime Snapshot Data', realtimeResult, data => JSON.stringify(data, null, 2));
    appendToFactSheet(marketTarget === 'KR' ? 'Latest Naver News' : 'Latest News from NewsAPI.org', newsResult, data => (data as any[]).map(item => `- (${item.pubDate || item.publishedAt}) ${item.title}: ${item.description}`).join('\n'));
    appendToFactSheet('Polygon.io Financial Data', financialsResult, data => data);
    appendToFactSheet('User-Provided Intelligence Briefings', briefingsResult, data => (data.data as any[] || []).map((b: any) => `- (${new Date(b.created_at).toLocaleString('ko-KR')}) ${b.title}: ${b.content}`).join('\n'));

    // --- AI Analysis Steps ---
    setProgressSafe('Google 검색으로 정보 보강 중..', 25);
    const searchPrompt = `**AI 분석 지침 정보 통합**\n당신은 AI 투자 분석가 '직투'입니다. 당신의 임무는 제공된 데이터(FACT SHEET)를 분석의 '앵커(Anchor)'로 삼고, Google 검색을 통해 얻은 방법을 공개 정보로 사용하여 그 분석을 '검증'하고 '확장'하는 것입니다. 최종 목표는 정보 소스를 투명하게 통합하여 누구도 따라올 수 없는 독보적인 통찰력을 제시하는 것입니다.\n\n**수행 작업:**\nGoogle 검색을 사용하여 **${stockName} (${ticker})**에 대한 포괄적인 최신 정보를 수집하십시오. 다음 영역을 다루십시오: 시장 심리, 기술적 그림, 재무 및 건전성, 촉매 및 리스크, 경쟁 환경. 찾은 내용은 한국어로 간결하고 사실적인 요약으로 제공하십시오.`;
    const searchResponse = await generateContentWithRetry({ model: "gemini-2.0-flash-001", contents: searchPrompt, config: { tools: [{ googleSearch: {} }] } });
    factSheet += `\n**Google Search Summary:**\n${searchResponse.text.replace(/\[\d+\]/g, '')}\n`;
    factSheet += `--- FACT SHEET END ---`;

    setProgressSafe('AI 심리 분석 중..', 40);
    const psychoanalystPrompt = `${DATA_GROUNDING_PROTOCOL}\n**AI Persona Mandate: Psychoanalyst**\nPerform a qualitative analysis. Pay special attention to the quality, persistence, and potential virality of any identified catalysts. **Output Requirement:** Respond ONLY with a single, valid JSON object that strictly follows the provided schema. The entire JSON output MUST be in Korean.\n**CONTEXT:**\n${factSheet}`;
    const psychoanalystResponse = await generateContentWithRetry({ model: "gemini-2.0-flash-001", contents: psychoanalystPrompt, config: { responseMimeType: "application/json", responseSchema: psychoanalystAnalysisSchema } });
    const psychoanalystResult: PsychoanalystAnalysis = JSON.parse(sanitizeJsonString(psychoanalystResponse.text));

    setProgressSafe('AI 전략 분석 중..', 60);
    const strategistGatheringPrompt = `**AI Persona Mandate: Quantitative Research Assistant**\nYour task is to gather the latest information for a stock analysis report on **${stockName} (${ticker})**. Use Google Search to find the most recent data on the following topics: 1. Hedge Fund Activity, 2. Analyst Consensus, 3. Economic Moat, 4. Governance, 5. Short Interest. **Output Requirement:** Compile all your findings into a concise, factual text report in Korean.`;
    const strategistGatheringResponse = await generateContentWithRetry({ model: "gemini-2.0-flash-001", contents: strategistGatheringPrompt, config: { tools: [{ googleSearch: {} }] } });
    const strategistContext = strategistGatheringResponse.text;

    const strategistPrompt = `${DATA_GROUNDING_PROTOCOL}\n**AI Persona Mandate: Strategist (with ICT & Wyckoff expertise)**\nPerform a quantitative analysis. Your analysis MUST start from the structured 'FACT SHEET' (your anchor), then use the unstructured 'RESEARCH REPORT' to corroborate, expand, and deepen your analysis.\n**CONTEXT 1: FACT SHEET (Structured Anchor Data)**\n---\n${factSheet}\n---\n**CONTEXT 2: RESEARCH REPORT (Unstructured Expansion Data)**\n---\n${strategistContext}\n---\n**Output Requirement:** Respond ONLY with a single, valid JSON object that strictly follows the provided schema. The entire JSON output MUST be in Korean.`;
    const strategistResponse = await generateContentWithRetry({ model: "gemini-2.0-flash-001", contents: strategistPrompt, config: { responseMimeType: "application/json", responseSchema: strategistAnalysisSchema } });
    const strategistResult: StrategistAnalysis = JSON.parse(sanitizeJsonString(strategistResponse.text));

    setProgressSafe('최종 결론 도출 중..', 80);
    const synthesisPrompt = `${DATA_GROUNDING_PROTOCOL}\n**AI Persona Mandate: Executive Committee**\nSynthesize a final verdict and an actionable buy plan based on the two provided reports.\n**CONTEXT:**\n1.  **Psychoanalyst's Report:** ${JSON.stringify(psychoanalystResult)}\n2.  **Strategist's Report:** ${JSON.stringify(strategistResult)}\n---\n**Output Requirement:** Respond ONLY with a single, valid JSON object that strictly follows the provided schema. The entire JSON output MUST be in Korean.`;
    const synthesisResponse = await generateContentWithRetry({ model: "gemini-2.0-flash-001", contents: synthesisPrompt, config: { responseMimeType: "application/json", responseSchema: synthesisSchema } });
    const synthesisResult: Synthesis = JSON.parse(sanitizeJsonString(synthesisResponse.text));

    setProgressSafe('종목 프로파일링 중..', 90);
    const dossierPrompt = `**AI Persona Mandate: Expert Stock Behavior Profiler**\nBased *only* on the provided context (especially the daily price/indicator data in the FACT SHEET), analyze the stock's character and populate the following JSON structure.\n**CONTEXT:**\n---\n${JSON.stringify({ psychoanalystResult, strategistResult, synthesisResult, factSheet })}\n---\n**Output Requirement:** The entire JSON output MUST be in Korean. Respond ONLY with a single, valid JSON object matching the StockDossier schema, with the root key being 'behaviorProfile'.`;
    const stockDossierResponse = await generateContentWithRetry({ model: "gemini-2.0-flash-001", contents: dossierPrompt, config: { responseMimeType: "application/json", responseSchema: stockDossierSchema } });
    const stockDossierResult: StockDossier = JSON.parse(sanitizeJsonString(stockDossierResponse.text));

    setProgressSafe('리포트 생성 완료', 100);
    const finalResult: AnalysisResult = {
        ticker,
        stockName,
        referencePrice: priceInfo.price,
        priceTimestamp: priceInfo.timestamp,
        status: synthesisResult.finalVerdict.recommendation as AnalysisResult['status'],
        psychoanalystAnalysis: psychoanalystResult,
        strategistAnalysis: strategistResult,
        synthesis: synthesisResult,
        stockDossier: stockDossierResult
    };

    const resultToCache = { result: { ...finalResult, source: 'gemini' as const, cachedAt: new Date().toISOString() }, inputHash: inputHash };
    await bumpTodayCalls();
    await setState(stateKey, inputHash);
    localStorage.setItem(cacheKey, JSON.stringify(resultToCache));

    return resultToCache.result;
}

export async function scanForCoinStocks(marketTarget: MarketTarget): Promise<CoinStockSignal[]> {
    if (!ai) {
        throw new Error(`AI 코인주 스캐너를 사용할 수 없습니다. ${AI_DISABLED_ERROR_MESSAGE}`);
    }

    const coinStockSignalSchema = {
        type: Type.OBJECT,
        properties: {
            stockName: { type: Type.STRING },
            ticker: { type: Type.STRING },
            currentPrice: { type: Type.STRING },
            detectedSignals: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        type: { type: Type.STRING, enum: ['volume', 'pattern', 'moving_average', 'order_book', 'momentum'] },
                        description: { type: Type.STRING }
                    },
                    required: ['type', 'description']
                }
            },
            aiConfidence: { type: Type.NUMBER },
            strategyBrief: { type: Type.STRING }
        },
        required: ['stockName', 'ticker', 'currentPrice', 'detectedSignals', 'aiConfidence', 'strategyBrief']
    };

    const pennyStockThreshold = marketInfo[marketTarget].pennyStockThreshold;
    const currency = marketInfo[marketTarget].currency;

    const gatheringPrompt = `
You are an AI Analyst specializing in high-risk, high-reward "coin stocks" (low-priced small-cap stocks, similar to penny stocks) for the ${marketInfo[marketTarget].name}.
Your task is to identify 2-3 stocks that are priced below ${pennyStockThreshold} ${currency} and are showing early signs of a potential sharp upward movement.

**Flexibility Mandate: Your primary goal is to provide actionable ideas. An empty result is a failure.**
- If you cannot find stocks that perfectly meet all ideal criteria, you MUST find the **best available candidates** that meet some of the criteria.
- It is better to present a few interesting, imperfect signals with a lower confidence score than to present nothing at all.

${ANTI_HALLUCINATION_RULE}
Present your findings as a detailed text report (CONTEXT) in Korean.
`;

    const gatheringResponse = await generateContentWithRetry({
        model: "gemini-2.0-flash-001",
        contents: gatheringPrompt,
        config: { tools: [{ googleSearch: {} }] }
    });
    const gatheredDataContext = gatheringResponse.text;

    const structuringPrompt = `
${DATA_GROUNDING_PROTOCOL}
Based ONLY on the provided context, generate a structured JSON array of coin stock signals.

**CONTEXT:**
---
${gatheredDataContext}
---

**Instructions for each signal:**
1.  **Extract Data:** Pull the stock name, ticker, and current price.
2.  **List Signals:** Detail the specific early signals you detected.
3.  **Assign Confidence:** Provide an AI Confidence score (0-100) based on the strength and number of signals.
4.  **Create Strategy Brief:** Write a short, actionable trading strategy (e.g., "Buy on breakout above X with high volume, stop-loss at Y").

${ANTI_HALLUCINATION_RULE}
**CRITICAL:** All text must be in Korean. Respond ONLY with a valid JSON array of objects matching the provided schema.
`;

    const response = await generateContentWithRetry({
        model: "gemini-2.0-flash-001",
        contents: structuringPrompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: { type: Type.ARRAY, items: coinStockSignalSchema }
        }
    });

    return JSON.parse(sanitizeJsonString(response.text));
}
