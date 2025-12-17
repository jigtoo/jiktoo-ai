// services/gemini/alphaEngineService.ts
import { Type } from "@google/genai";
import type { StrategyPlaybook, MarketTarget, Signal, InvestmentPersona, WatchlistHistoryItem, UserWatchlistItem, DayTraderSignal, DashboardStock, NeutralSignal, ActiveSignal, UserStrategy, MarketRegimeAnalysis, RealtimeSignal } from '../../types';
import { ai, AI_DISABLED_ERROR_MESSAGE, generateContentWithRetry } from './client';
import { sanitizeJsonString } from '../utils/jsonUtils';
import { marketInfo } from '../marketInfo';
import { DATA_GROUNDING_PROTOCOL, ANTI_HALLUCINATION_RULE } from './prompts/protocols';
import { SWING_STRATEGIES_DOCUMENT } from './prompts/swingStrategies';
import { supabase } from '../supabaseClient';
import { _fetchLatestPrice } from '../dataService';
import { shouldCallGemini } from '../../alpha/shouldCall';
import { callGeminiCompact } from '../../alpha/gemini';
import { bumpTodayCalls, setState } from '../appConfig';
import { sha256 } from '../../utils/hash';
import { kisApiLimiter } from '../rateLimiter';
import { fetchNaverNews, calculateSentimentScore } from '../naverNewsService';


export async function processWatchlistItemForPlaybook(
    item: UserWatchlistItem,
    marketTarget: MarketTarget,
): Promise<StrategyPlaybook | null> {
    // 1. DB ?∞ÏÑ† Ï°∞Ìöå
    const dbData = await fetchAlphaPreviewLatest(item.ticker);

    if (!dbData) {
        console.warn(`[Hybrid Playbook] No DB data for ${item.ticker}, skipping.`);
        return null;
    }

    // 2. Í∏∞Î≥∏ Ïπ¥Îìú Íµ¨ÏÑ± (DB only)
    let basePlaybookItem: StrategyPlaybook = {
        id: `${item.ticker}-DBSignal`,
        stockName: dbData.stockName || item.stockName,
        ticker: item.ticker,
        strategyName: 'DB Signal',
        strategySummary: dbData.rationale || '(?∞Ïù¥?∞Î≤†?¥Ïä§?êÏÑú ?úÍ≥µ???îÏïΩ)',
        aiConfidence: dbData.aiScore || 50,
        keyLevels: {
            entry: dbData.pivotPoint || 'N/A',
            stopLoss: 'N/A',
            target: 'N/A',
        },
        analysisChecklist: [],
        isUserRecommended: true,
        addedAt: dbData.updated_at || new Date().toISOString(),
        strategyType: 'SwingTrade',
        source: 'db',
    };

    // 3. ?ÖÎ†•?îÏïΩ ?¥Ïãú Î∞?Gemini ?∏Ï∂ú Ï°∞Í±¥ ?ïÏù∏
    const compact = { t: dbData.ticker, m: dbData.market, r: dbData.rationale, p: dbData.pivotPoint, at: dbData.updated_at };
    const inputHash = await sha256(JSON.stringify(compact));
    const stateKey = `playbook:${marketTarget}:${item.ticker}`;

    const callIsNeeded = await shouldCallGemini({ key: stateKey, inputHash });
    const cacheKey = `playbook_cache:${marketTarget}:${item.ticker}`;

    if (callIsNeeded) {
        console.log(`[Hybrid Playbook] Gemini call needed for ${item.ticker}.`);
        try {
            const geminiData = await callGeminiCompact({
                summary: {
                    ticker: dbData.ticker,
                    market: dbData.market,
                    rationale: dbData.rationale,
                    referencePrice: dbData.referencePrice,
                }
            });

            // 4. Gemini ?∞Ïù¥?∞Î°ú Î≥¥Í∞ï
            basePlaybookItem = {
                ...basePlaybookItem,
                strategyName: 'Hybrid Signal',
                strategyType: geminiData.play as ('SwingTrade' | 'DayTrade' | 'LongTerm'),
                keyLevels: {
                    entry: geminiData.pivot,
                    stopLoss: geminiData.risk,
                    target: 'N/A',
                },
                strategySummary: geminiData.rationale || basePlaybookItem.strategySummary,
                aiConfidence: geminiData.confidence,
                source: 'hybrid',
            };

            await bumpTodayCalls();
            await setState(stateKey, inputHash);
            localStorage.setItem(cacheKey, JSON.stringify(basePlaybookItem));
            return basePlaybookItem;

        } catch (e) {
            console.error(`[Hybrid Playbook] Gemini call failed for ${item.ticker}. Falling back to DB data.`, e);
            return basePlaybookItem;
        }
    } else {
        // 5. Gemini ?∏Ï∂ú Î∂àÌïÑ????Ï∫êÏãú ?ïÏù∏
        const cachedData = localStorage.getItem(cacheKey);
        if (cachedData) {
            try {
                const parsed = JSON.parse(cachedData) as StrategyPlaybook;
                if (parsed.source === 'hybrid') { // Use only if it's an enhanced version
                    return parsed;
                }
            } catch (e) {
                console.warn(`[Hybrid Playbook] Failed to parse cache for ${item.ticker}`);
            }
        }
    }

    return basePlaybookItem;
}

