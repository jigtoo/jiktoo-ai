// services/gemini/newsAnalysisService.ts
import { generateContentWithRetry } from './client';
import { SchemaType } from '@google/generative-ai';

export const analyzeNewsImpact = async (title: string, content: string): Promise<{ sentiment: string, score: number }> => {
    const prompt = `
    Analyze the sentiment of this financial news:
    Title: ${title}
    Content: ${content}
    
    Return JSON:
    - sentiment: "Positive", "Negative", or "Neutral"
    - score: -1.0 to 1.0
    `;

    try {
        const response = await generateContentWithRetry({
            model: 'gemini-2.0-flash-001',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: SchemaType.OBJECT,
                    properties: {
                        sentiment: { type: SchemaType.STRING },
                        score: { type: SchemaType.NUMBER }
                    },
                    required: ['sentiment', 'score']
                }
            }
        });

        return JSON.parse(response.response.text());
    } catch (e) {
        return { sentiment: 'Neutral', score: 0 };
    }
};
