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
    
    **LANGUAGE INSTRUCTION:** All output (trendName, description, sectors) MUST be in **Korean (?�국??**.
    
    **CRITICAL INSTRUCTION - MANDATORY INCLUSION:**
    You MUST include the following 4 themes in your final list of 8, as they are user-verified focus areas. Do not omit them:
    1. **?�마??글?�스 & XR/AR 기기** (Meta, Ray-Ban, Apple, Samsung trends)
    2. **북극 ??�� & 조선??* (Climate change impact on logistics)
    3. **첨단 로봇** (Humanoids, Industrial Automation)
    4. **방산 & 무기 체계** (Geopolitical tension, K-Defense export surge)

    **For the remaining 4, diversify to cover:**
    5. **Energy & Power** (SMR, Hydrogen, Grid Modernization)
    6. **Demographics** (Aging Population impact on Pharma/Bio)
    7. **Geopolitics** (Trade Wars, Supply Chain Decoupling)
    8. **Space & Aerospace** (Satellite Constellations, Space Internet)

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
            "trendName": "?�렌??명칭 (?�국??",
            "description": "?�명 (?�국??",
            "relatedSectors": ["?�터1", "?�터2"],
            "topStocks": ["종목�?코드)"],
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

