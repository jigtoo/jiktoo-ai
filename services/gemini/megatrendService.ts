import { generateContentWithRetry } from './client';
import type { MarketTarget } from '../../types';
import { sanitizeJsonString } from '../utils/jsonUtils';

export interface MegatrendAnalysis {
   trendName: string;
   description: string;
   relatedSectors: string[];
   topStocks: string[];
   growthPotential: number; // 0-100
}

export const analyzeMegatrends = async (marketTarget: MarketTarget): Promise<MegatrendAnalysis[]> => {
   const marketInfo = {
      name: marketTarget === 'KR' ? 'South Korea (KOSPI/KOSDAQ)' : 'US Market (NYSE/NASDAQ)'
   };

   const prompt = `
    Identify **8 Global Megatrends** currently impacting the ${marketInfo.name}.
    
    **LANGUAGE INSTRUCTION:** All output (trendName, description, sectors) MUST be in **Korean (한국어)**.
    
    **ANALYSIS INSTRUCTION:**
    - Identify the most significant structural shifts currently driving the market.
    - Leverage Google Search results to find *breaking news* and *recent analyst reports*.
    - Cover diverse sectors such as Technology, Energy, Demographics, Geopolitics, and Bio/Healthcare.
    - Do NOT recycle old trends unless there is a fresh catalyst.

    **STOCK SELECTION RULES:**
    - Prioritize stocks listed in the **${marketInfo.name}**.
    - If marketTarget is 'KR', provide **Korean stocks (KOSPI/KOSDAQ)**.
    - If marketTarget is 'US', provide **US stocks (NYSE/NASDAQ)**.
    - However, for global themes (like Smart Glasses), you may mention key global leaders but MUST include local beneficiaries if available.

    Focus on structural changes with long-term growth potential.
    
    Response MUST be a JSON array of objects wrapped in markdown code blocks:
    \`\`\`json
    [
        {
            "trendName": "트렌드 이름 (한국어)",
            "description": "설명 (한국어)",
            "relatedSectors": ["섹터1", "섹터2"],
            "topStocks": ["종목명(티커)"],
            "growthPotential": 85
        }
    ]
    \`\`\`
    `;



   try {
      const response = await generateContentWithRetry({
         model: 'gemini-2.0-flash-001',
         contents: prompt,
         config: {
            // responseMimeType: 'application/json', // Conflicts with tools
            tools: [{ googleSearch: {} }]
         }
      });

      let text = response.text || '[]';
      // Cleanup markdown code blocks
      text = text.replace(/```json\n?|\n?```/g, '').trim();

      // Extract JSON array if mixed with text
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
         text = jsonMatch[0];
      }

      return JSON.parse(sanitizeJsonString(text));
   } catch (error) {
      console.error('Megatrend Analysis Failed:', error);
      return [];
   }
};

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

export const scanForMegatrends = analyzeMegatrends;


/**
 * Extracts investment themes from a User Briefing (Generic for any Strategy Report).
 * This allows the user's vision (2026, 2027...) to directly influence the Megatrend Dashboard.
 * 
 * @param briefingContent - The full text of the user's report.
 * @returns Array of MegatrendAnalysis objects derived from the report.
 */
export async function extractThemesFromBriefing(briefingContent: string): Promise<MegatrendAnalysis[]> {
   const prompt = `
        You are the Chief Strategy Officer for an AI Hedge Fund.
        The user has provided a "Strategic Investment Report" or "Briefing".
        
        Your task is to EXTRACT actionable "Investment Themes" (Megatrends) from this text.
        
        Input Text:
        """
        ${briefingContent.substring(0, 15000)}
        """

        Instructions:
        1. Identify 3-5 key investment themes or sectors mentioned or implied in the text.
        2. For each theme, provide:
           - trendName (Creative & Professional, e.g., "AI Sovereignty", "Quantum Leap")
           - description (Why is this a trend according to the report?)
           - relatedSectors (Array of strings)
           - topStocks (Array of strings) - Infer valid tickers if possible (KR/US).
           - growthPotential (0-100)
        
        Output Format (JSON Array):
        [
          {
            "trendName": "string",
            "description": "string",
            "relatedSectors": ["string"],
            "topStocks": ["string"],
            "growthPotential": 90
          }
        ]
        
        IMPORTANT: 
        - If the text mentions specific years (e.g., 2026, 2030), include them in the description.
        - Ensure tickers are valid if possible.
        `;

   try {
      const response = await generateContentWithRetry({
         model: 'gemini-2.0-flash-001',
         contents: prompt,
         config: {
            responseMimeType: 'application/json'
         }
      });

      let text = response.text || '[]';
      text = text.replace(/```json\n?|\n?```/g, '').trim();
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) text = jsonMatch[0];

      const themes = JSON.parse(sanitizeJsonString(text));

      // Add a special tag to the description to identify source
      return themes.map((t: any) => ({
         ...t,
         description: `[🎯 Strategic Vision] ${t.description}` // Tagging for UI
      }));

   } catch (error) {
      console.error("User Theme Extraction Failed:", error);
      return [];
   }
}
