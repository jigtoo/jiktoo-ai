export class TechnicalAnalysis {
    static SMA(data: number[], period: number): number[] {
        if (data.length < period) return new Array(data.length).fill(NaN);
        const results = [];
        let sum = 0;
        for (let i = 0; i < period; i++) sum += data[i];
        results.push(sum / period);
        for (let i = period; i < data.length; i++) {
            sum = sum - data[i - period] + data[i];
            results.push(sum / period);
        }
        // Pad beginning with NaN to match data length
        return [...new Array(period - 1).fill(NaN), ...results];
    }

    static EMA(data: number[], period: number): number[] {
        if (data.length < period) return new Array(data.length).fill(NaN);
        const k = 2 / (period + 1);
        const results = new Array(period - 1).fill(NaN);
        let sma = 0;
        for (let i = 0; i < period; i++) sma += data[i];
        sma /= period;
        results.push(sma);

        for (let i = period; i < data.length; i++) {
            const ema = (data[i] * k) + (results[results.length - 1] * (1 - k));
            results.push(ema);
        }
        return results;
    }

    static RSI(data: number[], period: number = 14): number[] {
        if (data.length < period + 1) return new Array(data.length).fill(NaN);
        const results = new Array(period).fill(NaN); // First result at index period (requiring period+1 points)

        let avgGain = 0;
        let avgLoss = 0;

        for (let i = 1; i <= period; i++) {
            const change = data[i] - data[i - 1];
            if (change > 0) avgGain += change;
            else avgLoss += Math.abs(change);
        }

        avgGain /= period;
        avgLoss /= period;

        let rs = avgGain / avgLoss;
        results.push(100 - (100 / (1 + rs)));

        for (let i = period + 1; i < data.length; i++) {
            const change = data[i] - data[i - 1];
            const gain = change > 0 ? change : 0;
            const loss = change < 0 ? Math.abs(change) : 0;

            avgGain = (avgGain * (period - 1) + gain) / period;
            avgLoss = (avgLoss * (period - 1) + loss) / period;

            rs = avgGain / avgLoss;
            results.push(100 - (100 / (1 + rs)));
        }
        return results;
    }

    static BollingerBands(data: number[], period: number = 20, multiplier: number = 2): { upper: number[], middle: number[], lower: number[] } {
        const middle = this.SMA(data, period);
        const upper = [];
        const lower = [];

        for (let i = 0; i < data.length; i++) {
            if (isNaN(middle[i])) {
                upper.push(NaN);
                lower.push(NaN);
                continue;
            }

            // Standard Deviation
            let sumSqDiff = 0;
            const slice = data.slice(i - period + 1, i + 1);
            for (const val of slice) {
                sumSqDiff += Math.pow(val - middle[i], 2);
            }
            const stdDev = Math.sqrt(sumSqDiff / period);

            upper.push(middle[i] + (multiplier * stdDev));
            lower.push(middle[i] - (multiplier * stdDev));
        }
        return { upper, middle, lower };
    }
}
