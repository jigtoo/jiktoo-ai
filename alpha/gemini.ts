// copy-of-sepa-ai/alpha/gemini.ts
import { generateContentWithRetry } from '../services/gemini/client';
import { Type } from "@google/genai";
import { sanitizeJsonString } from '../services/utils/jsonUtils';

type DbSummary = {
  ticker: string;
  market: string;
  rationale?: string;
  referencePrice?: string;
};

export async function callGeminiCompact(input: { summary: DbSummary, marketHealthNotes?: string }) {
  const prompt = [
    'ROLE: Equity swing strategist. Output JSON.',
    `TICKER: ${input.summary.ticker}`,
    `MARKET: ${input.summary.market}`,
    `REF_PRICE: ${input.summary.referencePrice ?? '-'}`,
    `DB_RATIONALE: ${input.summary.rationale ?? '-'}`,
    `MARKET_HEALTH: ${input.marketHealthNotes ?? '-'}`,
    'RETURN FIELDS: {play, pivot, rationale, risk, confidence(0-100)}',
    'LIMITS: rationale<120 chars, risk<80 chars.'
  ].join('\n');

  const schema = {
    type: Type.OBJECT,
    properties: {
      play: { type: Type.STRING, enum: ['swing', 'scalp', 'position'] },
      pivot: { type: Type.STRING },
      rationale: { type: Type.STRING },
      risk: { type: Type.STRING },
      confidence: { type: Type.NUMBER }
    },
    required: ['play', 'pivot', 'rationale', 'risk', 'confidence']
  };

  const { selectModelByTask } = await import('../services/gemini/modelSelector');
  const modelName = selectModelByTask('playbook_generation');

  const response = await generateContentWithRetry({
    model: modelName,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: schema
    }
  });

  const res = JSON.parse(sanitizeJsonString(response.text));
  return res;
}