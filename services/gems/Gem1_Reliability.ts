import { generateContentWithRetry } from '../gemini/client';

export interface ReliabilityResult {
    score: number; // 0-30
    grade: 'HIGH' | 'MEDIUM' | 'LOW';
    isPass: boolean; // Score >= 15
    analysis: {
        source: string;
        dataDensity: string;
        tone: string;
    };
    warning?: string;
    entities?: { name: string; ticker: string | null }[];
}

export class Gem1_Reliability {
    private static PROMPT_TEMPLATE = `
역할 (Role)
당신은 20년 경력의 금융 미디어 분석가이자 팩트체크 전문가입니다.

임무 (Task)
제공된 텍스트(뉴스/보도자료)를 분석하여 엄격한 '신뢰도 평가 매트릭스'에 따라 등급을 매기고, 기사의 정서(Sentiment)를 객관적으로 파악하십시오.

입력 텍스트 (Input)
"""
{{TEXT}}
"""

분석 단계 (Chain of Thought)
1. 출처 검증: 정보 제공자가 유료 구독 모델인지, 광고 기반인지, 규제 기관(SEC 등)인지 파악하여 인센티브 구조에 따른 편향 위험을 평가하십시오.
2. 구조적 분석:
   - '의문문 지표': 추측성 물음표(?) 사용 빈도
   - '감탄문 지표': 과장된 느낌표(!) 사용 빈도
   - '수치 지표': 구체적인 데이터(날짜, 금액, % 등)의 밀도
3. 귀속 확인: 정보의 출처가 실명인지, 익명의 소식통인지 확인하십시오.
4. 정서 점수: 톤이 객관적인지, 낙관적/비관적으로 치우쳐 있는지 평가하십시오.

평가 기준 (Total 30)
- 출처의 동기 (10점): 공시/유료구독(8-10), 주요언론(4-7), 찌라시/SNS(0-3)
- 데이터 밀도 (10점): 구체적(8-10), 일부(4-7), 모호(0-3)
- 어조 및 정서 (10점): 중립(8-10), 설득(4-7), 선동(0-3)

추가 임무 (Extraction)
기사에서 다루는 핵심 기업(종목)을 추출하십시오.

출력 형식 (JSON Only)
{
    "score": number, // 0-30
    "grade": "HIGH" | "MEDIUM" | "LOW",
    "analysis": {
        "source": "string description",
        "dataDensity": "string description",
        "tone": "string description"
    },
    "warning": "string or null",
    "entities": [ { "name": "string", "ticker": "string or null" } ]
}
`;

    public async evaluate(text: string): Promise<ReliabilityResult> {
        console.log(`[Gem 1] 🕵️ Evaluating Reliability for news...`);

        try {
            const prompt = Gem1_Reliability.PROMPT_TEMPLATE.replace('{{TEXT}}', text);

            const response = await generateContentWithRetry({
                model: 'gemini-2.0-flash-001', // Fast & Cheap
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: {
                    responseMimeType: 'application/json'
                }
            });

            const rawText = response.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!rawText) throw new Error('Empty response from Gem 1');

            const trimmedText = rawText.trim();
            if (!trimmedText) {
                throw new Error('Response is empty after trimming');
            }

            const result = JSON.parse(trimmedText);
            const isPass = result.score >= 15;

            console.log(`[Gem 1] Result: ${result.grade} (Score: ${result.score}/30) - Pass: ${isPass}`);

            return {
                ...result,
                isPass
            };

        } catch (error) {
            console.error('[Gem 1] Evaluation Failed:', error);
            // Default to PASS on error to avoid blocking critical flows, but warn
            return {
                score: 15,
                grade: 'MEDIUM',
                isPass: true,
                analysis: { source: 'Error', dataDensity: 'Error', tone: 'Error' },
                warning: 'Evaluation failed, bypassing filter.'
            };
        }
    }
}

export const gem1_Reliability = new Gem1_Reliability();
