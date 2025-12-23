// services/gemini/aiTraderService.ts

import { SchemaType } from "@google/generative-ai";
import type { AITurnDecision, AIPortfolioState, MarketHealth, DashboardStock, AITurnType, AITraderDiagnosis, AITradeLogEntry, MarketTarget } from '../../types';
import { ai, AI_DISABLED_ERROR_MESSAGE, generateContentWithRetry } from './client';
import { sanitizeJsonString } from '../utils/jsonUtils';
import { ANTI_HALLUCINATION_RULE } from './prompts/protocols';

export async function fetchAITurnDecision(portfolio: AIPortfolioState, marketHealth: MarketHealth | null, candidates: DashboardStock[] | null, turnType: AITurnType, marketTarget: MarketTarget): Promise<AITurnDecision> {
    if (!ai) throw new Error(`AI ?몃젅?대뜑 湲곕뒫???ъ슜?????놁뒿?덈떎. ${AI_DISABLED_ERROR_MESSAGE}`);

    const decisionSchema = {
        type: SchemaType.OBJECT,
        properties: {
            trades: {
                type: SchemaType.ARRAY,
                items: {
                    type: SchemaType.OBJECT,
                    properties: {
                        type: { type: SchemaType.STRING, enum: ['buy', 'sell'] },
                        ticker: { type: SchemaType.STRING },
                        stockName: { type: SchemaType.STRING },
                        quantity: { type: SchemaType.NUMBER },
                        price: { type: SchemaType.NUMBER },
                        reason: { type: SchemaType.STRING },
                        decisionBriefing: {
                            type: SchemaType.OBJECT,
                            properties: {
                                marketSituation: { type: SchemaType.STRING },
                                candidateComparison: { type: SchemaType.STRING },
                                coreReasoning: { type: SchemaType.STRING },
                                riskAssessment: { type: SchemaType.STRING },
                            },
                            required: ['marketSituation', 'candidateComparison', 'coreReasoning', 'riskAssessment']
                        }
                    },
                    required: ['type', 'ticker', 'stockName', 'quantity', 'price', 'reason', 'decisionBriefing']
                }
            },
            overallReason: { type: SchemaType.STRING }
        },
        required: ['trades', 'overallReason']
    };

    const prompt = `
    You are a sophisticated AI Trader managing a portfolio with a '${portfolio.investmentStyle}' style.
    
    **Current Portfolio State:** ${JSON.stringify(portfolio)}
    
    **Market Health:** ${JSON.stringify(marketHealth)}
    
    **New Candidates:** ${JSON.stringify(candidates)}
    
    **Turn Type:** ${turnType}
    
    **Your Task:**
    Based on all available data, make trading decisions (buy, sell, or hold).
    - Follow your investment style strictly.
    - Justify every decision with a clear, detailed briefing.
    - If you decide to do nothing, explain why in the 'overallReason' and return an empty trades array.
    - All text must be in Korean.
    
    ${ANTI_HALLUCINATION_RULE}
    
    **Output Requirement:**
    Respond ONLY with a valid JSON object matching the provided schema.`;

    try {
        const response = await generateContentWithRetry({
            model: "gemini-2.0-flash-001",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: decisionSchema,
            }
        });
        return JSON.parse(sanitizeJsonString(response.response.text()));
    } catch (error) {
        console.error('[AITrader] Turn Decision Failed:', error);
        throw error;
    }
}

export async function fetchAITraderDiagnosis(portfolio: AIPortfolioState, logs: AITradeLogEntry[], marketTarget: MarketTarget): Promise<AITraderDiagnosis> {
    if (!ai) throw new Error(`AI ?몃젅?대뜑 吏꾨떒 湲곕뒫???ъ슜?????놁뒿?덈떎. ${AI_DISABLED_ERROR_MESSAGE}`);

    const diagnosisSchema = {
        type: SchemaType.OBJECT,
        properties: {
            diagnosisScore: { type: SchemaType.NUMBER },
            summary: { type: SchemaType.STRING },
            strengths: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
            weaknesses: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
            recommendations: {
                type: SchemaType.ARRAY,
                items: {
                    type: SchemaType.OBJECT,
                    properties: {
                        title: { type: SchemaType.STRING },
                        description: { type: SchemaType.STRING },
                    },
                    required: ['title', 'description']
                }
            }
        },
        required: ['diagnosisScore', 'summary', 'strengths', 'weaknesses', 'recommendations']
    };

    const prompt = `
    You are an AI trading coach. Analyze the performance of this AI trader.
    
    **Investment Style:** ${portfolio.investmentStyle}
    
    **Portfolio State:** ${JSON.stringify(portfolio)}
    
    **Trade Logs:** ${JSON.stringify(logs)}
    
    **Task:**
    Provide a detailed diagnosis.
    - Score the performance from 0-100.
    - Summarize findings.
    - List specific strengths and weaknesses.
    - Give actionable recommendations for improvement.
    - All text must be in Korean.
    
    **Output Requirement:**
    Respond ONLY with a valid JSON object matching the provided schema.`;

    try {
        const response = await generateContentWithRetry({
            model: "gemini-2.0-flash-001",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: diagnosisSchema,
            }
        });
        return JSON.parse(sanitizeJsonString(response.response.text()));
    } catch (error) {
        console.error('[AITrader] Diagnosis Failed:', error);
        throw error;
    }
}
