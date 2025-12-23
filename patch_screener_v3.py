
import os
import re

file_path = r"c:\Users\USER\Downloads\직투\copy-of-sepa-ai\services\gemini\screenerService.ts"

with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# 1. New Chart Pattern Screener Logic (Wide Scan + Safety Filter)
new_chart_pattern = """export async function runChartPatternScreener(marketTarget: MarketTarget, _timeframe: ScreenerTimeframe): Promise<ChartPatternResult[]> {
    if (!ai) throw new Error("AI 서비스가 비활성화되어 차트 패턴 분석을 수행할 수 없습니다.");

    const gatheringPrompt = `
    You are an expert Technical Analyst AI.
    Your mission is to find "Chart Pattern Opportunities" in the ${marketInfo[marketTarget].name} market (Wide Scan).

    **CORE STRATEGY: Classical Chart Patterns (Optimized)**
    - **Target Patterns:**
        1. **Volatility Contraction Pattern (VCP):** Tightening price action with decreasing volume.
        2. **Cup with Handle:** Classic bullish continuation.
        3. **Double Bottom / Flat Base:** Strong support establishment.
        4. **Ascending Triangle:** Bullish pressure against resistance.
    
    **WIDE SCAN CRITERIA:**
    - **Universe:** Include High-Quality **Mid/Small Caps** (Market Cap > 100B KRW / $100M).
    - **Liquidity:** Daily Traded Value > 5B KRW ($5M) to ensure exit liquidity.
    
    **SAFETY FILTER (CRITICAL):**
    - **EXCLUDE** Penny Stocks (Price < 1,000 KRW).
    - **EXCLUDE** Stocks with "Administrative Issue" (관리종목) status.
    - **EXCLUDE** Stocks in clear long-term downtrend (200MA is diving).

    **Execution:**
    1.  Scan for stocks with decent Relative Strength (RS).
    2.  Identify clear chart patterns on Daily or Weekly timeframes.
    3.  Verify Volume: Volume should be dry in consolidation.

    ${ANTI_HALLUCINATION_RULE}
    Present your findings as a detailed text report (CONTEXT) in Korean. Explicitly mention the **Pattern Name** and **Entry/Stop levels**.
    `;

    const gatheringResponse = await generateContentWithRetry({ model: "gemini-2.0-flash-001", contents: gatheringPrompt, config: { tools: [{ googleSearch: {} }] } });
    const gatheredDataContext = gatheringResponse.text;

    const structuringPrompt = `
    ${DATA_GROUNDING_PROTOCOL}
    Based ONLY on the provided context, generate a structured JSON array of "Chart Pattern Signals".

    **CONTEXT:**
    ---
    ${gatheredDataContext}
    ---

    **Instructions:**
    - **symbol**: Ticker (e.g., 005930.KS or AAPL).
    - **stockName**: Korean Name (MANDATORY).
    - **timeframe**: 'Daily' or 'Weekly'.
    - **strategy_hits**: List detected patterns (VCP, CupAndHandle, etc.).
    - **scores**: Estimate technical scores (0-100) based on pattern clarity.
    - **trade_plan**: Propose specific Entry, Stop Loss, and Target levels based on the pattern height/depth.

    ${ANTI_HALLUCINATION_RULE}
    **CRITICAL:** All text must be in Korean, EXCEPT for the 'ticker'. Respond ONLY with a valid JSON array matching the schema.
    `;

    const response = await generateContentWithRetry({
        model: "gemini-2.0-flash-001",
        contents: structuringPrompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: { type: Type.ARRAY, items: chartPatternResultSchema }
        }
    });

    return JSON.parse(sanitizeJsonString(response.text || '[]'));
}"""

# 2. New Structural Growth Scan Logic (Value Pivot + Wide Scan)
new_value_pivot = """export async function runStructuralGrowthScan(marketTarget: MarketTarget, candidates?: UserWatchlistItem[]): Promise<ValuePivotScreenerResult[]> {
    if (!ai) throw new Error("AI 서비스가 비활성화되었습니다.");

    const gatheringPrompt = `
    You are an expert Fundamental Analyst AI specializing in "Structural Growth & Pivot" strategies.
    Your mission is to find "Value + Pivot" candidates in the ${marketInfo[marketTarget].name} market (Wide Scan).

    **CORE STRATEGY: Value with a Catalyst**
    - **Target Characteristics (Relaxed for Hidden Gems):**
        1. **Valuation:** PER < 20 (or Cheap vs Peers) & PBR < 2.0.
        2. **Growth:** Operating Profit Growth > 10% YoY (Turnaround counts).
        3. **Catalyst:** CAPEX Cycle, New Product, or Shareholder Return Enhancement.

    **WIDE SCAN UNIVERSE:**
    - **Market Cap:** > 100B KRW ($100M). Focus on **Hidden Champions** in Mid-Cap space.
    
    **SAFETY FILTER (CRITICAL):**
    - **EXCLUDE** companies with 3 years of consecutive Operating Loss.
    - **EXCLUDE** companies with "Impaired Capital" (자본잠식) or "Administrative Issue" (관리종목).

    **Execution:**
    1.  Search for companies with recent "Value Up" announcements or major CAPEX news.
    2.  Check for "Business Transformation" stories.
    3.  Filter for reasonable valuation.

    ${ANTI_HALLUCINATION_RULE}
    Present your findings as a detailed text report (CONTEXT) in Korean. Focus on the "Structural Change" in your explanation.
    `;

    const gatheringResponse = await generateContentWithRetry({
        model: "gemini-2.0-flash-001",
        contents: gatheringPrompt,
        config: { tools: [{ googleSearch: {} }] }
    });
    const gatheredDataContext = gatheringResponse.text;

    const structuringPrompt = `
    ${DATA_GROUNDING_PROTOCOL}
    Based ONLY on the provided context, generate a structured JSON array of "Value Pivot Signals".

    **CONTEXT:**
    ---
    ${gatheredDataContext}
    ---

    **Instructions:**
    - **ticker**: Ticker symbol.
    - **stockName**: Korean Name (MANDATORY).
    - **summary**: Brief one-line summary of the investment case.
    - **structuralChangeScore**: Evaluate CAPEX, Business Shift, and IR mentions. Pass if evidence is strong.
    - **policyAlignmentScore**: Pass if shareholder return policy is clear.

    ${ANTI_HALLUCINATION_RULE}
    **CRITICAL:** All text must be in Korean, EXCEPT for the 'ticker'. Respond ONLY with a valid JSON array matching the schema.
    `;

    const response = await generateContentWithRetry({
        model: "gemini-2.0-flash-001",
        contents: structuringPrompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: valuePivotScreenerResultSchema
            }
        }
    });

    return JSON.parse(sanitizeJsonString(response.text || '[]'));
}"""

# Regex Replacement Logic
# 1. Replace runChartPatternScreener
pattern_chart = r"export async function runChartPatternScreener[\s\S]*?(?=export async function scanForBFLStocks)"
if re.search(pattern_chart, content):
    content = re.sub(pattern_chart, new_chart_pattern + "\n\n", content, count=1)
    print("Replaced runChartPatternScreener")
else:
    print("Could not find runChartPatternScreener block")

# 2. Replace runStructuralGrowthScan
pattern_value = r"export async function runStructuralGrowthScan[\s\S]*?(?=export async function runAlphaCoreScan)"
if re.search(pattern_value, content):
    content = re.sub(pattern_value, new_value_pivot + "\n\n", content, count=1)
    print("Replaced runStructuralGrowthScan")
else:
    print("Could not find runStructuralGrowthScan block")

# Write back
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Patch complete.")
