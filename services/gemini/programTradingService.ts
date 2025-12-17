import { SchemaType } from "@google/generative-ai";

import type { MarketTarget, ProgramFlow } from '../../types';

import { ai, AI_DISABLED_ERROR_MESSAGE, generateContentWithRetry } from './client';

import { sanitizeJsonString } from '../utils/jsonUtils';

import { marketInfo } from '../marketInfo';



const programFlowSchema = {

    type: SchemaType.OBJECT,

    properties: {

        timestamp: { type: SchemaType.STRING },

        netFlow: { type: SchemaType.NUMBER },

        intensity: { type: SchemaType.STRING, enum: ['High', 'Medium', 'Low'] },

        sectorFocus: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },

        topBuys: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },

        topSells: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }

    },

    required: ['timestamp', 'netFlow', 'intensity', 'sectorFocus', 'topBuys', 'topSells']

};



export async function scanForProgramTrading(marketTarget: MarketTarget): Promise<ProgramFlow> {

    if (!ai) {

        throw new Error(AI_DISABLED_ERROR_MESSAGE);

    }



    const prompt = `

        Analyze the current market conditions for ${marketTarget} to estimate Program Trading flows.

        Focus on:

        1. Institutional net buying/selling pressure.

        2. Arbitrage opportunities (futures vs spot).

        3. Sector rotation patterns typical of algorithmic trading.

        

        Current Market Context:

        ${"Current Market Time: " + new Date().toISOString()}



        Return a JSON object matching this schema:

        {

            "timestamp": "ISO string",

            "netFlow": number (in millions KRW, positive for buy, negative for sell),

            "intensity": "High" | "Medium" | "Low",

            "sectorFocus": ["Sector1", "Sector2"],

            "topBuys": ["Ticker1", "Ticker2"],

            "topSells": ["Ticker1", "Ticker2"]

        }

    `;



    const response = await generateContentWithRetry({
        model: "gemini-2.0-flash-001",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: programFlowSchema,
        }
    });



    return JSON.parse(sanitizeJsonString(response.text || '{}'));

}

