// services/gemini/volatilityBreakout.ts
/**
 * Dynamic K Volatility Breakout Scanner
 * Based on Larry Williams' strategy with adaptive K value
 * K value adjusts based on market volatility (VIX)
 */

import { generateContentWithRetry } from './client';
import type { VolatilityBreakout, MarketTarget } from '../../types';
import { SchemaType } from '@google/generative-ai';
import { sanitizeJsonString } from '../utils/jsonUtils';

/**
 * Calculate Dynamic K value based on market volatility
 * Lower volatility = Higher K (more aggressive)
 * Higher volatility = Lower K (more conservative)
 */
export function calculateDynamicK(vixLevel: number): {
    kValue: number;
    condition: 'low_volatility' | 'normal' | 'high_volatility' | 'extreme';
    shouldTrade: boolean;
} {
    if (vixLevel < 15) {
        return { kValue: 0.5, condition: 'low_volatility', shouldTrade: true };
    } else if (vixLevel >= 15 && vixLevel < 25) {
        return { kValue: 0.4, condition: 'normal', shouldTrade: true };
    } else if (vixLevel >= 25 && vixLevel < 35) {
        return { kValue: 0.3, condition: 'high_volatility', shouldTrade: true };
    } else {
        // VIX >= 35: Extreme volatility, skip trading
        return { kValue: 0.2, condition: 'extreme', shouldTrade: false };
    }
}

/**
 * Scan for volatility breakout signals
 * Entry: Price > Open + (Previous Day Range 횞 K)
 */