const activeSignalSchema = {
    type: Type.OBJECT,
    properties: {
        ticker: { type: Type.STRING },
        stockName: { type: Type.STRING },
        signalType: { type: Type.STRING, enum: ['BUY'] },
        tradingPlan: {
            type: Type.OBJECT,
            properties: {
                entryPrice: { type: Type.STRING },
                stopLoss: { type: Type.STRING },
                targets: { type: Type.ARRAY, items: { type: Type.STRING } },
                positionSizing: { type: Type.STRING },
                planRationale: { type: Type.STRING },
            },
            required: ['entryPrice', 'stopLoss', 'targets', 'positionSizing', 'planRationale']
        },
        warning: { type: Type.STRING, nullable: true }
    },
    required: ['ticker', 'stockName', 'signalType', 'tradingPlan']
};

export async function generatePlaybooksFromCandidates(
    candidates: { ticker: string; stockName: string; rationale: string; currentPrice?: number }[],
    persona: InvestmentPersona,
    marketTarget: MarketTarget,
    activeUserStrategies: UserStrategy[],
    marketRegime: MarketRegimeAnalysis | null
): Promise<{ playbooks: StrategyPlaybook[], summary: string }> {
    if (!ai) throw new Error(AI_DISABLED_ERROR_MESSAGE);

    const playbookSchema = {
        type: Type.OBJECT,
        properties: {
            id: { type: Type.STRING },
            stockName: { type: Type.STRING },
            ticker: { type: Type.STRING },
            strategyName: { type: Type.STRING, enum: ['VCP (Î≥Ä?ôÏÑ± Ï∂ïÏÜå ?®ÌÑ¥)', 'Cup and Handle (ƒ≈æÿ«⁄µÈ)', '«√∑ß ∫£¿ÃΩ∫(Flat Base)', 'ªÛΩ¬ ªÔ∞¢«¸(Ascending Triangle)', 'AI Îß§ÏßëÎ¥??¨Ï∞© (Í∏∞Í?/?∏Íµ≠???çÎÅå??', 'AI ?ÅÌïúÍ∞Ä ?¨Ï∞© ?îÏßÑ (?úÏû• Ï£ºÎèÑÏ£?', 'DB Signal', 'Hybrid Signal', '±‚≈∏'] },
            strategySummary: { type: Type.STRING },
            aiConfidence: { type: Type.NUMBER },
            keyLevels: { type: Type.OBJECT, properties: { entry: { type: Type.STRING }, stopLoss: { type: Type.STRING }, target: { type: Type.STRING } }, required: ['entry', 'stopLoss', 'target'] },
            strategyType: { type: Type.STRING, enum: ['DayTrade', 'SwingTrade', 'LongTerm'] },
        },
        required: ['id', 'stockName', 'ticker', 'strategyName', 'strategySummary', 'aiConfidence', 'keyLevels', 'strategyType']
    };

    const finalResponseSchema = {
        type: Type.OBJECT,
        properties: {
            playbooks: { type: Type.ARRAY, items: playbookSchema },
            summary: { type: Type.STRING, description: "AI??Í≤∞Ï†ï Í≥ºÏ†ïÍ≥?ÏµúÏ¢Ö ?†ÌÉù???Ä??«—±πæÓ?îÏïΩ." }
        },
        required: ['playbooks', 'summary']
    };

    const activeStrategiesContext = activeUserStrategies.length > 0
        ? `
**Your Active Strategies (The ONLY strategies to use for scanning):**
You MUST evaluate candidates against the following user-activated strategies.
---
${JSON.stringify(activeUserStrategies.map(s => ({ name: s.name, description: s.description, rules: s.rules })), null, 2)}
---
`
        : `
**Your Active Strategies:**
No user-defined strategies are active. You MUST inform the user in your 'summary' that no playbooks can be generated because no strategies are active.
`;

    const marketRegimeContext = marketRegime
        ? `
**Market Regime:** ${marketRegime.regime} - ${marketRegime.summary}
**Market Adaptability Rule:** The current market regime is '${marketRegime.regime}'. You MUST adapt your selection criteria based on this.
- In a '?òÎùΩ?? or 'Í≥†Î??ôÏÑ± ?ºÎ???, you MUST **give highest priority to the 'AI Îß§ÏßëÎ¥??¨Ï∞© (Í∏∞Í?/?∏Íµ≠???çÎÅå??' strategy if it is active**. Look for stocks that are resilient (rising on a down day) or being heavily accumulated by institutions/foreigners. Be extremely selective. It is acceptable to find zero signals if conviction is low.
- In a '?ÄÎ≥Ä?ôÏÑ± Ï∂îÏÑ∏??, you can be more flexible. A stock matching 80% of a classic breakout strategy's criteria might be a valid candidate.`
        : `**Market Regime:** Unknown. Proceed with standard analysis.`;

    // Get current time in target market's timezone
    const now = new Date();
    const marketTime = new Intl.DateTimeFormat('en-US', {
        timeZone: marketTarget === 'KR' ? 'Asia/Seoul' : 'America/New_York',
        hour: 'numeric',
        minute: 'numeric',
        hour12: false
    }).format(now);

    const gatheringPrompt = `
You are the JIKTOO Alpha Engine, a sophisticated AI that scans a stock watchlist against a set of trading strategies. Your goal is to find stocks that are actionable *now*.

**CONTEXT:**
1.  **Market:** ${marketInfo[marketTarget].name}
2.  **Current Market Time:** ${marketTime} (Use this to filter time-sensitive strategies)
3.  ${marketRegimeContext}
4.  **Your Watchlist (The universe of stocks to scan):**
    ${JSON.stringify(candidates, null, 2)}
5.  ${activeStrategiesContext}

**YOUR TASK (2-Step Process):**
**STEP 1: GATHER & ANALYZE (This is your current task)**
- **Use Real-time Data:** You MUST use the provided 'currentPrice' as the basis for your technical analysis to ensure accuracy.
- **Scan & Match:** For each stock in 'Your Watchlist', evaluate it against **ALL strategies listed in 'Your Active Strategies'**, paying close attention to the **Market Adaptability Rule**. If no strategies are active, state this clearly.
- **TIME SENSITIVITY RULE (CRITICAL):**
    - **Closing Bell (¡æ∞° πË∆√):** ONLY suggest this if the Current Market Time is within 1 hour of market close (KR: 14:30-15:30, US: 15:00-16:00). If it is earlier, suggest 'SwingTrade' or 'DayTrade' instead.
- **VALIDATION:** For any potential matches, use Google Search to get the latest volume and news to confirm the setup is valid *today*.
- **Select Top 1-3 Matches:** Based on your scan, select only the 1 to 3 stocks that provide the **strongest match** to any of the available strategies.
- **OUTPUT:** Present all your findings and analysis as a comprehensive, unstructured text report in **KOREAN («—±πæÓ**. For each stock you select, clearly state **which strategy it matched** and **why**.
`;

    const gatheringResponse = await generateContentWithRetry({
        model: "gemini-2.0-flash-001",
        contents: gatheringPrompt,
        config: {
            tools: [{ googleSearch: {} }],
        }
    });
    const gatheredDataContext = gatheringResponse.text;

    // STEP 2: STRUCTURING
    const structuringPrompt = `
${DATA_GROUNDING_PROTOCOL}
You are an AI Analyst creating structured trading playbooks based on your own prior analysis. Your primary reference for your built-in strategies is the document provided below.

**REFERENCE: SWING TRADING STRATEGIES DOCUMENT**
---
${SWING_STRATEGIES_DOCUMENT}
---

**CONTEXT (Your detailed analysis report on the candidates):**
---
${gatheredDataContext}
---

Based ONLY on the provided CONTEXT, generate a structured JSON object containing an array of 'playbooks' for the stocks you selected and a 'summary' of your decision process.

**Instructions:**
- For each stock you selected in the CONTEXT, create a detailed \`StrategyPlaybook\` object.
- **strategyName**: This MUST be the name of the strategy you identified as a match in the CONTEXT. The available strategy names are: ['VCP (∫Øµøº∫ √‡º“ ∆–≈œ)', 'Cup and Handle (ƒ≈æÿ«⁄µÈ)', '«√∑ß ∫£¿ÃΩ∫(Flat Base)', 'ªÛΩ¬ ªÔ∞¢«¸(Ascending Triangle)', 'AI ∏≈¡˝∫¿ ∆˜¬¯ (±‚∞¸/ø‹±π¿Œ ºˆ±ﬁ)', 'AI ªÛ«—∞° ∆˜¬¯ µπ¡¯ (Ω√¿Â ¡÷µµ¡÷)', 'DB Signal', 'Hybrid Signal', '±‚≈∏'].
- **strategySummary**: Write a concise rationale explaining WHY this stock is a top pick now, referencing how it matches the chosen strategy.
- **aiConfidence**: Your conviction level (0-100), based on how perfectly it fits the strategy's rules.
- **keyLevels**: Define precise, actionable price levels for entry, stop-loss, and the first target, based on the strategy's rules.
- **id**: Use format \`{ticker}-{strategyName}\`.
- **strategyType**: 'SwingTrade' is the default unless the context or strategy name (e.g., ?ÅÌïúÍ∞Ä) strongly suggests 'DayTrade'.
- Create a final 'summary' of your overall decision-making process.
- If no candidates were selected in the context, return an empty 'playbooks' array.

**CRITICAL RULES:**
- All text MUST be in Korean.
${ANTI_HALLUCINATION_RULE}

Respond ONLY with a single, valid JSON object matching the provided schema.
`;

    const response = await generateContentWithRetry({
        model: "gemini-2.0-flash-001",
        contents: structuringPrompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: finalResponseSchema
        }
    });

    const result = JSON.parse(sanitizeJsonString(response.text));

    const fullPlaybooks = result.playbooks.map((p: any) => ({
        ...p,
        analysisChecklist: [],
        isUserRecommended: candidates.find(c => c.ticker === p.ticker)?.rationale === 'ªÁøÎ¿⁄ ∞¸Ω…¡æ∏Ò',
        addedAt: new Date().toISOString(),
        source: 'gemini' as 'gemini'
    }));

    return { playbooks: fullPlaybooks, summary: result.summary };
}

