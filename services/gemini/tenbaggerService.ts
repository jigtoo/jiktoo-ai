// services/gemini/tenbaggerService.ts
import { generateContentWithRetry } from './client';
import type { TenbaggerAnalysis, MarketTarget } from '../../types';

export const analyzeTenbaggerPotential = async (marketTarget: MarketTarget): Promise<TenbaggerAnalysis> => {
    const prompt = `
    Find potential 'Tenbagger' stocks (stocks with 10x return potential) in the ${marketTarget === 'KR' ? 'South Korean' : 'US'} market.
    
    Focus on:
    1. disruptive innovation (AI, Bio, Green Energy)
    2. small-cap with high growth potential
    3. recent earnings surprises
    
    Respond in JSON format with fields:
    - stocks: array of objects { stockName, ticker, currentPrice, potentialReason, performanceSinceAdded (number, 0) }
    - managerCommentary: string (Korean explanation)
    `;

    try {
        const response = await generateContentWithRetry({
            model: 'gemini-2.0-flash-001',
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        });

        const data = JSON.parse(response.response.text());
        // Ensure data structure integrity
        return {
            stocks: Array.isArray(data.stocks) ? data.stocks.map((s: any) => ({
                ...s,
                performanceSinceAdded: s.performanceSinceAdded || 0
            })) : [],
            managerCommentary: data.managerCommentary || 'AI ë¶„ì„ ê²°ê³¼ê°€ ?†ìŠµ?ˆë‹¤.',
            changeLog: data.changeLog || []
        };
    } catch (error) {
        console.error('Tenbagger Analysis Failed:', error);
        return {
            stocks: [],
            managerCommentary: 'ë¶„ì„ ì¤??¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤.',
            changeLog: []
        };
    }
};

// Aliases and missing functions
export const fetchTenbaggerAnalysis = analyzeTenbaggerPotential;

export const fetchTenbaggerStatusCheck = async (currentData: TenbaggerAnalysis, marketTarget: MarketTarget): Promise<TenbaggerAnalysis> => {
    // Placeholder logic for status check
    // In a real scenario, this would re-evaluate existing tenbagger picks
    return {
        ...currentData,
        managerCommentary: currentData.managerCommentary + " (?íƒœ ?ê? ?„ë£Œ: ?¹ì´?¬í•­ ?†ìŒ)"
    };
};
