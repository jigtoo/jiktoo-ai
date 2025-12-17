/**
 * Technical Indicators Calculation Utility
 * Implements standard indicators used by legendary traders.
 */

// Calculate Simple Moving Average (SMA)
export function calculateSMA(data: number[], period: number): number[] {
    const sma: number[] = [];
    for (let i = 0; i < data.length; i++) {
        if (i < period - 1) {
            sma.push(NaN);
            continue;
        }
        const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
        sma.push(sum / period);
    }
    return sma;
}

// Calculate True Range (TR)
function calculateTR(high: number, low: number, prevClose: number): number {
    return Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose)
    );
}

// Calculate Average True Range (ATR)
export function calculateATR(highs: number[], lows: number[], closes: number[], period: number = 14): number[] {
    if (highs.length !== lows.length || lows.length !== closes.length) {
        throw new Error("Input arrays must have the same length");
    }

    const trs: number[] = [];
    // First TR is simply High - Low
    trs.push(highs[0] - lows[0]);

    for (let i = 1; i < highs.length; i++) {
        trs.push(calculateTR(highs[i], lows[i], closes[i - 1]));
    }

    // First ATR is simple average of TRs
    const atrs: number[] = [];
    let firstATR = trs.slice(0, period).reduce((a, b) => a + b, 0) / period;

    // Fill initial NaNs
    for (let i = 0; i < period - 1; i++) {
        atrs.push(NaN);
    }
    atrs.push(firstATR);

    // Subsequent ATRs: Wilder's Smoothing Method
    // ATR = ((Prior ATR * (period - 1)) + Current TR) / period
    for (let i = period; i < trs.length; i++) {
        const currentTR = trs[i];
        const priorATR = atrs[i - 1];
        const nextATR = ((priorATR * (period - 1)) + currentTR) / period;
        atrs.push(nextATR);
    }

    return atrs;
}

// Calculate Relative Strength Index (RSI)
export function calculateRSI(closes: number[], period: number = 14): number[] {
    const rsi: number[] = [];
    const gains: number[] = [];
    const losses: number[] = [];

    // Calculate initial changes
    for (let i = 1; i < closes.length; i++) {
        const change = closes[i] - closes[i - 1];
        gains.push(change > 0 ? change : 0);
        losses.push(change < 0 ? Math.abs(change) : 0);
    }

    // First average gain/loss
    let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
    let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

    // Fill initial NaNs
    for (let i = 0; i < period; i++) {
        rsi.push(NaN);
    }

    // First RSI
    let rs = avgGain / avgLoss;
    rsi.push(100 - (100 / (1 + rs)));

    // Smoothed averages
    for (let i = period; i < gains.length; i++) {
        avgGain = ((avgGain * (period - 1)) + gains[i]) / period;
        avgLoss = ((avgLoss * (period - 1)) + losses[i]) / period;

        rs = avgGain / avgLoss;
        rsi.push(100 - (100 / (1 + rs)));
    }

    return rsi;
}

/**
 * Check if the stock meets Mark Minervini's SEPA Trend Template criteria.
 * @param currentPrice Current price of the stock
 * @param candles Historical daily candles (must be at least 200 days for full check)
 * @returns { pass: boolean, reason: string }
 */
export function checkSEPA(currentPrice: number, candles: { close: number }[]): { pass: boolean; reason: string } {
    if (candles.length < 200) {
        // If history is insufficient but > 50, we can do a partial check or just warn.
        // For strict SEPA, we need 200.
        return { pass: false, reason: `Insufficient history (Need 200 days, got ${candles.length})` };
    }

    const closes = candles.map(c => c.close);

    // Calculate Moving Averages
    const sma50 = calculateSMA(closes, 50);
    const sma150 = calculateSMA(closes, 150);
    const sma200 = calculateSMA(closes, 200);

    const currentSMA50 = sma50[sma50.length - 1];
    const currentSMA150 = sma150[sma150.length - 1];
    const currentSMA200 = sma200[sma200.length - 1];
    const prevSMA200 = sma200[sma200.length - 20]; // 20 days ago to check slope

    // Calculate 52-week High/Low (approx 250 trading days, using available max)
    const lookback = Math.min(closes.length, 250);
    const recentCloses = closes.slice(-lookback);
    const yearHigh = Math.max(...recentCloses);
    const yearLow = Math.min(...recentCloses);

    // Criteria 1: Price > 150 SMA and 200 SMA
    if (currentPrice < currentSMA150 || currentPrice < currentSMA200) {
        return { pass: false, reason: 'Price below long-term MAs (150/200)' };
    }

    // Criteria 2: 150 SMA > 200 SMA
    if (currentSMA150 < currentSMA200) {
        return { pass: false, reason: 'Long-term MAs not aligned (150 < 200)' };
    }

    // Criteria 3: 200 SMA is trending up (Slope check)
    if (currentSMA200 <= prevSMA200) {
        return { pass: false, reason: '200 SMA is trending down or flat' };
    }

    // Criteria 4: 50 SMA > 150 SMA and 200 SMA
    if (currentSMA50 < currentSMA150 || currentSMA50 < currentSMA200) {
        return { pass: false, reason: '50 SMA below long-term MAs' };
    }

    // Criteria 5: Price > 50 SMA
    if (currentPrice < currentSMA50) {
        return { pass: false, reason: 'Price below 50 SMA (Lost momentum)' };
    }

    // Criteria 6: Price >= 52-week Low + 25%
    if (currentPrice < yearLow * 1.25) {
        return { pass: false, reason: 'Price not enough off lows (< 25%)' };
    }

    // Criteria 7: Price >= 52-week High - 25% (Near Highs)
    if (currentPrice < yearHigh * 0.75) {
        return { pass: false, reason: 'Price too far from highs (> 25% off)' };
    }

    return { pass: true, reason: 'All SEPA Trend Template criteria met' };
}
