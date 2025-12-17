// services/gemini/evolutionService.ts

import { SchemaType } from "@google/generative-ai";

import type { AIGrowthJournalEntry, AIPrediction, TopConvictionPickData } from '../../types';

import { ai, AI_DISABLED_ERROR_MESSAGE, generateContentWithRetry } from './client';

import { sanitizeJsonString } from '../utils/jsonUtils';

import { DATA_GROUNDING_PROTOCOL } from './prompts/protocols';



export async function generateGrowthJournalEntry(

    prediction: AIPrediction,

    outcome: { finalPrice: number, success: boolean, reason: string }

): Promise<Omit<AIGrowthJournalEntry, 'id' | 'timestamp'>> {

    if (!ai) {

        throw new Error(AI_DISABLED_ERROR_MESSAGE);

    }



    const journalEntrySchema = {

        type: SchemaType.OBJECT,

        properties: {

            caseTitle: { type: SchemaType.STRING },

            caseType: { type: SchemaType.STRING, enum: ['False Positive', 'False Negative', 'Success Case'] },

            summary: { type: SchemaType.STRING },

            rootCauseAnalysis: { type: SchemaType.STRING },

            modelImprovements: { type: SchemaType.STRING },

            futureMonitoringPlan: { type: SchemaType.STRING },

        },

        required: ['caseTitle', 'caseType', 'summary', 'rootCauseAnalysis', 'modelImprovements', 'futureMonitoringPlan']

    };



    const caseType = outcome.success ? 'Success Case' : 'False Positive';

    // FIX: Cast prediction_data to unknown then to the specific type for safe access.

    const stockName = (prediction.prediction_data as unknown as TopConvictionPickData).stockName || 'Unknown Stock';



    const prompt = `

You are an AI model that learns from its past predictions. Your task is to conduct a post-mortem analysis of a previous stock prediction you made.



**CONTEXT (Original Prediction & Final Outcome):**

---

1.  **Original Prediction:** ${JSON.stringify(prediction)}

2.  **Outcome:** The prediction was a **${outcome.success ? 'SUCCESS' : 'FAILURE'}**.

3.  **Outcome Details:** ${outcome.reason}

---



**Your Task: Perform a thorough and honest self-reflection.**

1.  **caseTitle:** Create a title for this case study. (e.g., "Case #${String(Math.floor(Math.random() * 900) + 100).padStart(3, '0')}: ${stockName} (${caseType})")

2.  **caseType:** Classify the outcome. Given the context, it must be either 'Success Case' or 'False Positive'.

3.  **summary:** Briefly summarize what happened.

4.  **rootCauseAnalysis:** Analyze WHY the prediction was right or wrong. What specific data points did you weigh correctly or incorrectly Was there a bias Was the market context misunderstood Be critical.

5.  **modelImprovements:** Based on the root cause, what specific, actionable improvements can be made to your prediction model (e.g., "Increase weight for X indicator," "Add a check for Y news event").

6.  **futureMonitoringPlan:** How will you verify that the improvements are working



**CRITICAL RULES:**

- All text MUST be in Korean.

- Respond ONLY with a single, valid JSON object that strictly follows the provided schema.

`;



    const response = await generateContentWithRetry({

        model: "gemini-2.0-flash-001",

        contents: prompt,

        config: {

            responseMimeType: "application/json",

            responseSchema: journalEntrySchema,

        }

    });



    return JSON.parse(sanitizeJsonString(response.text || '{}'));

}



export async function generateTuningProposal(

    journalEntries: AIGrowthJournalEntry[]

): Promise<{ rationale: string; sql: string; }> {

    if (!ai) {

        throw new Error(AI_DISABLED_ERROR_MESSAGE);

    }



    const proposalSchema = {

        type: SchemaType.OBJECT,

        properties: {

            rationale: { type: SchemaType.STRING },

            sql: { type: SchemaType.STRING },

        },

        required: ['rationale', 'sql']

    };



    const prompt = `

You are an AI Adaptation Engine. Your task is to analyze a log of your own past successes and failures and propose a single, concrete improvement to your own operating rules.



**CONTEXT: Recent Performance Log (Growth Journal)**

---

${JSON.stringify(journalEntries, null, 2)}

---



**REFERENCE: Your Operating Rules Table Schema (\`system_signal_rules\`)**

- \`id\` (uuid): Unique identifier

- \`event_type\` (text): The type of event that triggers the rule (e.g., 'vcp.breakout', 'market.downturn')

- \`severity\` (text): The severity of the signal (e.g., 'high', 'medium', 'low')

- \`dedupe_window_sec\` (integer): Time in seconds to prevent duplicate signals of the same SchemaType.

- \`is_active\` (boolean): Whether the rule is active.



**YOUR TASK:**

1.  **Analyze:** Critically review the performance log. Did you miss opportunities (False Negatives) Did you generate bad signals (False Positives)

2.  **Hypothesize:** Formulate a hypothesis for improvement. For example, "I am generating too many noisy 'vcp.breakout' signals in volatile markets. Increasing the deduplication window might help filter out noise."

3.  **Propose Change:** Based on your hypothesis, generate a single, specific SQL \`UPDATE\` statement to modify ONE rule in the \`system_signal_rules\` table. For example, \`UPDATE public.system_signal_rules SET dedupe_window_sec = 600 WHERE event_type = 'vcp.breakout' AND severity = 'medium';\`.

4.  **Provide Rationale:** Clearly explain your reasoning for this change in Korean.



**OUTPUT REQUIREMENT:**

- You MUST return a single, valid JSON object matching the provided schema.

- The \`sql\` field must be a valid SQL statement.

- The \`rationale\` must be in Korean.

`;



    const response = await generateContentWithRetry({

        model: "gemini-2.0-flash-001", // Flash is sufficient for evolution analysis

        contents: prompt,

        config: {

            responseMimeType: "application/json",

            responseSchema: proposalSchema,

        }

    });



    return JSON.parse(sanitizeJsonString(response.text || '{}'));

}

