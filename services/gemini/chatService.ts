import { generateContentWithRetry } from './client';
import type { PortfolioItemAnalysis, AnalysisChatMessage, PortfolioItem, PortfolioOverviewAnalysis } from '../../types';

export const chatWithPortfolioAI = async (
    userMessage: string,
    portfolioContext: PortfolioItemAnalysis[]
): Promise<string> => {

    const contextStr = JSON.stringify(portfolioContext.map(p => ({
        ticker: p.id, // Assuming id is ticker for context
        status: p.aiAlert?.type,
        profit: p.profitOrLossPercent
    })));

    const prompt = `
    You are an AI Portfolio Manager.
    User Question: "${userMessage}"
    
    Current Portfolio Context:
    ${contextStr}
    
    Answer the user in Korean, providing actionable advice based on the portfolio status.
    Keep it concise.
    `;

    try {
        const response = await generateContentWithRetry({
            model: 'gemini-2.0-flash-001',
            contents: prompt,
            config: { responseMimeType: 'text/plain' }
        });

        return response.response.text();
    } catch (e) {
        return "ì£„ì†¡?©ë‹ˆ?? ?„ìž¬ AI ?œë¹„?¤ë? ?¬ìš©?????†ìŠµ?ˆë‹¤.";
    }
};

export const fetchPortfolioChatResponse = async (
    history: AnalysisChatMessage[],
    message: AnalysisChatMessage,
    data: { items: PortfolioItem[], analysis: PortfolioItemAnalysis[], overview: PortfolioOverviewAnalysis | null }
): Promise<string> => {
    return chatWithPortfolioAI(message.text, data.analysis);
};