export async function fetchActiveSignals(
    playbook: StrategyPlaybook[],
    marketTarget: MarketTarget,
    persona: InvestmentPersona,
    useAi: boolean = true // New flag to control expensive AI calls
): Promise<Signal[]> {
    if (!playbook || playbook.length === 0) return [];

    // --- STAGE 1: LOCAL PRICE CHECK (Fast & Free) ---
    const pricePromises = playbook.map(p =>
        kisApiLimiter(() =>
            _fetchLatestPrice(p.ticker, p.stockName, marketTarget)
                .then(priceInfo => ({ ticker: p.ticker, price: priceInfo.price })) // Ensure 'ticker' is always present
                .catch(error => {
                    console.warn(`[fetchActiveSignals] Price fetch failed for ${p.ticker}:`, error.message);
                    return { ticker: p.ticker, price: null, error: error.message };
                })
        )
    );
    const priceResults = await Promise.all(pricePromises);

    const localSignals: Signal[] = [];
    const playbookMap = new Map(playbook.map(p => [p.ticker, p]));

    for (const priceResult of priceResults) {
        const p = playbookMap.get(priceResult.ticker);
        if (!p) continue;

        const currentPrice = priceResult.price;

        const parsePrice = (priceStr: string | undefined | null): number => {
            if (!priceStr) return NaN;
            return parseFloat(String(priceStr).replace(/[^0-9.]/g, ''));
        };

        const entryPrice = parsePrice(p.keyLevels?.entry);
        const stopLossPrice = parsePrice(p.keyLevels?.stopLoss);

        if (currentPrice === null) {
            localSignals.push({
                type: 'NEUTRAL',
                ticker: p.ticker, stockName: p.stockName,
                reason: `?§ÏãúÍ∞?Í∞ÄÍ≤??ïÎ≥¥Î•?Í∞Ä?∏Ïò§?????§Ìå®?òÏó¨ ?†Ìò∏ ?úÏÑ±???¨Î?Î•??ïÏù∏?????ÜÏäµ?àÎã§. (${'error' in priceResult ? priceResult.error : 'Unknown error'})`,
                conflictingSignals: ['?∞Ïù¥???§Î•ò'], warning: 'Í∞ÄÍ≤?Ï°∞Ìöå ?§Ìå®',
            });
            continue;
        }

        if (isNaN(entryPrice) || isNaN(stopLossPrice)) {
            continue; // Skip malformed playbook entries in local check
        }

        if (currentPrice < stopLossPrice) {
            localSignals.push({
                type: 'NEUTRAL',
                ticker: p.ticker, stockName: p.stockName,
                reason: `?†Ìò∏Í∞Ä Î¨¥Ìö®?îÎêò?àÏäµ?àÎã§. ?ÑÏû¨Í∞Ä(${currentPrice.toLocaleString()})Í∞Ä ?êÏ†à Í∏∞Ï?Í∞Ä(${stopLossPrice.toLocaleString()})Î•??òÌñ• ?¥ÌÉà?àÏäµ?àÎã§.`,
                conflictingSignals: ['?êÏ†à Í∏∞Ï? ?ÑÎã¨'], warning: '?åÎ†à?¥Î∂Å Î¨¥Ìö®',
            });
            continue;
        }

        if (currentPrice >= entryPrice) {
            localSignals.push({
                ticker: p.ticker,
                stockName: p.stockName,
                signalType: 'BUY',
                tradingPlan: {
                    entryPrice: p.keyLevels.entry,
                    stopLoss: p.keyLevels.stopLoss,
                    targets: [p.keyLevels.target || `?êÎèô Í≥ÑÏÇ∞`],
                    positionSizing: `(AI Ï∂îÏ≤ú ÎπÑÏ§ë)`,
                    planRationale: p.strategySummary,
                },
            });
        }
    }

    // --- STAGE 2: PROACTIVE GLOBAL AI SCAN (Conditional & Cost-effective) ---
    if (!useAi || !ai) {
        console.log("[AlphaEngine] Skipping proactive AI scan as requested or AI is disabled.");
        return localSignals;
    }

    // This section is now only executed when `useAi` is true.
    // The background monitoring loop will call this with `useAi = false`.
    const allWatchlistItems = playbook.map(p => ({ ticker: p.ticker, stockName: p.stockName }));
    const tickersWithActiveOrNeutralSignal = new Set(localSignals.map(s => s.ticker));

    const gatheringPrompt = `
You are a proactive AI market scanner. Your goal is to find NEW trading opportunities from a given list of stocks, avoiding ones that already have a pending strategy.

**CONTEXT:**
1.  **Market:** ${marketInfo[marketTarget].name}
2.  **Full Watchlist to Scan:** ${JSON.stringify(allWatchlistItems)}
3.  **Stocks Already Flagged (Ignore these):** ${JSON.stringify(Array.from(tickersWithActiveOrNeutralSignal))}

**YOUR TASK:**
1.  Use Google Search to get the latest price action and news for all stocks in the **Full Watchlist**.
2.  Identify 1-2 stocks from the list that are showing **NEW, compelling, near-term BUY signals** (e.g., breaking out of a consolidation pattern, significant volume spike, positive news catalyst).
3.  **CRITICAL:** Do NOT re-analyze or return stocks from the "Stocks Already Flagged" list. Your mission is to find *new* opportunities that the basic price check missed.
4.  For each new signal you find, create a complete and actionable trading plan.
5.  If no new, high-probability signals are found, you MUST return nothing.

Present your findings as a detailed text report (CONTEXT) in Korean.
`;

    let newAiSignals: ActiveSignal[] = [];
    try {
        const gatheringResponse = await generateContentWithRetry({
            model: "gemini-2.0-flash-001",
            contents: gatheringPrompt,
            config: {
                tools: [{ googleSearch: {} }],
            }
        });
        const gatheredDataContext = gatheringResponse.text;

        if (gatheredDataContext && gatheredDataContext.trim()) {
            const structuringPrompt = `
${DATA_GROUNDING_PROTOCOL}
Based ONLY on the provided context, generate a structured JSON array of "ActiveSignal" objects.

**CONTEXT:**
---
${gatheredDataContext}
---

${ANTI_HALLUCINATION_RULE}
All text must be in Korean. If no new signals are found in the context, return an empty array. Respond ONLY with a valid JSON array matching the schema.
`;
            const structuringResponse = await generateContentWithRetry({
                model: "gemini-2.0-flash-001",
                contents: structuringPrompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: activeSignalSchema
                    }
                }
            });
            newAiSignals = JSON.parse(sanitizeJsonString(structuringResponse.text || '[]'));
        }
    } catch (e) {
        console.error("[AlphaEngine Global Scan] Failed to get new signals from AI:", e);
    }

    // --- STAGE 3: COMBINE RESULTS ---
    const combinedSignals: Signal[] = [...localSignals];
    const localSignalTickers = new Set(localSignals.map(s => s.ticker));

    for (const aiSignal of newAiSignals) {
        if (!localSignalTickers.has(aiSignal.ticker)) {
            combinedSignals.push(aiSignal);
        }
    }

    return combinedSignals;
}