export async function scanForVolatilityBreakouts(
    marketTarget: MarketTarget,
    watchlist: string[]
): Promise<VolatilityBreakout[]> {

    const marketInfo = {
        KR: { name: '?쒓뎅 ?쒖옣 (KOSPI/KOSDAQ)', vixProxy: 'VKOSPI' },
        US: { name: '誘멸뎅 ?쒖옣 (NYSE/NASDAQ)', vixProxy: 'VIX' }
    };

    const prompt = `
# Dynamic K 蹂?숈꽦 ?뚰뙆 ?꾨왂 - ${marketInfo[marketTarget].name}

?꾩꽕???몃젅?대뜑 ?섎━ ?뚮━?꾩뒪(Larry Williams)??蹂?숈꽦 ?뚰뙆 ?꾨왂??AI濡?援ы쁽???쒖뒪?쒖엯?덈떎.

## 遺꾩꽍 ???醫낅ぉ
${watchlist.map(ticker => `- ${ticker}`).join('\n')}

## ?꾨왂 媛쒖슂

### ?듭떖 怨듭떇
**吏꾩엯媛 = ?쒓? + (?꾩씪 蹂?숉룺 횞 K)**

?ш린??
- **?꾩씪 蹂?숉룺** = ?꾩씪 怨좉? - ?꾩씪 ?媛
- **K** = 蹂?숈꽦 吏??${marketInfo[marketTarget].vixProxy})???곕씪 ?숈쟻 議곗젅

### Dynamic K 媛?寃곗젙

**${marketInfo[marketTarget].vixProxy} 湲곗?**:
- **< 15 (?蹂?숈꽦)**: K = 0.5 (怨듦꺽??吏꾩엯)
- **15-25 (?듭긽)**: K = 0.4 (?쒖? 吏꾩엯)
- **25-35 (怨좊??숈꽦)**: K = 0.3 (蹂댁닔??吏꾩엯)
- **>= 35 (洹밸떒??**: K = 0.2 (留ㅻℓ 以묐떒 沅뚯옣)

### 吏꾩엯 議곌굔

1. **?꾩닔 議곌굔** (紐⑤몢 異⑹”):
   - ?꾩옱媛 > ?쒓? + (?꾩씪 蹂?숉룺 횞 K)
   - 嫄곕옒??> ?꾩씪 嫄곕옒??횞 1.2
   - ?꾩씪 蹂?숉룺 > ?됯퇏 蹂?숉룺 (20??湲곗?)

2. **異붽? 媛?곗젏** (?좏깮):
   - ?꾩씪 醫낃?媛 ?꾩씪 怨좉? 洹쇱쿂 (?곸쐞 20% ?대궡): +20??   - 5???곗냽 ?곸듅 以? +15??   - 200???대룞?됯퇏???? +10??
3. **?쒖쇅 議곌굔** (?섎굹?쇰룄 ?대떦 ???쒖쇅):
   - ?뱀씪 ?쒓? 媛?> 5%
   - ?꾩씪 ?곹븳媛
   - ${marketInfo[marketTarget].vixProxy} >= 35 (洹밸떒??蹂?숈꽦)
   - 嫄곕옒??< ?됯퇏??50%

### 泥?궛 ?꾨왂

- **?듭젅**: ?ㅼ쓬 ???쒓? ?먮뒗 +5% ?꾨떖 ??- **?먯젅**: 吏꾩엯媛 ?鍮?-2% (媛寃⑹쟻 ?먯젅)
- **?쒓컙 泥?궛**: 3????紐⑺몴媛 誘몃룄????
## 遺꾩꽍 吏移?
1. **Google Search ?쒖슜**:
   - ?꾩옱 ${marketInfo[marketTarget].vixProxy} 吏???뺤씤
   - 媛?醫낅ぉ???꾩씪 怨좉?/?媛/醫낃? ?뺤씤
   - ?뱀씪 ?쒓? 諛??꾩옱媛 ?뺤씤
   - 嫄곕옒???뺣낫 ?뺤씤

2. **K 媛?怨꾩궛**:
   - 癒쇱? ?꾩옱 ${marketInfo[marketTarget].vixProxy} ?뺤씤
   - 湲곗????곕씪 K 媛?寃곗젙
   - ${marketInfo[marketTarget].vixProxy} >= 35?쇰㈃ 留ㅻℓ 以묐떒 (鍮?諛곗뿴 諛섑솚)

3. **吏꾩엯媛 怨꾩궛**:
   - 吏꾩엯媛 = ?쒓? + (?꾩씪 怨좉? - ?꾩씪 ?媛) 횞 K
   - ?꾩옱媛 > 吏꾩엯媛??醫낅ぉ ?좎젙

4. **紐⑺몴媛/?먯젅媛 ?ㅼ젙**:
   - 紐⑺몴媛 = 吏꾩엯媛 횞 1.05 (5% ?섏씡)
   - ?먯젅媛 = 吏꾩엯媛 횞 0.98 (2% ?먯떎)

5. **Confidence 怨꾩궛**:
   - 湲곕낯 50??   - 異붽? 媛?곗젏 議곌굔 異⑹” ??媛??   - 理쒕? 100??
## 異쒕젰 ?뺤떇

?뚰뙆 議곌굔??異⑹”??醫낅ぉ留?諛섑솚?섏꽭??
議곌굔 誘몄땐議??먮뒗 ${marketInfo[marketTarget].vixProxy} >= 35?쇰㈃ 鍮?諛곗뿴??諛섑솚?섏꽭??

**CRITICAL**:
- ticker???뺥솗??醫낅ぉ 肄붾뱶
- 紐⑤뱺 ?띿뒪?몃뒗 ?쒓뎅??- 媛寃⑹? ?レ옄濡쒕쭔 (?뷀룓 湲고샇 ?놁쓬)
- date??YYYY-MM-DD ?뺤떇
- 諛섎뱶??JSON 諛곗뿴濡쒕쭔 ?묐떟?섎ŉ, 留덊겕?ㅼ슫 肄붾뱶 釉붾줉?쇰줈 媛먯떥二쇱꽭??
\`\`\`json
[
  {
    "ticker": "...",
    "stockName": "...",
    "market": "KR" | "US",
    "date": "YYYY-MM-DD",
    "kValue": 0.5,
    "vixLevel": 14.5,
    "previousDayRange": 1000,
    "openPrice": 10000,
    "breakoutPrice": 10500,
    "currentPrice": 10600,
    "targetPrice": 11000,
    "stopLoss": 10300,
    "confidence": 85,
    "rationale": "...",
    "marketCondition": "low_volatility"
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
                // responseSchema: schema, // Conflicts with tools
                tools: [{ googleSearch: {} }]
            }
        });

        let text = response.text || '[]';
        // Cleanup markdown code blocks
        text = text.replace(/```json\n?|\n?```/g, '').trim();

        // Improved robust JSON extraction
        const firstBracket = text.indexOf('[');
        const lastBracket = text.lastIndexOf(']');

        if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
            text = text.substring(firstBracket, lastBracket + 1);
        } else {
            console.warn('[Volatility Breakout] No JSON array found in response, attempting cleanup');
            // Check if it's wrapped in an object like { "breakouts": [...] }
            if (text.trim().startsWith('{')) {
                const firstSquare = text.indexOf('[');
                const lastSquare = text.lastIndexOf(']');
                if (firstSquare !== -1 && lastSquare !== -1) {
                    text = text.substring(firstSquare, lastSquare + 1);
                }
            }
        }

        const breakouts: VolatilityBreakout[] = JSON.parse(sanitizeJsonString(text));
        console.log(`[Volatility Breakout] Found ${breakouts.length} breakouts for ${marketTarget} market`);
        return breakouts;

    } catch (error) {
        console.error('[Volatility Breakout] Error:', error);
        throw new Error(`蹂?숈꽦 ?뚰뙆 ?ㅼ틪 ?ㅽ뙣: ${error instanceof Error ? error.message : '?????녿뒗 ?ㅻ쪟'}`);
    }
}

/**
 * Helper: Check if should trade based on VIX level
 */
export function shouldTradeToday(vixLevel: number): boolean {
    return vixLevel < 35;
}

/**
 * Helper: Get market condition description
 */
export function getMarketConditionDescription(condition: string): string {
    const descriptions = {
        'low_volatility': '저변동성 - 공격적 진입 가능',
        'normal': '정상 변동성 - 표준 전략 적용',
        'high_volatility': '고변동성 - 보수적 접근',
        'extreme': '극단적 변동성 - 매매 중단 권장'
    };
    return descriptions[condition as keyof typeof descriptions] || '정보 없음';
}
