// services/utils/marketUtils.ts

/**
 * Determines if a Korean stock ticker is KOSPI or KOSDAQ
 * 
 * KOSPI tickers typically start with 0-2 or 9
 * KOSDAQ tickers typically start with 3 or A (for ETF/REITs on KOSDAQ)
 * 
 * @param ticker - 6-digit Korean stock ticker (e.g., "005930", "247540")
 * @returns "KOSPI" | "KOSDAQ" | "UNKNOWN"
 */
export function getKoreanStockMarket(ticker: string): "KOSPI" | "KOSDAQ" | "UNKNOWN" {
    if (!ticker || ticker.length !== 6) {
        return "UNKNOWN";
    }

    const firstDigit = ticker.charAt(0);

    // KOSPI: 0, 1, 2, 9
    if (firstDigit === '0' || firstDigit === '1' || firstDigit === '2' || firstDigit === '9') {
        return "KOSPI";
    }

    // KOSDAQ: 3, A (and some rare cases with 4-8, but mostly 3)
    if (firstDigit === '3' || firstDigit.toUpperCase() === 'A') {
        return "KOSDAQ";
    }

    // For tickers starting with 4-8, they are typically KOSDAQ
    if (/^[4-8]/.test(firstDigit)) {
        return "KOSDAQ";
    }

    return "UNKNOWN";
}

/**
 * Returns a display label for Korean stock market
 */
export function getKoreanMarketLabel(ticker: string): string {
    const market = getKoreanStockMarket(ticker);
    if (market === "UNKNOWN") return "KR";
    return market;
}

/**
 * Returns badge color class for market label
 */
export function getMarketBadgeColor(ticker: string): string {
    const market = getKoreanStockMarket(ticker);
    switch (market) {
        case "KOSPI":
            return "bg-blue-600 text-white";
        case "KOSDAQ":
            return "bg-orange-600 text-white";
        default:
            return "bg-gray-600 text-white";
    }
}
