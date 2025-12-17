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
 * Entry: Price > Open + (Previous Day Range Ã— K)
 */
export async function scanForVolatilityBreakouts(
    marketTarget: MarketTarget,
    watchlist: string[]
): Promise<VolatilityBreakout[]> {

    const marketInfo = {
        KR: { name: '?œêµ­ ?œì¥ (KOSPI/KOSDAQ)', vixProxy: 'VKOSPI' },
        US: { name: 'ë¯¸êµ­ ?œì¥ (NYSE/NASDAQ)', vixProxy: 'VIX' }
    };

    const prompt = `
# Dynamic K ë³€?™ì„± ?ŒíŒŒ ?„ëµ - ${marketInfo[marketTarget].name}

?„ì„¤???¸ë ˆ?´ë” ?˜ë¦¬ ?Œë¦¬?„ìŠ¤(Larry Williams)??ë³€?™ì„± ?ŒíŒŒ ?„ëµ??AIë¡?êµ¬í˜„???œìŠ¤?œì…?ˆë‹¤.

## ë¶„ì„ ?€??ì¢…ëª©
${watchlist.map(ticker => `- ${ticker}`).join('\n')}

## ?„ëµ ê°œìš”

### ?µì‹¬ ê³µì‹
**ì§„ì…ê°€ = ?œê? + (?„ì¼ ë³€?™í­ Ã— K)**

?¬ê¸°??
- **?„ì¼ ë³€?™í­** = ?„ì¼ ê³ ê? - ?„ì¼ ?€ê°€
- **K** = ë³€?™ì„± ì§€??${marketInfo[marketTarget].vixProxy})???°ë¼ ?™ì  ì¡°ì ˆ

### Dynamic K ê°?ê²°ì •

**${marketInfo[marketTarget].vixProxy} ê¸°ì?**:
- **< 15 (?€ë³€?™ì„±)**: K = 0.5 (ê³µê²©??ì§„ì…)
- **15-25 (?µìƒ)**: K = 0.4 (?œì? ì§„ì…)
- **25-35 (ê³ ë??™ì„±)**: K = 0.3 (ë³´ìˆ˜??ì§„ì…)
- **>= 35 (ê·¹ë‹¨??**: K = 0.2 (ë§¤ë§¤ ì¤‘ë‹¨ ê¶Œì¥)

### ì§„ì… ì¡°ê±´

1. **?„ìˆ˜ ì¡°ê±´** (ëª¨ë‘ ì¶©ì¡±):
   - ?„ì¬ê°€ > ?œê? + (?„ì¼ ë³€?™í­ Ã— K)
   - ê±°ë˜??> ?„ì¼ ê±°ë˜??Ã— 1.2
   - ?„ì¼ ë³€?™í­ > ?‰ê·  ë³€?™í­ (20??ê¸°ì?)

2. **ì¶”ê? ê°€?°ì ** (? íƒ):
   - ?„ì¼ ì¢…ê?ê°€ ?„ì¼ ê³ ê? ê·¼ì²˜ (?ìœ„ 20% ?´ë‚´): +20??   - 5???°ì† ?ìŠ¹ ì¤? +15??   - 200???´ë™?‰ê· ???? +10??
3. **?œì™¸ ì¡°ê±´** (?˜ë‚˜?¼ë„ ?´ë‹¹ ???œì™¸):
   - ?¹ì¼ ?œê? ê°?> 5%
   - ?„ì¼ ?í•œê°€
   - ${marketInfo[marketTarget].vixProxy} >= 35 (ê·¹ë‹¨??ë³€?™ì„±)
   - ê±°ë˜??< ?‰ê· ??50%

### ì²?‚° ?„ëµ

- **?µì ˆ**: ?¤ìŒ ???œê? ?ëŠ” +5% ?„ë‹¬ ??- **?ì ˆ**: ì§„ì…ê°€ ?€ë¹?-2% (ê°€ê²©ì  ?ì ˆ)
- **?œê°„ ì²?‚°**: 3????ëª©í‘œê°€ ë¯¸ë„????
## ë¶„ì„ ì§€ì¹?
1. **Google Search ?œìš©**:
   - ?„ì¬ ${marketInfo[marketTarget].vixProxy} ì§€???•ì¸
   - ê°?ì¢…ëª©???„ì¼ ê³ ê?/?€ê°€/ì¢…ê? ?•ì¸
   - ?¹ì¼ ?œê? ë°??„ì¬ê°€ ?•ì¸
   - ê±°ë˜???•ë³´ ?•ì¸

2. **K ê°?ê³„ì‚°**:
   - ë¨¼ì? ?„ì¬ ${marketInfo[marketTarget].vixProxy} ?•ì¸
   - ê¸°ì????°ë¼ K ê°?ê²°ì •
   - ${marketInfo[marketTarget].vixProxy} >= 35?¼ë©´ ë§¤ë§¤ ì¤‘ë‹¨ (ë¹?ë°°ì—´ ë°˜í™˜)

3. **ì§„ì…ê°€ ê³„ì‚°**:
   - ì§„ì…ê°€ = ?œê? + (?„ì¼ ê³ ê? - ?„ì¼ ?€ê°€) Ã— K
   - ?„ì¬ê°€ > ì§„ì…ê°€??ì¢…ëª© ? ì •

4. **ëª©í‘œê°€/?ì ˆê°€ ?¤ì •**:
   - ëª©í‘œê°€ = ì§„ì…ê°€ Ã— 1.05 (5% ?˜ìµ)
   - ?ì ˆê°€ = ì§„ì…ê°€ Ã— 0.98 (2% ?ì‹¤)

5. **Confidence ê³„ì‚°**:
   - ê¸°ë³¸ 50??   - ì¶”ê? ê°€?°ì  ì¡°ê±´ ì¶©ì¡± ??ê°€??   - ìµœë? 100??
## ì¶œë ¥ ?•ì‹

?ŒíŒŒ ì¡°ê±´??ì¶©ì¡±??ì¢…ëª©ë§?ë°˜í™˜?˜ì„¸??
ì¡°ê±´ ë¯¸ì¶©ì¡??ëŠ” ${marketInfo[marketTarget].vixProxy} >= 35?¼ë©´ ë¹?ë°°ì—´??ë°˜í™˜?˜ì„¸??

**CRITICAL**:
- ticker???•í™•??ì¢…ëª© ì½”ë“œ
- ëª¨ë“  ?ìŠ¤?¸ëŠ” ?œêµ­??- ê°€ê²©ì? ?«ìë¡œë§Œ (?”í ê¸°í˜¸ ?†ìŒ)
- date??YYYY-MM-DD ?•ì‹
- ë°˜ë“œ??JSON ë°°ì—´ë¡œë§Œ ?‘ë‹µ?˜ë©°, ë§ˆí¬?¤ìš´ ì½”ë“œ ë¸”ë¡?¼ë¡œ ê°ì‹¸ì£¼ì„¸??
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
        throw new Error(`ë³€?™ì„± ?ŒíŒŒ ?¤ìº” ?¤íŒ¨: ${error instanceof Error ? error.message : '?????†ëŠ” ?¤ë¥˜'}`);
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
        'low_volatility': 'Àúº¯µ¿¼º - °ø°İÀû ÁøÀÔ °¡´É',
        'normal': 'Á¤»ó º¯µ¿¼º - Ç¥ÁØ Àü·« Àû¿ë',
        'high_volatility': '°íº¯µ¿¼º - º¸¼öÀû Á¢±Ù',
        'extreme': '±Ø´ÜÀû º¯µ¿¼º - ¸Å¸Å Áß´Ü ±ÇÀå'
    };
    return descriptions[condition as keyof typeof descriptions] || 'Á¤º¸ ¾øÀ½';
}
