// services/gemini/playbookService.ts

import { SchemaType } from "@google/generative-ai";

import type { SuccessStoryItem, MarketTarget } from '../../types';

import { ai, AI_DISABLED_ERROR_MESSAGE, generateContentWithRetry } from './client';

import { sanitizeJsonString } from '../utils/jsonUtils';

import { marketInfo } from '../marketInfo';

import { ANTI_HALLUCINATION_RULE } from './prompts/protocols';



export async function fetchTradingPlaybook(marketTarget: MarketTarget): Promise<SuccessStoryItem[]> {

    if (!ai) throw new Error(`AI ?àÎî© ?àÎ?��?Í?�∞Îä??©ÏäµKRW ${AI_DISABLED_ERROR_MESSAGE}`);



    const successStorySchema = {

        type: SchemaType.OBJECT,

        properties: {

            stockName: { type: SchemaType.STRING },

            ticker: { type: SchemaType.STRING },

            breakoutPrice: { type: SchemaType.STRING },

            breakoutDate: { type: SchemaType.STRING },

            pivotPoint: { type: SchemaType.STRING },

            sinceBreakoutPercent: { type: SchemaType.NUMBER },

            marketCondition: { type: SchemaType.STRING },

            keyLearnings: { type: SchemaType.STRING },

            performanceMetrics: {

                type: SchemaType.OBJECT,

                properties: {

                    timeToTarget: { type: SchemaType.STRING, nullable: true },

                    maxGainPercent: { type: SchemaType.NUMBER, nullable: true },

                    drawdownFromPeakPercent: { type: SchemaType.NUMBER, nullable: true },

                },

                required: []

            }

        },

        required: ['stockName', 'ticker', 'breakoutPrice', 'breakoutDate', 'pivotPoint', 'sinceBreakoutPercent', 'marketCondition', 'keyLearnings', 'performanceMetrics']

    };



    const gatheringPrompt = `Find 2-4 historical examples of successful breakout trades in the ${marketInfo[marketTarget].name} from the past 1-2 years. These examples should serve as "success stories" for an AI Trading Playbook. Use Google Search to find examples and gather details like stock info, breakout price, date, market condition at the time, and subsequent performance. Present your findings as a detailed text report in Korean.`;



    const gatheringResponse = await generateContentWithRetry({

        model: "gemini-2.0-flash-001",

        contents: gatheringPrompt,

        config: { tools: [{ googleSearch: {} }] }

    });

    const gatheredDataContext = gatheringResponse.text || '';



    const structuringPrompt = `Based ONLY on the text context, generate a structured JSON array of success stories.\n**Context:**\n---\n${gatheredDataContext}\n---\n**Instructions for each story:**\n1. Identify a clear breakout from a consolidation pattern.\n2. Record the stock info, breakout price, and date.\n3. Analyze the market condition at the time.\n4. Distill the key learnings from this successful trade.\n5. Calculate performance metrics like max gain and time to a +20% target.\n- Do not include 'originalAnalysisSnapshot'.\n- All text must be in Korean.\n${ANTI_HALLUCINATION_RULE}\n**CRITICAL:** Respond ONLY with a valid JSON array of objects matching the provided schema.`;



    const response = await generateContentWithRetry({

        model: "gemini-2.0-flash-001",

        contents: structuringPrompt,

        config: {

            responseMimeType: "application/json",

            responseSchema: { type: SchemaType.ARRAY, items: successStorySchema }

        }

    });



    return JSON.parse(sanitizeJsonString(response.text || '{}'));

}

