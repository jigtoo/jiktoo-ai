// services/gemini/smcScanner.ts
/**
 * Smart Money Concept (SMC) Scanner
 * Identifies institutional order blocks, liquidity voids, and fair value gaps (FVG)
 */

import { generateContentWithRetry } from './client';
import type { SMCAnalysis, MarketTarget } from '../../types';
import { SchemaType } from '@google/generative-ai';
import { sanitizeJsonString } from '../utils/jsonUtils';

/**
 * Scan for SMC patterns
 * looking for: Order Blocks, FVG (Fair Value Gaps), Liquidity Sweeps
 */
export async function scanForSMC(
    marketTarget: MarketTarget,
    watchlist: string[]
): Promise<SMCAnalysis[]> {

    const marketInfo = {
        KR: { name: '?�국 ?�장 (KOSPI/KOSDAQ)', currency: 'KRW' },
        US: { name: '미국 ?�장 (NYSE/NASDAQ)', currency: 'USD' }
    };

    const prompt = `
# Smart Money Concept (SMC) 분석 - ${marketInfo[marketTarget].name}

?�신?� ICT(Inner Circle Trader) 방법론과 ?�마??머니 컨셉(SMC) ?�문 ?�레?�더?�니??
기�? ?�자??Smart Money)???�적??찾아 분석?�주?�요.

## 분석 ?�??종목
${watchlist.map(ticker => `- ${ticker}`).join('\n')}

## 분석 ?�심 ?�소

1. **Order Block (OB) - ?�더블럭**:
   - 강력???�승/?�락 직전??반�? 방향 캔들
   - 기�???물량??모�? 구간 (지지/?�????��)

2. **Fair Value Gap (FVG) - 불균??�?*:
   - 급격??가�??�동?�로 ?�해 매수/매도 주문??불균?�하�?체결??구간
   - 캔들 1??고�??� 캔들 3???�가 ?�이??�?공간 (?�승 ??
   - 가격이 ?�시 ?��??�려???�석 ?�과(Magnet Effect) 발생

3. **Liquidity Sweep (Liq) - ?�동??�?��**:
   - ?�전 고점/?�?�을 ?�짝 깼다가 급격??반전?�는 ?�턴
   - 개�??�의 ?�절 물량(Stop Loss)???�냥?�고 ?�마??머니가 진입???�호

4. **Market Structure Shift (MSS) - ?�장 구조 변�?*:
   - ?�락 추세?�서 고점???�이???�직임 (?�승 ?�환)
   - ?�승 추세?�서 ?�?�을 ??��???�직임 (?�락 ?�환)

## 지?�사??

1. �?종목???�??최근 차트�?분석?�여 ??4가지 SMC ?�소가 ?�는지 ?�인?�세??
2. **SMC Setup**???�성??종목�??�정?�세?? (?�으�??�외)
3. 진입(Entry), ?�절(Stop Loss), 목표(Take Profit) 가격을 SMC 관?�에???�정?�세??

## 출력 ?�식

**CRITICAL**:
- ticker???�확??종목 코드
- stockName?� 종목�?
- 모든 ?�명?� ?�국?�로 ?�성
- 가격�? ?�자�?(?�화 기호 ?�외)
- 반드??JSON 배열로만 ?�답?�며, 마크?�운 코드 블록?�로 감싸주세??
\`\`\`json
[
  {
    "ticker": "...",
    "stockName": "...",
    "patternType": "OrderBlock" | "FVG" | "LiquiditySweep" | "MSS",
    "timeframe": "...",
    "signalDate": "YYYY-MM-DD",
    "entryPrice": 100,
    "stopLoss": 95,
    "takeProfit": 110,
    "confidence": 85,
    "rationale": "...",
    "smartMoneyActivity": "..."
  }
]
\`\`\`

`;

    const schema = {
        type: SchemaType.ARRAY,
        items: {
            type: SchemaType.OBJECT,
            properties: {
                ticker: { type: SchemaType.STRING },
                stockName: { type: SchemaType.STRING },
                patternType: {
                    type: SchemaType.STRING,
                    enum: ['OrderBlock', 'FVG', 'LiquiditySweep', 'MSS']
                },
                timeframe: { type: SchemaType.STRING },
                signalDate: { type: SchemaType.STRING },
                entryPrice: { type: SchemaType.NUMBER },
                stopLoss: { type: SchemaType.NUMBER },
                takeProfit: { type: SchemaType.NUMBER },
                confidence: { type: SchemaType.NUMBER },
                rationale: { type: SchemaType.STRING },
                smartMoneyActivity: { type: SchemaType.STRING }
            },
            required: [
                'ticker', 'stockName', 'patternType', 'timeframe', 'signalDate',
                'entryPrice', 'stopLoss', 'takeProfit', 'confidence', 'rationale', 'smartMoneyActivity'
            ]
        }
    };

    try {
        const response = await generateContentWithRetry({
            model: 'gemini-2.0-flash-001',
            contents: prompt,
            config: {
                // responseMimeType: 'application/json', // Conflicts with tools
                // responseSchema: schema, // Conflicts with tools
                tools: [{ googleSearch: {} }]
            }
        });

        let text = response.text || '[]';
        // Cleanup markdown code blocks if present
        text = text.replace(/```json\n?|\n?```/g, '').trim();

        const analyses: SMCAnalysis[] = JSON.parse(sanitizeJsonString(text || '[]'));
        console.log(`[SMC Scanner] Found ${analyses.length} setups for ${marketTarget} market`);
        return analyses;

    } catch (error) {
        console.error('[SMC Scanner] Error:', error);
        throw new Error(`SMC 분석 ?�패: ${error instanceof Error ? error.message : '?????�는 ?�류'}`);
    }
}

export const scanForSMCSignals = scanForSMC;

