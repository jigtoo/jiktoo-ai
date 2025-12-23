import { generateContentWithRetry } from './client';

export interface CommanderDecision {
    analysis: string;
    rationale: string;
    marketStatus: 'BULL' | 'SIDEWAYS' | 'BEAR';
    recommendedExposure: number;
}

export class StrategyCommander {
    public async decideStrategy(marketData: any, newsHeadlines: string[], recentLessons: string[] = []): Promise<CommanderDecision> {
        try {
            const prompt = `
You are a strategic market commander for autonomous trading.

Market Data:
${JSON.stringify(marketData, null, 2)}

Recent News Headlines:
${newsHeadlines.join('\n')}

Recent Lessons Learned:
${recentLessons.join('\n')}

Provide a strategic decision in JSON format ONLY:
{
    "analysis": "Brief market analysis in Korean",
    "rationale": "Strategic rationale in Korean",
    "marketStatus": "BULL" | "SIDEWAYS" | "BEAR",
    "recommendedExposure": 0.0 to 1.0
}

Respond ONLY with valid JSON, no markdown, no explanations.
`;

            console.log('[StrategyCommander] Requesting decision from Gemini...');

            const response = await generateContentWithRetry({
                model: 'gemini-2.0-flash-001',
                contents: [{ role: 'user', parts: [{ text: prompt }] }]
            });

            const rawText = response?.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!rawText) {
                throw new Error('Empty response from Gemini API');
            }

            console.log('[StrategyCommander] Raw response:', rawText.substring(0, 200));

            // Clean markdown blocks
            const cleanedText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();

            if (!cleanedText) {
                throw new Error('Response became empty after cleaning');
            }

            const result = JSON.parse(cleanedText);

            console.log('[StrategyCommander] Decision:', result.marketStatus, 'Exposure:', result.recommendedExposure);

            return {
                analysis: result.analysis || '시장 분석 데이터 없음',
                rationale: result.rationale || '전략 근거 없음',
                marketStatus: result.marketStatus || 'SIDEWAYS',
                recommendedExposure: result.recommendedExposure ?? 0.5
            };

        } catch (error) {
            console.error('[StrategyCommander] Failed to make decision:', error);

            // Return safe fallback
            return {
                analysis: '시장 분석 실패. 안전 모드로 전환합니다.',
                rationale: 'AI 분석 중 오류가 발생하여 보수적 전략을 채택합니다.',
                marketStatus: 'SIDEWAYS',
                recommendedExposure: 0.3
            };
        }
    }
}

export const strategyCommander = new StrategyCommander();
