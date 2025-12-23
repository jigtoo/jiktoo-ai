// services/ScannerTools.ts
/**
 * 스캐너 도구 (Scanner Tools) - Data-Driven Edition (v2)
 *
 * [핵심 변경 사항]
 * 기존: AI가 인터넷 검색으로 종목을 발굴 (Hallucination 위험)
 * 변경: 실제 차트 데이터(Candles)를 주입받아 분석 (Data Injection)
 *
 * 이제 모든 스캐너 함수는 `candidates` (실제 가격 데이터가 포함된 후보군)를 인자로 받습니다.
 */

import { generateContentWithRetry } from './gemini/client';
import type { MarketTarget, ScannerResult } from '../types';
import { sanitizeJsonString } from './utils/jsonUtils';
import { SchemaType } from '@google/generative-ai';

// Interface for Data Injection
export interface ScannerCandidate {
    ticker: string;
    stockName: string;
    currentPrice: number;
    marketCap?: number; // Optional, can be roughly inferred or passed
    recentCandles: {
        date: string;
        close: number;
        volume: number;
    }[]; // Last 20 days summary provided to AI
    technicalSummary?: string; // Pre-calculated indicators (optional)
}

// Shared Schema for all scans
const SCANNER_RESULT_SCHEMA = {
    type: SchemaType.ARRAY,
    items: {
        type: SchemaType.OBJECT,
        properties: {
            ticker: { type: SchemaType.STRING },
            rationale: { type: SchemaType.STRING },
            technicalScore: { type: SchemaType.NUMBER },
            patternQuality: { type: SchemaType.STRING, enum: ['High', 'Medium', 'Low'] }
        },
        required: ['ticker', 'rationale', 'technicalScore']
    }
};

/**
 * 슈퍼-밸류 + 피벗 스캐너
 */
export async function runValuePivotScan(marketTarget: MarketTarget, candidates: ScannerCandidate[]): Promise<ScannerResult[]> {
    if (!candidates || candidates.length === 0) return [];

    const prompt = `
    Analyze these ${candidates.length} candidates for "Super-Value + Pivot" Setup.
    Market: ${marketTarget}

    **Candidates Data (Real Market Data):**
    ${JSON.stringify(candidates.map(c => ({
        ticker: c.ticker,
        name: c.stockName,
        price: c.currentPrice,
        history: c.recentCandles.slice(-5)
    })), null, 2)}

    **Instruction**:
    Analyze the candidates based on:
    1. **Price Action**: Consolidating near a Pivot Point or Support (20MA).
    2. **Valuation**: Look for value plays.
    3. **Strategy**: Identify low-risk entry points.

    **CRITICAL OUTPUT RULES**:
    - The "rationale" field MUST be written in **Natural Korean (자연스러운 한국어)**.
    - Ensure strict **UTF-8 encoding**. No mojibake.
    - Output MUST be a valid JSON array.
    `;

    return await scanCandidatesWithAI(prompt, candidates, 'Value-Pivot');
}

/**
 * 파워 플레이 스캔 (강력한 모멘텀)
 */
export async function runPowerPlayScan(marketTarget: MarketTarget, candidates: ScannerCandidate[]): Promise<ScannerResult[]> {
    if (!candidates || candidates.length === 0) return [];

    const prompt = `
    Analyze these ${candidates.length} candidates for "Power Play" (High Momentum).
    Market: ${marketTarget}

    **Candidates Data:**
    ${JSON.stringify(candidates.map(c => ({
        ticker: c.ticker,
        name: c.stockName,
        price: c.currentPrice,
        history: c.recentCandles.slice(-10)
    })), null, 2)}

    **Instruction**:
    Find stocks with:
    1. **Strong Momentum**: Recent price surge with volume.
    2. **Resilience**: Holding gains.

    **CRITICAL OUTPUT RULES**:
    - The "rationale" field MUST be written in **Natural Korean (자연스러운 한국어)**.
    - Ensure strict **UTF-8 encoding**. No mojibake.
    - Output MUST be a valid JSON array.
    `;

    return await scanCandidatesWithAI(prompt, candidates, 'Power-Play');
}

/**
 * 턴어라운드 스캔 (추세 전환)
 */
