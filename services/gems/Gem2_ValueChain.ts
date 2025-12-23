
import { generateContentWithRetry } from '../gemini/client';

export interface ValueChainResult {
    directImpact: {
        sector: string;
        sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
        description: string;
    };
    relatedStocks: {
        ticker: string;
        name: string;
        relationship: 'DIRECT' | 'SUPPLIER' | 'COMPETITOR' | 'CUSTOMER';
        reason: string;
    }[];
    theme: string;
    keywords: string[];
}

export class Gem2_ValueChain {
    private static PROMPT_TEMPLATE = `
역할 (Role)
당신은 30년 경력의 글로벌 가치 사슬(Value Chain) 분석가입니다.

임무 (Task)
제공된 뉴스를 분석하여 이 사건이 산업 생태계에 미치는 1차(직접), 2차(공급망/경쟁사), 3차(거시경제) 파급 효과를 도출하십시오.
특히, 한국 주식 시장(KRX) 또는 미국 주식 시장(US)에 상장된 관련 수혜주/피해주를 구체적으로 식별하십시오.

입력 뉴스 (Input)
"""
{{TEXT}}
"""

분석 단계 (Chain of Thought)
1. 핵심 사건 파악: 무엇이 변했는가? (가격, 기술, 규제, 수주 등)
2. 직접 영향(1st Order): 당사자에게 호재인가 악재인가?
3. 파급/낙수 효과(2nd/3rd Order):
   - 경쟁사: 반사이익을 얻는가? (예: 인텔 악재 -> AMD 호재)
   - 공급사: 물량이 늘어나는가? (예: 아이폰 판매 호조 -> LG이노텍 호재)
   - 고객사: 비용이 증가하는가?
4. 테마/키워드: 현재 시장에서 유행하는 테마(예: AI, 전고체, 로봇)와 연관되는가?

출력 형식 (JSON Only)
{
  "directImpact": {
    "sector": "string (e.g. 반도체, 바이오)",
    "sentiment": "POSITIVE" | "NEGATIVE" | "NEUTRAL",
    "description": "string (한글 요약)"
  },
  "relatedStocks": [
    {
      "ticker": "string (티커, 없는 경우 null)",
      "name": "string (종목명)",
      "relationship": "DIRECT" | "SUPPLIER" | "COMPETITOR" | "CUSTOMER",
      "reason": "string (한글)"
    }
  ],
  "theme": "string (대표 테마)",
  "keywords": ["string", "string"]
}
`;

    public async analyze(text: string): Promise<ValueChainResult> {
        console.log(`[Gem 2] 🔗 Analyzing Value Chain...`);

        try {
            const prompt = Gem2_ValueChain.PROMPT_TEMPLATE.replace('{{TEXT}}', text);

            const response = await generateContentWithRetry({
                model: 'gemini-2.0-flash-001',
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: {
                    responseMimeType: 'application/json'
                }
            });

            const rawText = response.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!rawText) throw new Error('Empty response from Gem 2');

            // Clean markdown wrap if present
            const cleanedText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();

            if (!cleanedText) {
                throw new Error('Response became empty after cleaning markdown');
            }

            const result = JSON.parse(cleanedText);

            console.log(`[Gem 2] Theme: ${result.theme}, Related: ${result.relatedStocks?.length} stocks`);

            return result;

        } catch (error) {
            console.error('[Gem 2] Analysis Failed:', error);
            // Return empty/safe result
            return {
                directImpact: { sector: 'Unknown', sentiment: 'NEUTRAL', description: 'Analysis Failed' },
                relatedStocks: [],
                theme: 'Unknown',
                keywords: []
            };
        }
    }
}

export const gem2_ValueChain = new Gem2_ValueChain();
