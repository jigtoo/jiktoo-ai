// services/discovery/ScannerTools.ts
/**
 * [Discovery Engine] Scanner Tools
 * Implementation of specialized scans:
 * 1. Value-Pivot Scan (Super-Value + Pivot)
 * 2. Power Play Scan (Strong Momentum)
 * 3. Turnaround Scan (Trend Reversal)
 * 4. Eagle Eye Scan (New Breakouts)
 * 5. Volume Spike Scan (Unusual Volume)
 */

import { fetchCandles } from '../dataService';
import { ai, generateContentWithRetry } from '../gemini/client';
import { supabase } from '../supabaseClient';
import type { MarketTarget, ScannerResult } from '../../types';
import { sanitizeJsonString } from '../utils/jsonUtils';
import { SchemaType } from '@google/generative-ai';

// Shared Schema for all scans
const SCANNER_RESULT_SCHEMA = {
    type: SchemaType.ARRAY,
    items: {
        type: SchemaType.OBJECT,
        properties: {
            ticker: { type: SchemaType.STRING },
            stockName: { type: SchemaType.STRING },
            currentPrice: { type: SchemaType.NUMBER },
            pivotPrice: { type: SchemaType.NUMBER },
            breakoutLevel: { type: SchemaType.NUMBER },
            resistanceLevel: { type: SchemaType.NUMBER },
            upsidePotential: { type: SchemaType.NUMBER },
            volumeSpike: { type: SchemaType.BOOLEAN },
            turnaroundSignal: { type: SchemaType.STRING },
            rationale: { type: SchemaType.STRING }
        },
        required: ['ticker', 'stockName', 'currentPrice', 'rationale']
    }
};

/**
 * Super-Value + Pivot Scanner
 * Finds undervalued stocks near pivot points
 */
export async function runValuePivotScan(marketTarget: MarketTarget): Promise<ScannerResult[]> {
    const marketInfo = {
        name: marketTarget === 'KR' ? 'South Korea (KOSPI/KOSDAQ)' : 'US Market (NYSE/NASDAQ)'
    };

    const prompt = `
    Find 5 stocks in ${marketInfo.name} that match the "Super-Value + Pivot" criteria:
    1. Low PER (< 10) & PBR (< 1.0)
    2. Price is consolidating near a Pivot Point (Support Level)
    3. Recent Volume dry-up (decreasing volume)
    
    Response MUST be a JSON array of objects with fields:
    - ticker
    - stockName (Korean)
    - currentPrice (number)
    - pivotPrice (number)
    - upsidePotential (number, %)
    - rationale (Korean explanation of why it fits)
    
    Tools: Use Google Search to find real-time data.
    
    CRITICAL: Respond ONLY with a valid JSON array wrapped in markdown code blocks:
    \`\`\`json
    [...]
    \`\`\`
    `;

    return await executeScan(prompt);
}

/**
 * Power Play Scan
 * Finds explosive momentum stocks
 */
export async function runPowerPlayScan(marketTarget: MarketTarget): Promise<ScannerResult[]> {
    const marketInfo = {
        name: marketTarget === 'KR' ? 'South Korea (KOSPI/KOSDAQ)' : 'US Market (NYSE/NASDAQ)'
    };

    const prompt = `
    Find 5 "Power Play" stocks in ${marketInfo.name}:
    1. Stock price up > 50% in last 4 weeks
    2. Consolidating tightly for < 10 days (Flag pattern)
    3. Holding above 20-day Moving Average
    
    Response MUST be a JSON array of objects with fields:
    - ticker
    - stockName (Korean)
    - currentPrice (number)
    - breakoutLevel (number)
    - volumeSpike (boolean)
    - rationale (Korean)
    
    Tools: Use Google Search to find real-time data.
    
    CRITICAL: Respond ONLY with a valid JSON array wrapped in markdown code blocks:
    \`\`\`json
    [...]
    \`\`\`
    `;

    return await executeScan(prompt);
}

/**
 * Turnaround Scan
 * Finds trend reversal candidates
 */
export async function runTurnaroundScan(marketTarget: MarketTarget): Promise<ScannerResult[]> {
    const marketInfo = {
        name: marketTarget === 'KR' ? 'South Korea (KOSPI/KOSDAQ)' : 'US Market (NYSE/NASDAQ)'
    };

    const prompt = `
    Find 5 "Turnaround" stocks in ${marketInfo.name}:
    1. Down > 30% from 52-week high
    2. Showing "Bottoming" signs (Double Bottom, Inv H&S)
    3. Heavy volume on recent up-days (accumulation)
    
    Response MUST be a JSON array of objects with fields:
    - ticker
    - stockName (Korean)
    - currentPrice (number)
    - resistanceLevel (number)
    - turnaroundSignal (string)
    - rationale (Korean)
    
    Tools: Use Google Search to find real-time data.
    
    CRITICAL: Respond ONLY with a valid JSON array wrapped in markdown code blocks:
    \`\`\`json
    [...]
    \`\`\`
    `;

    return await executeScan(prompt);
}

