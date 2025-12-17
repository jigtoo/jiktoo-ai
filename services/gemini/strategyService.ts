// services/gemini/strategyService.ts
import { generateContentWithRetry } from './client';
import type { StrategicOutlook, MarketTarget } from '../../types';

export const generateStrategicOutlook = async (marketTarget: MarketTarget): Promise<StrategicOutlook> => {
    const prompt = `
    Generate a strategic outlook for the ${marketTarget === 'KR' ? 'South Korean' : 'US'} stock market for the coming week.
    
    Include:
    1. Market Review (Summary, Leading/Lagging Sectors)
    2. Macro Outlook (Key Risks, Economic Indicators)
    3. Week Ahead (Key Events to Watch)
    4. AI Strategy (Recommended Stance, Focus Sectors)
    
    Respond in JSON. Use Korean for all text fields.
    `;

    try {
        const response = await generateContentWithRetry({
            model: 'gemini-2.0-flash-001',
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        });

        return JSON.parse(response.text || '{}');
    } catch (error) {
        console.error('Strategy Generation Failed:', error);
        return {
            reportDate: new Date().toISOString(),
            title: '전략 보고서 생성 실패',
            marketReview: { summary: '데이터 없음', leadingSectors: [], laggingSectors: [] },
            macroOutlook: { summary: '데이터 없음', keyRisks: [] },
            weekAhead: { summary: '데이터 없음', keyEvents: [] },
            aiStrategy: { summary: '데이터 없음', recommendedStance: '관망 및 현금 확보', focusSectors: [] }
        };
    }
};

// Alias to match hook import
export const fetchStrategicOutlook = generateStrategicOutlook;

