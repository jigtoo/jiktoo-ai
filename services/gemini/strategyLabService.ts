// services/gemini/strategyLabService.ts

import { SchemaType } from "@google/generative-ai";

import type { MarketTarget, UserDefinedStrategyRules, BacktestResult } from '../../types';

import { ai, AI_DISABLED_ERROR_MESSAGE, generateContentWithRetry } from './client';

import { sanitizeJsonString } from '../utils/jsonUtils';

import { marketInfo } from '../marketInfo';



const rulesSchema = {

    type: SchemaType.OBJECT,

    properties: {

        entryConditions: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },

        exitConditions: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },

        stopLoss: { type: SchemaType.STRING, nullable: true },

        takeProfit: { type: SchemaType.STRING, nullable: true },

    },

    required: ['entryConditions', 'exitConditions', 'stopLoss', 'takeProfit'],

};



const backtestResultSchema = {

    type: SchemaType.OBJECT,

    properties: {

        period: { type: SchemaType.STRING },

        totalTrades: { type: SchemaType.NUMBER },

        winRate: { type: SchemaType.NUMBER },

        profitFactor: { type: SchemaType.NUMBER },

        avgProfit: { type: SchemaType.NUMBER },

        avgLoss: { type: SchemaType.NUMBER },

        maxDrawdown: { type: SchemaType.NUMBER },

        cagr: { type: SchemaType.NUMBER },

        aiAnalysis: { type: SchemaType.STRING },

        aiOptimization: { type: SchemaType.STRING },

    },

    required: ['period', 'totalTrades', 'winRate', 'profitFactor', 'avgProfit', 'avgLoss', 'maxDrawdown', 'cagr', 'aiAnalysis', 'aiOptimization']

};





export async function parseStrategyWithAI(strategyText: string, marketTarget: MarketTarget): Promise<UserDefinedStrategyRules> {

    if (!ai) throw new Error(AI_DISABLED_ERROR_MESSAGE);



    const prompt = `

You are an expert trading system developer. Your task is to parse a user's trading strategy, described in natural Korean, into a structured JSON object.



**CONTEXT:**

- **User's Strategy:** "${strategyText}"

- **Target Market:** ${marketInfo[marketTarget].name}



**Instructions:**

- Analyze the user's text and extract the specific conditions for market entry, exit, stop-loss, and take-profit.

- If a condition is not explicitly mentioned, you MUST set the corresponding field to an empty array or \`null\`.

- All text in the JSON output must be in Korean.



**Output Requirement:**

Respond ONLY with a single, valid JSON object that strictly follows the provided schema.

`;



    const response = await generateContentWithRetry({

        model: "gemini-2.0-flash-001",

        contents: prompt,

        config: {

            responseMimeType: "application/json",

            responseSchema: rulesSchema,

        }

    });



    return JSON.parse(sanitizeJsonString((response.text || '{}')));

}



export async function runRealBacktestOnData(

    rules: UserDefinedStrategyRules,

    priceData: any[], // OHLCV data from Polygon.io

    period: { from: string, to: string }

): Promise<BacktestResult> {

    if (!ai) throw new Error(AI_DISABLED_ERROR_MESSAGE);



    // Simplify data for the prompt to save tokens

    const simplifiedData = priceData.map(d => ({

        t: new Date(d.t).toISOString().split('T')[0], // date

        o: d.o, // open

        h: d.h, // high

        l: d.l, // low

        c: d.c, // close

        v: d.v  // volume

    }));



    const prompt = `

You are a powerful Backtesting Engine AI. Your task is to execute a trading strategy against a provided set of historical price data and then analyze the results.



**CONTEXT:**

---

**1. Trading Strategy Rules:**

\`\`\`json

${JSON.stringify(rules, null, 2)}

\`\`\`



**2. Historical Daily Price Data (OHLCV):**

(The data contains ${simplifiedData.length} bars from ${period.from} to ${period.to})

\`\`\`json

${JSON.stringify(simplifiedData.slice(0, 5))}

...

${JSON.stringify(simplifiedData.slice(-5))}

\`\`\`

---



**EXECUTION INSTRUCTIONS (Internal Monologue - Do not show to user):**

1.  Initialize state: cash, equity curve, trades list, etc.

2.  Iterate through each bar of the historical data day by day.

3.  On each day, check if you are in a trade.

4.  If NOT in a trade: Check if the 'entryConditions' from the rules are met based on the current and recent bars. If so, execute a buy and record it.

5.  If IN a trade: Check if 'exitConditions' or 'stopLoss' conditions are met. If so, execute a sell, record the trade's P/L, and update state.

6.  After iterating through all data, calculate the final performance metrics (Total Trades, Win Rate, Profit Factor, etc.).

7.  Analyze the results and provide an 'aiAnalysis' and 'aiOptimization' suggestion.



**OUTPUT REQUIREMENT:**

- You MUST perform the backtest described above internally.

- Based on your internal execution, you must generate a final JSON object containing the calculated metrics and your analysis.

- The 'period' field in the output MUST be "${period.from} ~ ${period.to} (KRWKRW.

- All text in 'aiAnalysis' and 'aiOptimization' MUST be in Korean.

- Respond ONLY with a single, valid JSON object that strictly follows the provided schema.

`;



    const response = await generateContentWithRetry({

        model: "gemini-2.0-flash-001", // Flash is sufficient for strategy analysis

        contents: prompt,

        config: {

            responseMimeType: "application/json",

            responseSchema: backtestResultSchema,

        }

    });



    return JSON.parse(sanitizeJsonString((response.text || '{}')));

}