export async function clearPlaybookFromDB(marketTarget: MarketTarget): Promise<void> {
    if (!supabase) return;
    await supabase.from('alpha_engine_playbooks').delete().eq('market', marketTarget);
}

export async function scanForDayTraderSignals(marketTarget: MarketTarget, watchlist: UserWatchlistItem[]): Promise<DayTraderSignal[]> {
    if (!ai) throw new Error(AI_DISABLED_ERROR_MESSAGE);

    const dayTraderSignalSchema = {
        type: Type.OBJECT,
        properties: {
            ticker: { type: Type.STRING },
            stockName: { type: Type.STRING },
            rationale: { type: Type.STRING },
            breakoutPrice: { type: Type.STRING },
            stopLoss: { type: Type.STRING },
            target: { type: Type.STRING },
            aiConfidence: { type: Type.NUMBER }
        },
        required: ['ticker', 'stockName', 'rationale', 'breakoutPrice', 'stopLoss', 'target', 'aiConfidence']
    };

    // --- TOKEN OPTIMIZATION: Pre-screen candidates ---
    // Only analyze stocks with sufficient volatility (> 0.5% change) to save Gemini tokens.
    const preScreenedWatchlist = await Promise.all(watchlist.map(async (item) => {
        try {
            const priceData = await kisApiLimiter(() => _fetchLatestPrice(item.ticker, item.stockName, marketTarget));
            const changeRate = Math.abs(priceData.changeRate || 0);
            // Threshold: 0.5% volatility
            if (changeRate >= 0.5) {
                return { ...item, currentPrice: priceData.price, changeRate: priceData.changeRate };
            }
            return null;
        } catch (e) {
            return null;
        }
    }));

    const activeCandidates = preScreenedWatchlist.filter(item => item !== null);
    console.log(`[AlphaEngine] Token Optimization: Filtered ${watchlist.length} -> ${activeCandidates.length} candidates based on volatility.`);

    if (activeCandidates.length === 0) {
        console.log("[AlphaEngine] No candidates met volatility threshold. Skipping AI analysis to save tokens.");
        return [];
    }
    // -------------------------------------------------

    // --- NEWS SENTIMENT ANALYSIS ---
    // Fetch news for each candidate and calculate sentiment score
    const newsEnrichedCandidates = await Promise.all(activeCandidates.map(async (item) => {
        try {
            const newsData = await fetchNaverNews(item.stockName, 5);
            const sentimentScore = calculateSentimentScore(newsData.items);
            return { ...item, sentimentScore, newsCount: newsData.items.length };
        } catch (e) {
            console.warn(`[News Sentiment] Failed for ${item.stockName}:`, e);
            return { ...item, sentimentScore: 0, newsCount: 0 };
        }
    }));
    // ---------------------------------

    const gatheringPrompt = `
You are the "Alpha Day Trader," an AI that scans for high-probability intraday breakout opportunities, incorporating "Soogeup Danta Wang" (Supply Scalping King) strategies.
Your universe is the provided user watchlist for the ${marketInfo[marketTarget].name}.

**CONTEXT:**
- User Watchlist (Pre-screened for volatility): ${JSON.stringify(newsEnrichedCandidates)}
- **News Sentiment Scores**: Each stock has a 'sentimentScore' (-1 to +1). Positive scores indicate bullish news.

**Your Task:**
Using Google Search, get the LATEST INTRADAY chart data and volume profiles for the stocks in the watchlist. Find 1-3 stocks matching these specific patterns:

**1. 3rd Breakout Pattern (3Ï∞??åÌåå):**
   - A stock that has tested a resistance level twice and is now breaking out on the **3rd attempt**.
   - This is a high-probability setup emphasized by Soogeup Danta Wang.

**2. Morning Gap Play (?•Ï¥àÎ∞?Í∞?ÉÅ??:**
   - Stocks that gapped up (>3-5%) at the open.
   - Crucial: They must have held support after the gap and are now breaking their morning high.
   - Avoid stocks that gapped up and are continuously sliding down (Gap Fill/Exhaustion).

**3. Execution Strength (Ï≤¥Í≤∞Í∞ïÎèÑ & ?∏Í?Ï∞?:**
   - Look for evidence of **aggressive buying**.
   - Since you cannot see the real-time order book, infer "Execution Strength" from volume analysis:
     - Is volume increasing on up-ticks?
     - Are there large block trades or rapid price advancements without pullbacks?
     - *Proxy Rule:* If the stock is near highs with rising volume, assume Execution Strength > 100% (Buying Dominance).

**Output:**
Present your findings as a detailed text report (CONTEXT) in Korean. Explicitly mention which pattern (3rd Breakout, Morning Gap) the stock exhibits.
`;

    const gatheringResponse = await generateContentWithRetry({
        model: "gemini-2.0-flash-001",
        contents: gatheringPrompt,
        config: {
            tools: [{ googleSearch: {} }],
        }
    });
    const gatheredDataContext = gatheringResponse.text;

    const structuringPrompt = `
${DATA_GROUNDING_PROTOCOL}
Based ONLY on the provided context, generate a structured JSON array of "DayTraderSignal" objects.

**Instructions for each signal:**
- For each stock identified in the context, create a complete JSON object with rationale, breakout price, stop loss, target, and AI confidence.
- If no stocks were identified, return an empty array.

${ANTI_HALLUCINATION_RULE}
**CRITICAL:** All text must be in Korean. Respond ONLY with a valid JSON array matching the schema.
`;

    const response = await generateContentWithRetry({
        model: "gemini-2.0-flash-001",
        contents: structuringPrompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: { type: Type.ARRAY, items: dayTraderSignalSchema }
        }
    });

    return JSON.parse(sanitizeJsonString(response.text || '[]'));
}