export async function runTurnaroundScan(marketTarget: MarketTarget, candidates: ScannerCandidate[]): Promise<ScannerResult[]> {
    if (!candidates || candidates.length === 0) return [];

    const prompt = `
    Analyze these ${candidates.length} candidates for "Turnaround" (Bottom Fishing).
    Market: ${marketTarget}

    **Candidates Data:**
    ${JSON.stringify(candidates.map(c => ({
        ticker: c.ticker,
        name: c.stockName,
        price: c.currentPrice,
        history: c.recentCandles.slice(-20)
    })), null, 2)}

    **Instruction**:
    Find stocks showing:
    1. **Bottoming**: Chart pattern (Double Bottom, V-Shape).
    2. **Volume**: Spikes at lows (Accumulation).

    **CRITICAL OUTPUT RULES**:
    - The "rationale" field MUST be written in **Natural Korean (자연스러운 한국어)**.
    - Ensure strict **UTF-8 encoding**. No mojibake.
    - Output MUST be a valid JSON array.
    `;

    return await scanCandidatesWithAI(prompt, candidates, 'Turnaround');
}

/**
 * 이글 아이 스캐너 (새로운 돌파)
 */
export async function runEagleEyeScanner(marketTarget: MarketTarget, candidates: ScannerCandidate[]): Promise<ScannerResult[]> {
    if (!candidates || candidates.length === 0) return [];

    const prompt = `
    Act as "Eagle Eye". Find breakouts happening NOW among these candidates.
    Market: ${marketTarget}

    **Candidates Data:**
    ${JSON.stringify(candidates.map(c => ({
        ticker: c.ticker,
        name: c.stockName,
        price: c.currentPrice,
        history: c.recentCandles.slice(-5)
    })), null, 2)}

    **Criteria:**
    1. **Breakout**: Price breaking above recent resistance/highs.
    2. **Volume**: Noticeable volume increase vs average.
    3. **Close**: Closing near highs.

    **CRITICAL OUTPUT RULES**:
    - The "rationale" field MUST be written in **Natural Korean (자연스러운 한국어)**.
    - Ensure strict **UTF-8 encoding**. No mojibake.
    - Output MUST be a valid JSON array.
    `;

    return await scanCandidatesWithAI(prompt, candidates, 'Eagle-Eye');
}

/**
 * 거래량 급증 스캐너 (Volume Spike)
 */
export async function runVolumeSpikeScanner(marketTarget: MarketTarget, candidates: ScannerCandidate[]): Promise<ScannerResult[]> {
    if (!candidates || candidates.length === 0) return [];

    const prompt = `
    Find "Hidden Accumulation" (Volume Spike) among these candidates.
    Market: ${marketTarget}

    **Candidates Data:**
    ${JSON.stringify(candidates.map(c => ({
        ticker: c.ticker,
        name: c.stockName,
        price: c.currentPrice,
        history: c.recentCandles.slice(-5)
    })), null, 2)}

    **Criteria:**
    1. **Volume Spike**: Significant volume increase without massive price drop.
    2. **Accumulation**: Price stability despite high volume.

    **CRITICAL OUTPUT RULES**:
    - The "rationale" field MUST be written in **Natural Korean (자연스러운 한국어)**.
    - Ensure strict **UTF-8 encoding**. No mojibake.
    - Output MUST be a valid JSON array.
    `;

    return await scanCandidatesWithAI(prompt, candidates, 'Volume-Spike');
}

/**
 * AI 통찰: 거래량 고갈 (Volume Dry-Up)
 */
export async function runVolumeDryUpScan(marketTarget: MarketTarget, candidates: ScannerCandidate[]): Promise<ScannerResult[]> {
    if (!candidates || candidates.length === 0) return [];

    const prompt = `
    Find "Volume Dry-Up" (Volatility Contraction) candidates.
    Market: ${marketTarget}

    **Candidates Data:**
    ${JSON.stringify(candidates.map(c => ({
        ticker: c.ticker,
        name: c.stockName,
        price: c.currentPrice,
        history: c.recentCandles.slice(-5)
    })), null, 2)}

    **Instruction**:
    Identify candidates with:
    1. **Dry Up**: Significant volume decrease.
    2. **Tight**: Price range narrowing (VCP).

    **CRITICAL OUTPUT RULES**:
    - The "rationale" field MUST be written in **Natural Korean (자연스러운 한국어)**.
    - Ensure strict **UTF-8 encoding**. No mojibake.
    - Output MUST be a valid JSON array.
    `;

    return await scanCandidatesWithAI(prompt, candidates, 'Volume-DryUp');
}

/**
 * AI 통찰: 숨겨진 강세 (Hidden Strength)
 */
