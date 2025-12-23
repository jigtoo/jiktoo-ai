// services/gemini/stockDiscoveryService.ts
import { generateContentWithRetry } from './client';
import type { MarketTarget } from '../../types';
import { SchemaType } from '@google/generative-ai';
import type { InvestmentTheme } from './themeMapperService';

export interface DiscoveredStock {
    ticker: string;
    stockName: string;
    theme: string;
    reason: string;
    catalyst: string;
    potentialUpside: number;
}

export interface ThemeStock {
    ticker: string;
    stockName: string;
    theme: string;
    rationale: string;
    marketCap: string;
    revenueExposure: number;
    aiConfidence: number;
    catalysts: string[];
    risks: string[];
}

export const discoverStocksByTheme = async (theme: InvestmentTheme, marketTarget: MarketTarget): Promise<ThemeStock[]> => {
    const marketName = marketTarget === 'KR' ? 'South Korea (KOSPI/KOSDAQ)' : 'US Market';

    const prompt = `
    Find 5 stocks in ${marketName} directly beneficial to the theme: "${theme.name}".
    
    **LANGUAGE INSTRUCTION:** All output MUST be in **Korean (한국어)**.

    **CRITICAL ANALYSIS INSTRUCTION:**
    - Look beyond end-product brands. **Focus heavily on upstream component suppliers with high technology moats.**
    - Example: For Smart Glasses, prioritize companies making **Optical Sensors, Micro-OLEDs, or specialized chips** (e.g., verify if Sony, STM, or local competitors have the edge), rather than just the glass assembler.
    - Evaluate "Real Revenue Exposure" and "Tech Leadership".

    Response MUST be a JSON array of objects with:
    - ticker
    - stockName (Korean)
    - rationale (Why it fits, specifically mentioning their tech edge, in Korean)
    - marketCap (e.g., "5조원")
    - revenueExposure (0-100, percentage of revenue from this theme)
    - aiConfidence (0-100)
    - catalysts (array of strings, in Korean)
    - risks (array of strings, in Korean)
    `;

    const schema = {
        type: SchemaType.ARRAY,
        items: {
            type: SchemaType.OBJECT,
            properties: {
                ticker: { type: SchemaType.STRING },
                stockName: { type: SchemaType.STRING },
                rationale: { type: SchemaType.STRING },
                marketCap: { type: SchemaType.STRING },
                revenueExposure: { type: SchemaType.NUMBER },
                aiConfidence: { type: SchemaType.NUMBER },
                catalysts: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                risks: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
            },
            required: ['ticker', 'stockName', 'rationale', 'marketCap', 'revenueExposure', 'aiConfidence', 'catalysts', 'risks']
        }
    };

    try {
        const response = await generateContentWithRetry({
            model: 'gemini-2.0-flash-001',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: schema
            }
        });

        const stocks = JSON.parse(response.text || '[]');
        return stocks.map((s: any) => ({
            ...s,
            theme: theme.name
        }));
    } catch (error) {
        console.error('Stock Discovery Failed:', error);
        return [];
    }
};