export async function generatePlaybooksForWatchlist(
    candidates: { ticker: string; stockName: string; rationale: string }[],
    marketTarget: MarketTarget
): Promise<StrategyPlaybook[]> {
    if (!ai) throw new Error(AI_DISABLED_ERROR_MESSAGE);
    if (candidates.length === 0) return [];

    const playbookSchema = {
        type: Type.OBJECT,
        properties: {
            id: { type: Type.STRING },
            stockName: { type: Type.STRING },
            ticker: { type: Type.STRING },
            strategyName: { type: Type.STRING, enum: ['VCP (Î≥Ä?ôÏÑ± Ï∂ïÏÜå ?®ÌÑ¥)', 'Cup and Handle (ƒ≈æÿ«⁄µÈ)', '«√∑ß ∫£¿ÃΩ∫(Flat Base)', 'ªÛΩ¬ ªÔ∞¢«¸(Ascending Triangle)', 'AI Îß§ÏßëÎ¥??¨Ï∞© (Í∏∞Í?/?∏Íµ≠???çÎÅå??', 'AI ?ÅÌïúÍ∞Ä ?¨Ï∞© ?îÏßÑ (?úÏû• Ï£ºÎèÑÏ£?', 'DB Signal', 'Hybrid Signal', '±‚≈∏'] },
            strategySummary: { type: Type.STRING },
            aiConfidence: { type: Type.NUMBER },
            keyLevels: { type: Type.OBJECT, properties: { entry: { type: Type.STRING }, stopLoss: { type: Type.STRING }, target: { type: Type.STRING } }, required: ['entry', 'stopLoss', 'target'] },
            strategyType: { type: Type.STRING, enum: ['DayTrade', 'SwingTrade', 'LongTerm'] },
        },
        required: ['id', 'stockName', 'ticker', 'strategyName', 'strategySummary', 'aiConfidence', 'keyLevels', 'strategyType']
    };

    // Get current time in target market's timezone
    const now = new Date();
    const marketTime = new Intl.DateTimeFormat('en-US', {
        timeZone: marketTarget === 'KR' ? 'Asia/Seoul' : 'America/New_York',
        hour: 'numeric',
        minute: 'numeric',
        hour12: false
    }).format(now);

    const prompt = `
You are the JIKTOO Alpha Engine. Your task is to perform a high-priority scan on a list of user-specified stocks and generate trading playbooks.

**CONTEXT:**
- **Market:** ${marketInfo[marketTarget].name}
- **Current Market Time:** ${marketTime}
- **Stocks for Forced Rescan:** ${JSON.stringify(candidates)}

**YOUR TASK:**
1.  **Analyze each stock:** Use your internal knowledge and the reference document below to determine the most applicable swing trading strategy for each stock *right now*.
2.  **TIME SENSITIVITY RULE (CRITICAL):**
    - **Closing Bell (¡æ∞° πË∆√):** ONLY suggest this if the Current Market Time is within 1 hour of market close (KR: 14:30-15:30, US: 15:00-16:00). If it is earlier, suggest 'SwingTrade' or 'DayTrade' instead.
3.  **Generate Playbooks:** For each stock, create a detailed \`StrategyPlaybook\` JSON object. Define a clear strategy, confidence score, and precise key levels for entry, stop-loss, and target.
4.  **Prioritize Actionability:** The user has requested this scan manually, so focus on providing clear, actionable plans.

**REFERENCE: SWING TRADING STRATEGIES DOCUMENT**
---
${SWING_STRATEGIES_DOCUMENT}
---

**CRITICAL RULES:**
- All text MUST be in **KOREAN («—±πæÓ**.
${ANTI_HALLUCINATION_RULE}

Respond ONLY with a valid JSON array of objects matching the provided schema.`;

    const response = await generateContentWithRetry({
        model: "gemini-2.0-flash-001", // Flash is sufficient
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: { type: Type.ARRAY, items: playbookSchema }
        }
    });

    const result = JSON.parse(sanitizeJsonString(response.text || '[]'));

    // Helper function to determine source from rationale
    const getSourceFromRationale = (ticker: string, rationale: string): string[] => {
        const candidate = candidates.find(c => c.ticker === ticker);
        if (!candidate) return ['user'];

        const r = candidate.rationale;
        if (r.includes('¡æ∞°πË∆√')) return ['bfl'];
        if (r.includes('¿Á∑· ∑π¿Ã¥ı')) return ['material'];
        if (r.includes('∆–≈œ Ω∫≈©∏Æ≥ ')) return ['pattern'];
        if (r.includes('ºˆ±ﬁ µ∂ºˆ∏Æ')) return ['supply_eagle'];
        if (r.includes('Eagle Eye') || r.includes('Volume Spike')) return ['scanner'];
        if (r === 'ªÁøÎ¿⁄ ∞¸Ω…¡æ∏Ò') return ['user'];

        // Default: if we can't determine, mark as scanner (since it came from forceGlobalScan)
        return ['scanner'];
    };

    return result.map((p: any) => ({
        ...p,
        analysisChecklist: [],
        isUserRecommended: p.sources?.includes('user') || false,
        addedAt: new Date().toISOString(),
        source: 'gemini' as 'gemini',
        sources: getSourceFromRationale(p.ticker, p.strategySummary),
    }));
}










