// services/fredService.ts
import { API_GATEWAY_URL } from '../config';

export interface FREDData {
    [seriesId: string]: string | number;
}

/**
 * Fetch economic data from FRED API
 * @param seriesIds Array of FRED series IDs
 */
export async function fetchFREDData(seriesIds: string[]): Promise<FREDData> {
    try {
        const response = await fetch(`${API_GATEWAY_URL}?service=fred`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ series_ids: seriesIds })
        });

        if (!response.ok) {
            throw new Error(`FRED API error: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('[FRED Service] Error:', error);
        // Fallback or rethrow based on strategy
        return {};
    }
}

/**
 * Fetch key macro indicators
 */
export async function fetchMacroIndicators(): Promise<{
    federalFundsRate: number;
    unemploymentRate: number;
    cpi: number;
    gdp: number;
}> {
    try {
        const data = await fetchFREDData([
            'DFF',      // Federal Funds Rate
            'UNRATE',   // Unemployment Rate
            'CPIAUCSL', // CPI
            'GDP'       // GDP
        ]);

        return {
            federalFundsRate: parseFloat(data['DFF'] as string) || 0,
            unemploymentRate: parseFloat(data['UNRATE'] as string) || 0,
            cpi: parseFloat(data['CPIAUCSL'] as string) || 0,
            gdp: parseFloat(data['GDP'] as string) || 0
        };
    } catch (e) {
        console.warn('Failed to fetch macro indicators, using defaults');
        return { federalFundsRate: 5.0, unemploymentRate: 4.0, cpi: 300, gdp: 25000 };
    }
}

/**
 * Determine market regime based on macro indicators
 */
export function determineMarketRegime(indicators: {
    federalFundsRate: number;
    unemploymentRate: number;
}): 'tightening' | 'easing' | 'neutral' {
    const { federalFundsRate, unemploymentRate } = indicators;

    // High Rate + Low Unemployment = Tightening
    if (federalFundsRate > 4.5 && unemploymentRate < 4.5) {
        return 'tightening';
    }

    // Low Rate + High Unemployment = Easing
    if (federalFundsRate < 2.0 && unemploymentRate > 5.5) {
        return 'easing';
    }

    return 'neutral';
}
