// services/AdvancedAnalyticsEngine.ts
import { SchemaType } from "@google/generative-ai";
import { ai, AI_DISABLED_ERROR_MESSAGE, generateContentWithRetry } from './gemini/client';
import { sanitizeJsonString } from './utils/jsonUtils';
import type { 
    AnalysisResult, 
    MarketHealth, 
    ChiefAnalystInsightResult,
    MultiDimensionalAnalysis,
    CreativeConnectionMatrix,
    IntegratedWisdom
} from '../types';
import { DATA_GROUNDING_PROTOCOL } from "./gemini/prompts/protocols";


class AdvancedAnalyticsEngine {

    private async callAdvancedGemini<T>(prompt: string, schema: any): Promise<T> {
        if (!ai) {
            throw new Error(AI_DISABLED_ERROR_MESSAGE);
        }
        const response = await generateContentWithRetry({
            model: "gemini-1.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema
            }
        });
        return JSON.parse(sanitizeJsonString(response.text)) as T;
    }

    private generateChiefAnalystInsight(
        analysisResult: AnalysisResult,
        marketHealth: MarketHealth | null
    ): Promise<ChiefAnalystInsightResult> {
        const schema = {
            type: SchemaType.OBJECT,
            properties: {
                insight: { type: SchemaType.STRING },
                score: { type: SchemaType.NUMBER },
                reasoning: { type: SchemaType.STRING },
                observation: { type: SchemaType.NUMBER },
                connection: { type: SchemaType.NUMBER },
                pattern: { type: SchemaType.NUMBER },
                synthesis: { type: SchemaType.NUMBER },
                fixedIdeas: { type: SchemaType.NUMBER },
                bias: { type: SchemaType.NUMBER },
            },
            required: ['insight', 'score', 'reasoning', 'observation', 'connection', 'pattern', 'synthesis', 'fixedIdeas', 'bias']
        };

        const prompt = `
${DATA_GROUNDING_PROTOCOL}
**AI Persona: Chief Analyst (Insight Formula)**
Analyze the provided data for ${analysisResult.stockName}.

**CONTEXT:**
---
1.  **Stock Analysis Summary:** ${JSON.stringify(analysisResult.synthesis)}
2.  **Market Health:** ${JSON.stringify(marketHealth)}
---

**Your Task:**
1.  Provide the single most important, core insight about this stock.
2.  Rate each of the 6 factors (Observation, Connection, Pattern, Synthesis, Fixed Ideas, Bias) on a scale of 1-10.
3.  Based on these factors, provide a final, holistic **Insight Score on a scale of 0-100**. This is not a simple average; it should reflect your confidence in the quality and actionability of the insight.
4.  Provide a concise reasoning for your final score.
5.  All text MUST be in Korean.
6.  Respond ONLY with a valid JSON object matching the provided schema.
`;
        return this.callAdvancedGemini<ChiefAnalystInsightResult>(prompt, schema);
    }

    private generateMultiDimensionalAnalysis(
        analysisResult: AnalysisResult,
        marketHealth: MarketHealth | null
    ): Promise<MultiDimensionalAnalysis> {
        const schema = {
            type: SchemaType.OBJECT,
            properties: {
                score: { type: SchemaType.NUMBER },
                insights: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                timeD: { type: SchemaType.OBJECT, properties: { past: { type: SchemaType.NUMBER }, present: { type: SchemaType.NUMBER }, future: { type: SchemaType.NUMBER } }, required: ['past', 'present', 'future'] },
                spaceD: { type: SchemaType.OBJECT, properties: { local: { type: SchemaType.NUMBER }, global: { type: SchemaType.NUMBER } }, required: ['local', 'global'] },
                abstractD: { type: SchemaType.OBJECT, properties: { concrete: { type: SchemaType.NUMBER }, abstract: { type: SchemaType.NUMBER } }, required: ['concrete', 'abstract'] },
                causalD: { type: SchemaType.OBJECT, properties: { cause: { type: SchemaType.NUMBER }, effect: { type: SchemaType.NUMBER } }, required: ['cause', 'effect'] },
                hierarchyD: { type: SchemaType.OBJECT, properties: { micro: { type: SchemaType.NUMBER }, macro: { type: SchemaType.NUMBER } }, required: ['micro', 'macro'] },
            },
            required: ['score', 'insights', 'timeD', 'spaceD', 'abstractD', 'causalD', 'hierarchyD']
        };
        const prompt = `**AI Persona: Multi-Dimensional Analyst**\nAnalyze ${analysisResult.stockName} using the MDA framework based on the provided CONTEXT. Provide summary insights and a final MDA score (0-100) reflecting how well-understood the stock is from these perspectives. All text MUST be in Korean.\n**CONTEXT:**\n${JSON.stringify({analysisResult, marketHealth})}`;
        return this.callAdvancedGemini<MultiDimensionalAnalysis>(prompt, schema);
    }

    private generateCreativeConnectionAnalysis(
        analysisResult: AnalysisResult,
        marketHealth: MarketHealth | null
    ): Promise<CreativeConnectionMatrix> {
        const schema = {
            type: SchemaType.OBJECT,
            properties: {
                score: { type: SchemaType.NUMBER },
                intersection: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                difference: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                transfer: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
            },
            required: ['score', 'intersection', 'difference', 'transfer']
        };
        const prompt = `**AI Persona: Creative Connector**\nAnalyze ${analysisResult.stockName} using the CC framework. Identify intersections, differences, and transfer effects between technicals, fundamentals, and macro data. Provide a final CC score (0-100) for the novelty and strength of these connections. All text MUST be in Korean.\n**CONTEXT:**\n${JSON.stringify({analysisResult, marketHealth})}`;
        return this.callAdvancedGemini<CreativeConnectionMatrix>(prompt, schema);
    }

    private generateIntegratedWisdomAnalysis(
        analysisResult: AnalysisResult,
        marketHealth: MarketHealth | null,
        chiefInsight: ChiefAnalystInsightResult
    ): Promise<IntegratedWisdom> {
        const schema = {
            type: SchemaType.OBJECT,
            properties: {
                score: { type: SchemaType.NUMBER },
                knowledge: { type: SchemaType.NUMBER },
                understanding: { type: SchemaType.NUMBER },
                wisdom: { type: SchemaType.NUMBER },
                empathy: { type: SchemaType.NUMBER },
                execution: { type: SchemaType.NUMBER },
                humility: { type: SchemaType.NUMBER },
                ethics: { type: SchemaType.NUMBER },
            },
            required: ['score', 'knowledge', 'understanding', 'wisdom', 'empathy', 'execution', 'humility', 'ethics']
        };
        const prompt = `**AI Persona: Wise Council**\nSynthesize all analysis for ${analysisResult.stockName} using the IW framework. Provide a final Integrated Wisdom score (0-100) reflecting a balanced and humble final judgment. All text MUST be in Korean.\n**CONTEXT:**\n${JSON.stringify({analysisResult, marketHealth, chiefInsight})}`;
        return this.callAdvancedGemini<IntegratedWisdom>(prompt, schema);
    }


    async runComprehensiveAnalysis(
        analysisResult: AnalysisResult,
        marketHealth: MarketHealth | null,
    ): Promise<any> {
        setIsLoading(true);
        try {
            const [chiefAnalystInsight, multiDimensional, creativeConnections] = await Promise.all([
                this.generateChiefAnalystInsight(analysisResult, marketHealth),
                this.generateMultiDimensionalAnalysis(analysisResult, marketHealth),
                this.generateCreativeConnectionAnalysis(analysisResult, marketHealth)
            ]);

            // IW analysis depends on the first insight
            const integratedWisdom = await this.generateIntegratedWisdomAnalysis(analysisResult, marketHealth, chiefAnalystInsight);

            const finalRecommendation = `
${chiefAnalystInsight.insight}
KRW遺꾩꽍KRW${chiefAnalystInsight.score.toFixed(0)}??占? 李???湲곕줉?듬떎. 李쭷RW遺꾩꽍 寃곌낵, 湲濡쒕쾶 AI ?뚳옙? 濡쒖뺄 怨듦툒留앹쓽 媛뺣젰KRW寃곌퀬由ш? ?몄뿀?뉻RW
醫낇빀?? ???륦RW由ъ뒪KRW占?湲곤옙KRW占쎌씡KRW占? 援ш컙濡??⑤땲KRW
            `.trim();

            return {
                chiefAnalystInsight,
                multiDimensional,
                creativeConnections,
                integratedWisdom,
                finalRecommendation,
                confidenceScore: integratedWisdom.score
            };

        } catch (error) {
            console.error('Advanced comprehensive analysis failed:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    }
}

let setIsLoading: (isLoading: boolean) => void = () => {};

export const advancedAnalyticsEngine = new AdvancedAnalyticsEngine();
export const setEngineLoadingState = (setter: (isLoading: boolean) => void) => {
    setIsLoading = setter;
};

