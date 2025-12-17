import { SchemaType } from "@google/generative-ai";

import type { MarketTarget } from '../../types';

import { ai, AI_DISABLED_ERROR_MESSAGE, generateContentWithRetry } from './client';

import { sanitizeJsonString } from '../utils/jsonUtils';

import type { Megatrend } from './megatrendService';

import type { InvestmentTheme } from './themeMapperService';

import type { ThemeStock } from './stockDiscoveryService';



export interface LongTermPortfolio {

    id: string;

    name: string; // "AI KRW KRW�?
    description: string;

    timeHorizon: string; // "5-10

    riskProfile: 'conservative' | 'moderate' | 'aggressive';

    allocations: {

        theme: string;

        themeId: string;

        weight: number; // %

        rationale: string;

        stocks: {

            ticker: string;

            stockName: string;

            weight: number; // % within theme

            entryStrategy: string; // "분할 매수", "급락 매수"

            targetPrice: string; // "KRW +20%"

        }[];

    }[];

    rebalancingSchedule: string; // "분기

    monitoringMetrics: string[]; // ["IEA KRWKRW?, "변?주문 ?]

    expectedReturn: string; // "KRW5-20%"

    maxDrawdown: string; // "?-30%"

    catalysts: string[]; // ?리과??촉매

    risks: string[]; // 주요 리스KRW

}



const portfolioAllocationSchema = {

    type: SchemaType.OBJECT,

    properties: {

        theme: { type: SchemaType.STRING },

        themeId: { type: SchemaType.STRING },

        weight: { type: SchemaType.NUMBER },

        rationale: { type: SchemaType.STRING },

        stocks: {

            type: SchemaType.ARRAY,

            items: {

                type: SchemaType.OBJECT,

                properties: {

                    ticker: { type: SchemaType.STRING },

                    stockName: { type: SchemaType.STRING },

                    weight: { type: SchemaType.NUMBER },

                    entryStrategy: { type: SchemaType.STRING },

                    targetPrice: { type: SchemaType.STRING }

                },

                required: ['ticker', 'stockName', 'weight', 'entryStrategy', 'targetPrice']

            }

        }

    },

    required: ['theme', 'themeId', 'weight', 'rationale', 'stocks']

};



const longTermPortfolioSchema = {

    type: SchemaType.OBJECT,

    properties: {

        id: { type: SchemaType.STRING },

        name: { type: SchemaType.STRING },

        description: { type: SchemaType.STRING },

        timeHorizon: { type: SchemaType.STRING },

        riskProfile: { type: SchemaType.STRING, enum: ['conservative', 'moderate', 'aggressive'] },

        allocations: { type: SchemaType.ARRAY, items: portfolioAllocationSchema },

        rebalancingSchedule: { type: SchemaType.STRING },

        monitoringMetrics: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },

        expectedReturn: { type: SchemaType.STRING },

        maxDrawdown: { type: SchemaType.STRING },

        catalysts: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },

        risks: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }

    },

    required: ['id', 'name', 'description', 'timeHorizon', 'riskProfile', 'allocations', 'rebalancingSchedule', 'monitoringMetrics', 'expectedReturn', 'maxDrawdown', 'catalysts', 'risks']

};



export async function buildLongTermPortfolio(

    trend: Megatrend,

    themes: InvestmentTheme[],

    stocks: ThemeStock[],

    riskProfile: 'conservative' | 'moderate' | 'aggressive'

): Promise<LongTermPortfolio> {

    if (!ai) {

        throw new Error(AI_DISABLED_ERROR_MESSAGE);

    }



    // Group stocks by theme

    const stocksByTheme = themes.map(theme => ({

        theme,

        stocks: stocks.filter(s => s.theme === theme.name)

    }));



    const prompt = `

KRWKRWKRW리문KRW?



**메렌?*:

- ? ${trend.title}

- KRW ${trend.summary}

- ?지 ${trend.timeHorizon}

- ?${trend.confidence}%



**KRW?종목**:

${stocksByTheme.map(({ theme, stocks }) => `

? ${theme.name}

- ? ${theme.description}

- KRWKRW${theme.expectedGrowthRate}

- 관종목 (${stocks.length}:

${stocks.map(s => `  * ${s.stockName} (${s.ticker}): ${s.rationale.substring(0, 100)}...`).join('\n')}

`).join('\n')}



**리스?: ${riskProfile}

- conservative: KRW?중심, 분산 KRW

- moderate: 균형, 중주 KRW ?리KRW

- aggressive: 공격 중소KRW?  KRW추구



**?*: 메렌KRW기반KRWKRW�?구성KRW



**구항**:



1. **?�?*: KRW반영명확?

2. **마비?*: 마마KRW(?100%)

3. **종목 KRW*: KRW?-5종목 KRW

4. **종목비중**: ?종목 비중 (?100%)

5. **진입 KRW*: 종목매수 KRW

   - "분할 매수 (3개월걸쳐)"

   - "급락 매수 (KRW -10% KRW"

   - "즉시 매수"

6. **목표가**: 종목목표 KRW

7. **리밸KRW*: KRW?�?조할지

8. **모니?지*: 추적KRWKRW지

9. **KRWKRW: ???KRW

10. **KRW?*: KRWKRW?Max Drawdown)

11. **촉매 KRW*: ?리과??KRW

12. **리스*: 주요 리스KRW



**중요**:

- 리스로에 맞게 ?리구??
- 과도집중 KRW지(분산 KRW

- KRW가KRW구체KRWKRWKRW

- 모든 ????



JSON 객체???
`;



    const response = await generateContentWithRetry({
        model: "gemini-2.0-flash-001",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: longTermPortfolioSchema
        }
    });



    const portfolio = JSON.parse(sanitizeJsonString(response.text || '{}'));



    return {

        ...portfolio,

        id: portfolio.id || `portfolio_${trend.id}_${Date.now()}`,

        riskProfile

    };

}

