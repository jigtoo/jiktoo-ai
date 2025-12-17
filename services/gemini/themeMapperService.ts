// services/gemini/themeMapperService.ts
import { generateContentWithRetry } from './client';
import { SchemaType } from '@google/generative-ai';

export const mapThemeToSectors = async (themeKeyword: string): Promise<string[]> => {
    const prompt = `
    Given the theme keyword "${themeKeyword}", identify the most relevant stock market sectors in South Korea.
    Return only the sector names as a JSON array of strings.
    Example: ["반도�?, "IT부??]
    `;

    try {
        const response = await generateContentWithRetry({
            model: 'gemini-2.0-flash-001',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: SchemaType.ARRAY,
                    items: { type: SchemaType.STRING }
                }
            }
        });

        return JSON.parse(response.response.text());
    } catch (e) {
        console.error('Theme mapping failed:', e);
        return [];
    }
};

export interface InvestmentTheme {
    id: string;
    name: string;
    megatrendId: string;
    description: string;
    subThemes: string[];
    targetMarkets: string[];
    expectedGrowthRate: string;
    timeframe: string;
}

export interface Megatrend {
    id: string;
    title: string;
    summary: string;
    keyFactors: string[];
    timeHorizon: string;
    confidence: number;
    risks: string[];
    investmentOpportunities: string[];
    sources: string[];
}

export const mapTrendToThemes = async (trend: Megatrend): Promise<InvestmentTheme[]> => {
    const prompt = `
    Given the megatrend "${trend.title}", identify 3-5 specific investment themes.
    For each theme, provide:
    - name: Theme name
    - description: Brief description
    - subThemes: Array of sub-themes
    - targetMarkets: Array of target markets
    - expectedGrowthRate: Expected growth rate (e.g., "15-20% annually")
    - timeframe: Investment timeframe (e.g., "3-5 years")
    
    Return as a JSON array.
    `;

    try {
        const response = await generateContentWithRetry({
            model: 'gemini-2.0-flash-001',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: SchemaType.ARRAY,
                    items: {
                        type: SchemaType.OBJECT,
                        properties: {
                            name: { type: SchemaType.STRING },
                            description: { type: SchemaType.STRING },
                            subThemes: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                            targetMarkets: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                            expectedGrowthRate: { type: SchemaType.STRING },
                            timeframe: { type: SchemaType.STRING }
                        },
                        required: ['name', 'description', 'subThemes', 'targetMarkets', 'expectedGrowthRate', 'timeframe']
                    }
                }
            }
        });

        const themes = JSON.parse(response.text || '[]');
        return themes.map((t: any, idx: number) => ({
            id: `${trend.id}_theme_${idx}`,
            name: t.name,
            megatrendId: trend.id,
            description: t.description,
            subThemes: t.subThemes,
            targetMarkets: t.targetMarkets,
            expectedGrowthRate: t.expectedGrowthRate,
            timeframe: t.timeframe
        }));
    } catch (e) {
        console.error('Theme mapping failed:', e);
        return [];
    }
};
