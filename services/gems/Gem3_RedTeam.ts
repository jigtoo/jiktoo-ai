
import { generateContentWithRetry } from '../gemini/client';

export interface RedTeamResult {
    isSafe: boolean; // True if no critical flaws found
    riskScore: number; // 0 (Safe) to 100 (Extreme Risk)
    killFactors: string[]; // Critical reasons to ABORT
    scenarios: {
        scenario: string;
        probability: 'HIGH' | 'MEDIUM' | 'LOW';
        impact: 'CATASTROPHIC' | 'MANAGEABLE' | 'NEGLIGIBLE';
    }[];
    finalVerdict: 'PROCEED' | 'CAUTION' | 'ABORT';
}

export class Gem3_RedTeam {
    private static PROMPT_TEMPLATE = `
역할 (Role)
당신은 냉철한 트레이딩 레드팀(Red Team) 리더입니다.
당신의 목표는 제안된 트레이딩 아이디어가 **실패할 이유**를 찾아내고, 이 거래를 막는 것입니다.
낙관적인 편향을 버리고, 최악의 시나리오(Pre-Mortem)를 가정하십시오.

입력 데이터 (Input)
- 뉴스/재료: {{NEWS_TEXT}}
- 가치사슬 분석: {{VALUE_CHAIN}}

분석 지침 (Guidelines)
1. **재료 소멸(Sell the News)**: 이미 주가에 선반영되었는가? (뉴스 발표 시점이 고점일 확률)
2. **시장 상황(Market Context)**: 하락장이나 유동성 축소 국면에서 이 재료가 먹힐 것인가?
3. **함정(Traps)**: 대주주 매도, 유상증자 가능성, 경쟁사의 반격 등 숨겨진 악재는 없는가?
4. **군중 심리**: 개미들만 열광하고 스마트머니는 빠져나갈 타이밍인가?

출력 형식 (JSON Only)
{
  "riskScore": number, // 0~100 (100 = 절대 사지 마라)
  "killFactors": ["string", "string"], // 거래를 즉시 중단해야 할 치명적 결함
  "scenarios": [
    {
      "scenario": "string (예: 재료 소멸로 인한 급락)",
      "probability": "HIGH" | "MEDIUM" | "LOW",
      "impact": "CATASTROPHIC" | "MANAGEABLE" | "NEGLIGIBLE"
    }
  ],
  "finalVerdict": "PROCEED" | "CAUTION" | "ABORT",
  "isSafe": boolean // finalVerdict가 PROCEED 또는 CAUTION이면 true, ABORT면 false
}
`;

    public async critique(newsText: string, valueChainContext: string): Promise<RedTeamResult> {
        console.log(`[Gem 3] 🛡️ Red Team Critiquing...`);

        try {
            let prompt = Gem3_RedTeam.PROMPT_TEMPLATE.replace('{{NEWS_TEXT}}', newsText);
            prompt = prompt.replace('{{VALUE_CHAIN}}', valueChainContext);

            // Use Pro model for deep reasoning capability (Downgraded to Flash for test stability)
            const response = await generateContentWithRetry({
                model: 'gemini-2.0-flash-001',
                contents: [{ role: 'user', parts: [{ text: prompt }] }]
                // generationConfig: {
                //     responseMimeType: 'application/json'
                // }
            });

            const rawText = response.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!rawText) throw new Error('Empty response from Gem 3');

            const cleanedText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();

            if (!cleanedText) {
                throw new Error('Response became empty after cleaning markdown');
            }

            const result = JSON.parse(cleanedText);

            console.log(`[Gem 3] Verdict: ${result.finalVerdict} (Risk: ${result.riskScore})`);

            return result;

        } catch (error) {
            console.error('[Gem 3] Critique Failed:', error);
            // Default to CAUTION on error
            return {
                isSafe: true,
                riskScore: 50,
                killFactors: ['Analysis Failed'],
                scenarios: [],
                finalVerdict: 'CAUTION'
            };
        }
    }
}

export const gem3_RedTeam = new Gem3_RedTeam();
