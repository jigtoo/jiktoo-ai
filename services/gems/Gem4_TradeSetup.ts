
import { generateContentWithRetry } from '../gemini/client';

export interface TradeSetupResult {
    strategy: 'BREAKOUT' | 'PULLBACK' | 'SCALPING' | 'SWING';
    entryZone: {
        min: number;
        max: number;
        logic: string;
    };
    targetPrice: {
        price: number;
        logic: string;
    };
    stopLoss: {
        price: number;
        logic: string;
    };
    positionSizing: 'AGGRESSIVE' | 'NORMAL' | 'CONSERVATIVE';
    timeHorizon: 'DAY' | 'WEEK' | 'MONTH';
}

export class Gem4_TradeSetup {
    private static PROMPT_TEMPLATE = `
역할 (Role)
당신은 정밀 타격(Sniper) 트레이딩 전략가입니다.
검증된 트레이딩 아이디어에 대해 구체적인 진입, 청산, 손절 가격을 산출하십시오.

입력 데이터 (Input)
- 종목: {{TICKER}} ({{NAME}})
- 현재가: {{CURRENT_PRICE}} (없으면 전일 종가 기준 추정)
- 재료 분석: {{ANALYSIS_SUMMARY}}
- 리스크 요인: {{RISK_FACTORS}}

지침 (Guidelines)
1. **진입(Entry)**: 추격 매수보다는 눌림목(Pullback) 또는 중요 저항 돌파(Breakout) 지점을 설정하십시오.
2. **손절(Stop Loss)**: 기술적 지지선 이탈 또는 재료 소멸 기준점을 명확히 하십시오. RR(Risk Reward) 비율은 최소 1:2 이상이어야 합니다.
3. **비중(Sizing)**: 리스크가 높다면(Gem 3 결과 참조) 비중을 줄이십시오(CONSERVATIVE).

출력 형식 (JSON Only)
{
  "strategy": "BREAKOUT" | "PULLBACK" | "SCALPING" | "SWING",
  "entryZone": {
    "min": number,
    "max": number,
    "logic": "string (진입 근거)"
  },
  "targetPrice": {
    "price": number,
    "logic": "string (목표가 산정 근거)"
  },
  "stopLoss": {
    "price": number,
    "logic": "string (손절 근거)"
  },
  "positionSizing": "AGGRESSIVE" | "NORMAL" | "CONSERVATIVE",
  "timeHorizon": "DAY" | "WEEK" | "MONTH"
}
`;

    public async generateSetup(
        ticker: string,
        name: string,
        currentPrice: number,
        analysisSummary: string,
        riskFactors: string[]
    ): Promise<TradeSetupResult> {
        console.log(`[Gem 4] 📐 Designing Trade Setup for ${name} (${ticker})...`);

        try {
            let prompt = Gem4_TradeSetup.PROMPT_TEMPLATE.replace('{{TICKER}}', ticker)
                .replace('{{NAME}}', name)
                .replace('{{CURRENT_PRICE}}', String(currentPrice))
                .replace('{{ANALYSIS_SUMMARY}}', analysisSummary)
                .replace('{{RISK_FACTORS}}', riskFactors.join(', '));

            console.log("Gem 4: Prompt constructed. Length:", prompt.length);

            const response = await generateContentWithRetry({
                model: 'gemini-2.0-flash-001',
                contents: [{ role: 'user', parts: [{ text: prompt }] }]
                // generationConfig: { responseMimeType: 'application/json' } // Removed for compatibility
            });
            console.log("Gem 4: Response received.");

            const rawText = response.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!rawText) throw new Error('Empty response from Gem 4');

            const cleanedText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();

            if (!cleanedText) {
                throw new Error('Response became empty after cleaning markdown');
            }

            const result = JSON.parse(cleanedText);

            console.log(`[Gem 4] Strategy: ${result.strategy}, Entry: ${result.entryZone.min}-${result.entryZone.max}`);

            return result;

        } catch (error: any) {
            console.error('[Gem 4] Setup Generation Failed:', error);
            // Return safe fallback
            return {
                strategy: 'SCALPING',
                entryZone: { min: currentPrice, max: currentPrice, logic: 'Fallback' },
                targetPrice: { price: currentPrice * 1.05, logic: 'Fallback +5%' },
                stopLoss: { price: currentPrice * 0.97, logic: 'Fallback -3%' },
                positionSizing: 'CONSERVATIVE',
                timeHorizon: 'DAY'
            };
        }
    }
}

export const gem4_TradeSetup = new Gem4_TradeSetup();