export async function runBacktestSimulation(rules: UserDefinedStrategyRules, marketTarget: MarketTarget): Promise<BacktestResult> {

    if (!ai) throw new Error(AI_DISABLED_ERROR_MESSAGE);



    const prompt = `

You are an AI trading strategy analyst. You need to perform a "thought experiment" or high-level simulation on a user's strategy. Instead of using real data, you will use your generalized knowledge of market behavior for the ${marketInfo[marketTarget].name} from 2022-2024 to estimate the performance.



**CONTEXT:**

- **User's Strategy Rules:** ${JSON.stringify(rules)}



**Instructions:**

1.  **aiAnalysis:** Based on your knowledge, write a concise analysis of the strategy's likely performance. What are its theoretical strengths and weaknesses

2.  **aiOptimization:** Suggest 1-2 concrete ways to improve the strategy.

3.  **Estimate Metrics:** Based on your analysis, provide realistic estimations for all numerical fields in the schema (totalTrades, winRate, etc.).

- All text must be in Korean.



**Output Requirement:**

- The 'period' field MUST be "2022-01-01 ~ 2024-12-31 (AI ÃªÂ°?¬KRW.

- Respond ONLY with a single, valid JSON object that strictly follows the provided schema.

`;



    const response = await generateContentWithRetry({

        model: "gemini-2.0-flash-001",

        contents: prompt,

        config: {

            responseMimeType: "application/json",

            responseSchema: backtestResultSchema,

        }

    });



    return JSON.parse(sanitizeJsonString((response.text || '{}')));
}

// --- Strategy Lab 2.0: Logic Parser ---

export async function parseStrategyToLogicV2(strategyText: string): Promise<any> {
    if (!ai) throw new Error(AI_DISABLED_ERROR_MESSAGE);

    const prompt = `
    Role: You are an expert Quant Strategy Architect.
    Task: Convert the user's natural language trading strategy into a precise JSON Logic Tree.
    
    Target Logic Schema (TypeScript):
    type LogicOperator = 'AND' | 'OR';
    type ComparisonOperator = '>' | '>=' | '<' | '<=' | '=' | 'CROSS_UP' | 'CROSS_DOWN';
    
    interface StrategyCondition {
        id: string; // unique short id
        type: 'INDICATOR' | 'PATTERN' | 'PRICE';
        indicator: string; // Standard names: 'RSI', 'SMA', 'EMA', 'Close', 'Volume', 'MACD', 'BollingerUpper'
        params: {name: string, value: string | number}[]; // e.g. [{name: 'period', value: 14}]
        operator: ComparisonOperator;
        comparisonValue: string | number;
        comparisonType: 'NUMBER' | 'INDICATOR';
    }
    
    interface LogicGroup {
        id: string; // unique short id
        type: 'GROUP';
        operator: LogicOperator;
        children: (StrategyCondition | LogicGroup)[]; // Nesting allowed
    }

    User Strategy: "${strategyText}"

    Instructions:
    1. Root must be a LogicGroup (usually with 'AND').
    2. Normalize indicators (e.g., '20일 이평선' -> indicator: 'SMA', params: [{name: 'period', value: 20}]).
    3. If comparing to a number (e.g. RSI < 30), comparisonType is 'NUMBER'.
    4. If comparing to another indicator (e.g. Price > SMA 20), LHS is 'Close', operator is '>', RHS is 'SMA' (with params), but for V1 Schema put the RHS details in 'comparisonValue' as a simplified string if complex, or handle logic cleanly.
    *CRITICAL Constraints*:
    - Return ONLY the JSON object. Do NOT wrap in markdown code blocks.
    - Do NOT include any conversational text like "Okay", "Here is", or "Note".
    - Starting character MUST be '{'. Ending character MUST be '}'.
    `;

    const response = await generateContentWithRetry({
        model: "gemini-2.0-flash-001",
        contents: prompt,
        config: {
            responseMimeType: "application/json"
        }
    });

    const text = response.text || "{}";
    return JSON.parse(sanitizeJsonString(text));
}