/**
 * Eagle Eye Scanner
 * Finds new technical breakouts occurring right now.
 */
export async function runEagleEyeScanner(marketTarget: MarketTarget): Promise<ScannerResult[]> {
    const marketInfo = {
        name: marketTarget === 'KR' ? 'South Korea (KOSPI/KOSDAQ)' : 'US Market (NYSE/NASDAQ)'
    };

    const prompt = `
    Act as an "Eagle Eye" Technical Scanner. Find 3-5 stocks in ${marketInfo.name} that are breaking out TODAY.
    Criteria:
    1. Crossing above a major resistance level (52-week high or multi-month base).
    2. Volume is significantly higher than average (> 150%).
    3. Price action is strong (closing near highs).

    Response MUST be a JSON array of objects with fields:
    - ticker
    - stockName (Korean)
    - currentPrice (number)
    - breakoutLevel (number)
    - rationale (Korean explanation of the breakout pattern)
    
    Tools: Use Google Search to find real-time data.
    
    CRITICAL: Respond ONLY with a valid JSON array wrapped in markdown code blocks:
    \`\`\`json
    [...]
    \`\`\`
    `;

    return await executeScan(prompt, 'Eagle-Eye');
}

/**
 * Volume Spike Scanner
 * Finds unusual volume activity without necessarily a huge price move yet (Accumulation).
 */
export async function runVolumeSpikeScanner(marketTarget: MarketTarget): Promise<ScannerResult[]> {
    const marketInfo = {
        name: marketTarget === 'KR' ? 'South Korea (KOSPI/KOSDAQ)' : 'US Market (NYSE/NASDAQ)'
    };

    const prompt = `
    Find 3-5 "Hidden Accumulation" stocks in ${marketInfo.name} showing unusual volume spikes TODAY.
    Criteria:
    1. Volume > 300% of 20-day average.
    2. Price change is relatively small (< 3%) or consolidating.
    3. Suggests institutional accumulation before a move.

    Response MUST be a JSON array of objects with fields:
    - ticker
    - stockName (Korean)
    - currentPrice (number)
    - volumeSpike (true)
    - rationale (Korean explanation of volume characteristics)
    
    Tools: Use Google Search to find real-time data.
    
    CRITICAL: Respond ONLY with a valid JSON array wrapped in markdown code blocks:
    \`\`\`json
    [...]
    \`\`\`
    `;

    return await executeScan(prompt, 'Volume-Spike');
}

async function executeScan(prompt: string, defaultMatchType: string = 'Scan-Result'): Promise<ScannerResult[]> {
    try {
        const response = await generateContentWithRetry({
            model: 'gemini-2.0-flash-001',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: SCANNER_RESULT_SCHEMA,
                tools: [{ googleSearch: {} }]
            }
        });

        // Parse and standardize result
        let text = response.text || '[]';

        // Robust JSON extraction
        const jsonStart = text.indexOf('[');
        const jsonEnd = text.lastIndexOf(']');

        if (jsonStart !== -1 && jsonEnd !== -1) {
            text = text.substring(jsonStart, jsonEnd + 1);
        } else {
            // Fallback cleanup if markers not found but might be wrapped in code blocks
            text = text.replace(/```json\n?|\n?```/g, '').trim();
        }

        let raw: any[];
        try {
            raw = JSON.parse(text);
        } catch (e) {
            console.warn(`[ScannerTools] JSON Parse Failed. Attempting sanitization... Raw Text: ${text.slice(0, 100)}...`);
            const sanitized = sanitizeJsonString(text);
            raw = JSON.parse(sanitized);
        }

        if (!Array.isArray(raw)) {
            // Handle case where AI returns single object instead of array
            if (typeof raw === 'object' && raw !== null) {
                if ((raw as any).results && Array.isArray((raw as any).results)) {
                    raw = (raw as any).results;
                } else {
                    raw = [raw];
                }
            } else {
                throw new Error('AI response is not an array');
            }
        }

        return raw.map(item => ({
            ticker: item.ticker || 'N/A',
            stockName: item.stockName || 'Unknown',
            matchType: defaultMatchType,
            price: item.currentPrice || 0,
            changeRate: 0,
            volumeStrength: item.volumeSpike ? 100 : 50,
            reason: item.rationale || item.reason || 'No rationale provided',
            technicalSignal: item.rationale || item.reason
        })).filter(item => {
            const invalid = ['ABC', 'XYZ', 'LMN', 'GHI', 'DEF', 'JKL', 'N/A', 'UNKNOWN', 'TEST', 'SAMPLE'];
            return item.ticker && item.ticker.length > 1 && !invalid.includes(item.ticker.toUpperCase());
        });

    } catch (error) {
        console.error(`[ScannerTools] Scan failed for prompt type ${defaultMatchType}:`, error);
        return [];
    }
}

// Name-space export for compatibility
export const scannerTools = {
    runValuePivotScan,
    runPowerPlayScan,
    runTurnaroundScan,
    runEagleEyeScanner,
    runVolumeSpikeScanner
};
