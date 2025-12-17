// services/gemini/materialService.ts

import { SchemaType } from "@google/generative-ai";

import type { DetectedMaterial, MarketTarget } from '../../types';

import { ai, AI_DISABLED_ERROR_MESSAGE, generateContentWithRetry } from './client';

import { sanitizeJsonString } from '../utils/jsonUtils';

import { marketInfo } from '../marketInfo';

import { ANTI_HALLUCINATION_RULE, DATA_GROUNDING_PROTOCOL } from './prompts/protocols';



export async function fetchDetectedMaterials(marketTarget: MarketTarget): Promise<DetectedMaterial[]> {

    if (!ai) {

        throw new Error(AI_DISABLED_ERROR_MESSAGE);

    }



    const materialSignalSchema = { type: SchemaType.OBJECT, properties: { type: { type: SchemaType.STRING, enum: ['volume', 'news', 'social', 'options', 'darkpool', 'supply_chain', 'regulatory'] }, text: { type: SchemaType.STRING }, timestamp: { type: SchemaType.STRING } }, required: ['type', 'text', 'timestamp'] };

    const detectedMaterialSchema = { type: SchemaType.OBJECT, properties: { id: { type: SchemaType.STRING }, title: { type: SchemaType.STRING }, relatedStocks: { type: SchemaType.ARRAY, items: { type: SchemaType.OBJECT, properties: { stockName: { type: SchemaType.STRING }, ticker: { type: SchemaType.STRING } }, required: ['stockName', 'ticker'] } }, signals: { type: SchemaType.ARRAY, items: materialSignalSchema }, reliabilityScore: { type: SchemaType.NUMBER }, reliabilityGrade: { type: SchemaType.STRING, enum: ['A', 'B', 'C'] }, aiBriefing: { type: SchemaType.STRING }, status: { type: SchemaType.STRING, enum: ['new', 'acknowledged'] } }, required: ['id', 'title', 'relatedStocks', 'signals', 'reliabilityScore', 'reliabilityGrade', 'aiBriefing', 'status'] };



    const gatheringPrompt = `

You are an AI Market Intelligence Analyst specializing in detecting "pre-news" market-moving materials (ë£? for the ${marketInfo[marketTarget].name}.

Your mission is to act as a multi-channel radar, scanning for early, subtle signals that precede major news announcements.



Use Google Search to simulate scanning these sources:

- **News Headlines & Analyst Reports:** Look for hints, forward-looking statements, and sector-wide analysis.

- **Financial Forums & Social Media (e.g., Reddit, Twitter/X):** Detect unusual spikes in chatter, credible rumors, and collective speculation.

- **Market Data Anomalies:** Identify unusual volume spikes or price action without obvious news.

- **Regulatory Filings/Announcements:** Look for hints of upcoming policy changes or approvals.

- **Supply Chain Chatter:** Look for reports of component shortages, new supplier agreements, etc.



Identify 2-4 distinct, potential "materials" that are currently developing. For each material, find multiple signals from different sources.

Types of materials to find: M&A rumors, upcoming government policy changes, major product announcements, clinical trial leaks, supply chain breakthroughs/bottlenecks.



${ANTI_HALLUCINATION_RULE}

Present your findings as a detailed text report (CONTEXT) in Korean.

`;



    const gatheringResponse = await generateContentWithRetry({ model: "gemini-2.0-flash-001", contents: gatheringPrompt, config: { tools: [{ googleSearch: {} }] } });

    const gatheredDataContext = gatheringResponse.response.text();



    const structuringPrompt = `

${DATA_GROUNDING_PROTOCOL}

Based ONLY on the provided context, generate a structured JSON array of detected materials.



**CONTEXT:**

---

${gatheredDataContext}

---



**Instructions for each material:**

1.  **Aggregate Signals:** Group related signals under one material.

2.  **Create Title:** Write a concise, compelling title (e.g., "Aê¸°ì?��? Bê¸°ì?��?M&A ë£¨ë¨¸ ì°?).

3.  **Assign Reliability:**

    - **Score (0-100):** Based on signal strength, source diversity, and verifiability. Multiple, strong, cross-verified signals = higher score.

    - **Grade:** A (>80), B (60-79), C (<60).

4.  **Write AI Briefing:** Provide a short, insightful summary of the situation and its potential impact.

5.  **Set IDs:** Use a "mat_N" format for the id.

6.  **Set Status:** All should be 'new'.



${ANTI_HALLUCINATION_RULE}

**CRITICAL:** All text must be in Korean. Respond ONLY with a valid JSON array of objects matching the provided schema.

`;



    const response = await generateContentWithRetry({

        model: "gemini-2.0-flash-001",

        contents: structuringPrompt,

        config: {

            responseMimeType: "application/json",

            responseSchema: { type: SchemaType.ARRAY, items: detectedMaterialSchema }

        }

    });



    return JSON.parse(sanitizeJsonString(response.response.text()));

}

