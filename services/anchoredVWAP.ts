// services/anchoredVWAP.ts
/**
 * Anchored VWAP (Volume Weighted Average Price) Service
 * Calculates institutional average price from key anchor points
 * Used to identify support/resistance levels based on "smart money" entry prices
 */

import { generateContentWithRetry } from './gemini/client';
import type { AnchoredVWAP, MarketTarget } from '../types';
import { Type } from '@google/genai';

/**
 * Calculate Anchored VWAP for given stocks
 * Identifies key anchor points (earnings, 52w high/low) and calculates VWAP from those dates
 */
export async function calculateAnchoredVWAP(
    marketTarget: MarketTarget,
    tickers: string[]
): Promise<AnchoredVWAP[]> {

    const marketInfo = {
        KR: { name: '?�국 ?�장', currency: 'KRW' },
        US: { name: '미국 ?�장', currency: 'USD' }
    };

    const prompt = `
# Anchored VWAP Analysis - ${marketInfo[marketTarget].name}

You are a professional analyst tracking institutional investors' average entry prices.

## Stocks to Analyze
${tickers.map(ticker => `- ${ticker}`).join('\n')}

## Anchored VWAP Concept

**Definition**: Volume-weighted average price calculated from a specific event (anchor point)
**Purpose**: Estimate institutional investors' actual average entry price to identify support/resistance levels

### Key Anchor Points (Priority Order)

1. **Earnings Release** (Highest Priority)
   - Recent quarterly earnings announcement date
   - Very important if stock moved significantly after earnings

2. **52-Week Low** (Strong Support)
   - Date when 52-week low was recorded in the past year
   - VWAP from this point acts as strong support

3. **52-Week High** (Strong Resistance)
   - Date when 52-week high was recorded in the past year
   - VWAP from this point acts as resistance

4. **Major News Events**
   - Large capital raises, M&A, policy announcements, etc.
   - When trading volume spiked 3x or more

## Analysis Instructions

1. **Use Google Search**:
   - Find recent earnings announcement dates
   - Find 52-week high/low dates
   - Find major news event dates
   - Find current stock price

2. **VWAP Calculation (Conceptual)**:
   - Sum of (Price × Volume) from anchor date to present / Sum of Volume
   - Since actual calculation is not possible, estimate as midpoint between anchor price and current price

3. **Support/Resistance Determination**:
   - Current Price > VWAP: VWAP acts as support (isSupport = true)
   - Current Price < VWAP: VWAP acts as resistance (isSupport = false)
   - Current price near VWAP (±2%): priceAction = 'approaching'
   - Bouncing from VWAP: priceAction = 'bouncing'
   - Breaking through VWAP: priceAction = 'breaking'

4. **Strength Calculation (0-100)**:
   - Anchor event importance (Earnings = 100, 52w low = 90, News = 70)
   - Volume spike (3x+ = +20 points)
   - Number of VWAP bounces (1 bounce = +10 points, max 30 points)

5. **Confidence Calculation**:
   - Based on Strength
   - Higher confidence when current price is closer to VWAP (±5% = high confidence)

## Output Format

For each stock, select **the single most important anchor point** and analyze in detail.
Exclude stocks with no valid anchor points.

**CRITICAL**:
- ticker must be exact stock code
- All responses in English
- Prices as numbers only (no currency symbols)
- Respond ONLY with a valid JSON array wrapped in markdown code blocks, like:
\`\`\`json
[
  {
    "ticker": "...",
    "stockName": "...",
    "anchorDate": "YYYY-MM-DD",
    "anchorEvent": "...",
    "anchorPrice": 100,
    "vwapPrice": 105,
    "currentPrice": 102,
    "distancePercent": -2.8,
    "isSupport": false,
    "strength": 80,
    "priceAction": "approaching",
    "confidence": 85
  }
]
\`\`\`
`;

    try {
        const response = await generateContentWithRetry({
            model: 'gemini-2.0-flash-001',
            contents: prompt,
            config: {
                // responseMimeType: 'application/json', // Conflits with tools
                // responseSchema: schema, // Conflicts with tools
                tools: [{ googleSearch: {} }]
            }
        });

        let text = response.text || '[]';
        // Cleanup markdown code blocks if present
        text = text.replace(/```json\n?|\n?```/g, '').trim();

        const vwaps: AnchoredVWAP[] = JSON.parse(text);
        console.log(`[Anchored VWAP] Calculated ${vwaps.length} VWAPs for ${marketTarget} market`);
        return vwaps;

    } catch (error) {
        console.error('[Anchored VWAP] Error:', error);
        throw new Error(`Anchored VWAP calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Helper function to identify if price is near VWAP support/resistance
 */
export function isPriceNearVWAP(vwap: AnchoredVWAP, threshold: number = 2): boolean {
    return Math.abs(vwap.distancePercent) <= threshold;
}

/**
 * Helper function to get VWAP strength rating
 */
export function getVWAPStrengthRating(strength: number): 'very_strong' | 'strong' | 'moderate' | 'weak' {
    if (strength >= 90) return 'very_strong';
    if (strength >= 75) return 'strong';
    if (strength >= 60) return 'moderate';
    return 'weak';
}