export async function runHiddenStrengthScan(marketTarget: MarketTarget, candidates: ScannerCandidate[]): Promise<ScannerResult[]> {
    if (!candidates || candidates.length === 0) return [];

    const prompt = `
    Find "Hidden Strength" candidates (Relative Strength).
    Market: ${marketTarget}

    **Candidates Data:**
    ${JSON.stringify(candidates.map(c => ({
        ticker: c.ticker,
        name: c.stockName,
        price: c.currentPrice,
        history: c.recentCandles.slice(-10)
    })), null, 2)}

    **Instruction**:
    Identify stocks with:
    1. **Resilience**: Holding ground despite weak market.
    2. **Trend**: Higher lows.

    **CRITICAL OUTPUT RULES**:
    - The "rationale" field MUST be written in **Natural Korean (자연스러운 한국어)**.
    - Ensure strict **UTF-8 encoding**. No mojibake.
    - Output MUST be a valid JSON array.
    `;

    return await scanCandidatesWithAI(prompt, candidates, 'Hidden-Strength');
}

/**
 * 명예의 전당 스캔 (Hall of Fame) - Minervini & Larry Williams Style
 */
export async function runHallOfFameScan(marketTarget: MarketTarget, candidates: ScannerCandidate[]): Promise<ScannerResult[]> {
    if (!candidates || candidates.length === 0) return [];

    const prompt = `
    Analyze these ${candidates.length} candidates for "Hall of Fame" (Precision Strategy).
    Market: ${marketTarget}

    **Candidates Data:**
    ${JSON.stringify(candidates.map(c => ({
        ticker: c.ticker,
        name: c.stockName,
        price: c.currentPrice,
        history: c.recentCandles.slice(-20) // Need more history for trend
    })), null, 2)}

    **Instruction**:
    Identified candidates matching LEGENDARY criteria:
    1. **Mark Minervini**: Strong uptrend (Stage 2), Price > 50MA > 150MA > 200MA.
    2. **Larry Williams**: Volatility Breakout or unique accumulation patterns.

    **CRITICAL OUTPUT RULES**:
    - The "rationale" field MUST be written in **Natural Korean (자연스러운 한국어)**.
    - Ensure strict **UTF-8 encoding**. No mojibake.
    - Output MUST be a valid JSON array.
    `;

    return await scanCandidatesWithAI(prompt, candidates, 'Hall-of-Fame');
}


// --- Helper: Execute AI Scan with Data Injection ---
async function scanCandidatesWithAI(prompt: string, candidates: ScannerCandidate[], strategyName: string): Promise<ScannerResult[]> {
    // [Verification Log] Show the user that REAL DATA is being sent
    console.log(`[ScannerTools] 🧠 Sending Data-Driven Prompt for ${strategyName} (${candidates.length} items)`);
    // console.log(`[ScannerTools] 📝 Prompt Preview:\n${prompt.substring(0, 500)}...`); // Uncomment for deep debug

    try {
        const response = await generateContentWithRetry({
            model: 'gemini-2.0-flash-001',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: SCANNER_RESULT_SCHEMA
            }
        });

        let text = response.text || '[]';
        const jsonStart = text.indexOf('[');
        const jsonEnd = text.lastIndexOf(']');
        if (jsonStart !== -1 && jsonEnd !== -1) {
            text = text.substring(jsonStart, jsonEnd + 1);
        }

        const aiResults: any[] = JSON.parse(sanitizeJsonString(text));

        // Map AI results back to Real Data (Cross-Verification)
        return aiResults.map(res => {
            const realData = candidates.find(c => c.ticker === res.ticker);
            if (!realData) return null; // Filter out hallucinations

            return {
                ticker: realData.ticker,
                stockName: realData.stockName,
                matchType: strategyName,
                price: realData.currentPrice, // FORCE REAL PRICE
                changeRate: 0, // Could calculate if needed
                volumeStrength: res.patternQuality === 'High' ? 100 : 70,
                technicalSignal: res.rationale,
                reason: res.rationale
            };
        }).filter(item => item !== null) as ScannerResult[];

    } catch (error) {
        console.error(`[ScannerTools] AI Scan failed for ${strategyName}:`, error);
        return [];
    }
}

export const scannerTools = {
    runValuePivotScan,
    runPowerPlayScan,
    runTurnaroundScan,
    runEagleEyeScanner,
    runVolumeSpikeScanner,
    runVolumeDryUpScan,
    runHiddenStrengthScan
};