/**
 * Helper: Fetch the latest Alpha Engine preview data from DB
 */
async function fetchAlphaPreviewLatest(ticker: string): Promise<any | null> {
    if (!supabase) return null;

    try {
        const { data, error } = await supabase
            .from('alpha_engine_playbooks')
            .select('*')
            .eq('ticker', ticker)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (error) {
            // It's normal to have no data for new tickers
            if (error.code !== 'PGRST116') {
                console.warn(`[AlphaEngine] DB fetch error for ${ticker}:`, error.message);
            }
            return null;
        }

        if (!data) return null;

        // Parse trading_plan if it's a string, otherwise use as is
        let plan: any = {};
        if (typeof data.trading_plan === 'string') {
            try {
                plan = JSON.parse(data.trading_plan);
            } catch (e) {
                plan = {};
            }
        } else {
            plan = data.trading_plan || {};
        }

        return {
            ticker: data.ticker,
            stockName: data.stock_name,
            market: data.market,
            rationale: plan.planRationale || data.signal_type || '∫–ºÆ µ•¿Ã≈Õ',
            aiScore: data.ai_confidence,
            pivotPoint: plan.entryPrice || 'N/A',
            updated_at: data.created_at,
            referencePrice: plan.entryPrice // Approximate reference
        };

    } catch (err) {
        console.error(`[AlphaEngine] Unexpected error fetching DB data for ${ticker}:`, err);
        return null;
    }
}
