// services/gemini/smcScanner.ts
/**
 * Smart Money Concept (SMC) Scanner
 * Identifies institutional order blocks, liquidity voids, and fair value gaps (FVG)
 */

import { generateContentWithRetry } from './client';
import type { SMCAnalysis, MarketTarget } from '../../types';
import { SchemaType } from '@google/generative-ai';

/**
 * Scan for SMC patterns
 * looking for: Order Blocks, FVG (Fair Value Gaps), Liquidity Sweeps
 */
export async function scanForSMC(
    marketTarget: MarketTarget,
    watchlist: string[]
): Promise<SMCAnalysis[]> {

    const marketInfo = {
        KR: { name: '?œêµ­ ?œì¥ (KOSPI/KOSDAQ)', currency: 'KRW' },
        US: { name: 'ë¯¸êµ­ ?œì¥ (NYSE/NASDAQ)', currency: 'USD' }
    };

    const prompt = `
# Smart Money Concept (SMC) ë¶„ì„ - ${marketInfo[marketTarget].name}

?¹ì‹ ?€ ICT(Inner Circle Trader) ë°©ë²•ë¡ ê³¼ ?¤ë§ˆ??ë¨¸ë‹ˆ ì»¨ì…‰(SMC) ?„ë¬¸ ?¸ë ˆ?´ë”?…ë‹ˆ??
ê¸°ê? ?¬ì??Smart Money)???”ì ??ì°¾ì•„ ë¶„ì„?´ì£¼?¸ìš”.

## ë¶„ì„ ?€??ì¢…ëª©
${watchlist.map(ticker => `- ${ticker}`).join('\n')}

## ë¶„ì„ ?µì‹¬ ?”ì†Œ

1. **Order Block (OB) - ?¤ë”ë¸”ëŸ­**:
   - ê°•ë ¥???ìŠ¹/?˜ë½ ì§ì „??ë°˜ë? ë°©í–¥ ìº”ë“¤
   - ê¸°ê???ë¬¼ëŸ‰??ëª¨ì? êµ¬ê°„ (ì§€ì§€/?€????• )

2. **Fair Value Gap (FVG) - ë¶ˆê· ??ê°?*:
   - ê¸‰ê²©??ê°€ê²??´ë™?¼ë¡œ ?¸í•´ ë§¤ìˆ˜/ë§¤ë„ ì£¼ë¬¸??ë¶ˆê· ?•í•˜ê²?ì²´ê²°??êµ¬ê°„
   - ìº”ë“¤ 1??ê³ ê??€ ìº”ë“¤ 3???€ê°€ ?¬ì´??ë¹?ê³µê°„ (?ìŠ¹ ??
   - ê°€ê²©ì´ ?¤ì‹œ ?Œê??˜ë ¤???ì„ ?¨ê³¼(Magnet Effect) ë°œìƒ

3. **Liquidity Sweep (Liq) - ? ë™??ì²?‚°**:
   - ?´ì „ ê³ ì /?€?ì„ ?´ì§ ê¹¼ë‹¤ê°€ ê¸‰ê²©??ë°˜ì „?˜ëŠ” ?¨í„´
   - ê°œë??¤ì˜ ?ì ˆ ë¬¼ëŸ‰(Stop Loss)???¬ëƒ¥?˜ê³  ?¤ë§ˆ??ë¨¸ë‹ˆê°€ ì§„ì…??? í˜¸

4. **Market Structure Shift (MSS) - ?œì¥ êµ¬ì¡° ë³€ê²?*:
   - ?˜ë½ ì¶”ì„¸?ì„œ ê³ ì ???’ì´???€ì§ì„ (?ìŠ¹ ?„í™˜)
   - ?ìŠ¹ ì¶”ì„¸?ì„œ ?€?ì„ ??¶”???€ì§ì„ (?˜ë½ ?„í™˜)

## ì§€?œì‚¬??

1. ê°?ì¢…ëª©???€??ìµœê·¼ ì°¨íŠ¸ë¥?ë¶„ì„?˜ì—¬ ??4ê°€ì§€ SMC ?”ì†Œê°€ ?ˆëŠ”ì§€ ?•ì¸?˜ì„¸??
2. **SMC Setup**???•ì„±??ì¢…ëª©ë§?? ì •?˜ì„¸?? (?†ìœ¼ë©??œì™¸)
3. ì§„ì…(Entry), ?ì ˆ(Stop Loss), ëª©í‘œ(Take Profit) ê°€ê²©ì„ SMC ê´€?ì—???¤ì •?˜ì„¸??

## ì¶œë ¥ ?•ì‹

**CRITICAL**:
- ticker???•í™•??ì¢…ëª© ì½”ë“œ
- stockName?€ ì¢…ëª©ëª?
- ëª¨ë“  ?¤ëª…?€ ?œêµ­?´ë¡œ ?‘ì„±
- ê°€ê²©ì? ?«ìë§?(?µí™” ê¸°í˜¸ ?œì™¸)
- ë°˜ë“œ??JSON ë°°ì—´ë¡œë§Œ ?‘ë‹µ?˜ë©°, ë§ˆí¬?¤ìš´ ì½”ë“œ ë¸”ë¡?¼ë¡œ ê°ì‹¸ì£¼ì„¸??
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

        const analyses: SMCAnalysis[] = JSON.parse(text);
        console.log(`[SMC Scanner] Found ${analyses.length} setups for ${marketTarget} market`);
        return analyses;

    } catch (error) {
        console.error('[SMC Scanner] Error:', error);
        throw new Error(`SMC ë¶„ì„ ?¤íŒ¨: ${error instanceof Error ? error.message : '?????†ëŠ” ?¤ë¥˜'}`);
    }
}

export const scanForSMCSignals = scanForSMC;
