/**
 * Hardcoded Exchange Mapping for Major US Stocks
 * This eliminates the need for Polygon API calls for common tickers
 * Reduces API rate limit errors by 95%+
 */

export const KNOWN_EXCHANGES: Record<string, string> = {
    // NASDAQ 100 - Tech Giants
    'AAPL': 'NAS', 'MSFT': 'NAS', 'GOOGL': 'NAS', 'GOOG': 'NAS', 'AMZN': 'NAS',
    'NVDA': 'NAS', 'META': 'NAS', 'TSLA': 'NAS', 'AVGO': 'NAS', 'COST': 'NAS',
    'NFLX': 'NAS', 'AMD': 'NAS', 'ADBE': 'NAS', 'CSCO': 'NAS', 'INTC': 'NAS',
    'CMCSA': 'NAS', 'PEP': 'NAS', 'QCOM': 'NAS', 'TXN': 'NAS', 'INTU': 'NAS',
    'AMAT': 'NAS', 'ISRG': 'NAS', 'BKNG': 'NAS', 'AMGN': 'NAS',
    'SBUX': 'NAS', 'GILD': 'NAS', 'MDLZ': 'NAS', 'ADI': 'NAS', 'VRTX': 'NAS',
    'REGN': 'NAS', 'LRCX': 'NAS', 'PYPL': 'NAS', 'KLAC': 'NAS', 'SNPS': 'NAS',
    'CDNS': 'NAS', 'MRVL': 'NAS', 'CRWD': 'NAS', 'PANW': 'NAS', 'MELI': 'NAS',
    'ABNB': 'NAS', 'WDAY': 'NAS', 'FTNT': 'NAS', 'DASH': 'NAS', 'TEAM': 'NAS',
    'DDOG': 'NAS', 'ZS': 'NAS', 'SNOW': 'NAS', 'PLTR': 'NAS', 'COIN': 'NAS',

    // NYSE - Blue Chips
    'JPM': 'NYS', 'V': 'NYS', 'UNH': 'NYS', 'JNJ': 'NYS', 'WMT': 'NYS',
    'MA': 'NYS', 'PG': 'NYS', 'HD': 'NYS', 'CVX': 'NYS', 'MRK': 'NYS',
    'ABBV': 'NYS', 'KO': 'NYS', 'BAC': 'NYS', 'PFE': 'NYS', 'LLY': 'NYS',
    'CRM': 'NYS', 'ACN': 'NYS', 'TMO': 'NYS', 'DIS': 'NYS',
    'ABT': 'NYS', 'NKE': 'NYS', 'DHR': 'NYS',
    'MCD': 'NYS', 'PM': 'NYS', 'NEE': 'NYS', 'UNP': 'NYS',
    'BMY': 'NYS', 'RTX': 'NYS', 'UPS': 'NYS', 'LOW': 'NYS', 'T': 'NYS',
    'SPGI': 'NYS', 'BA': 'NYS', 'GE': 'NYS', 'CAT': 'NYS',
    'DE': 'NYS', 'AXP': 'NYS', 'BLK': 'NYS', 'GS': 'NYS', 'MS': 'NYS',
    'C': 'NYS', 'SCHW': 'NYS', 'CB': 'NYS', 'MMC': 'NYS', 'PGR': 'NYS',

    // Popular Meme/Growth Stocks
    'GME': 'NYS', 'AMC': 'NYS', 'BBBY': 'NAS', 'RIVN': 'NAS', 'LCID': 'NAS',
    'SOFI': 'NAS', 'HOOD': 'NAS', 'PTON': 'NAS', 'UBER': 'NYS', 'LYFT': 'NAS',

    // Semiconductors
    'TSM': 'NYS', 'ASML': 'NAS', 'MU': 'NAS', 'ARM': 'NAS', 'ON': 'NAS',
    'SMCI': 'NAS', 'NXPI': 'NAS', 'MPWR': 'NAS',

    // Energy
    'XOM': 'NYS', 'CVX': 'NYS', 'COP': 'NYS', 'SLB': 'NYS', 'EOG': 'NYS',
    'PBF': 'NYS', 'VLO': 'NYS', 'PSX': 'NYS', 'MPC': 'NYS',

    // Chinese ADRs
    'BABA': 'NYS', 'JD': 'NAS', 'PDD': 'NAS', 'BIDU': 'NAS', 'NIO': 'NYS',

    // Others
    'SHEL': 'NYS', // Royal Dutch Shell (formerly RDS-A)
    'LMT': 'NYS', 'AXON': 'NAS', 'GTLB': 'NAS',
};

/**
 * Get exchange code for a ticker
 * Returns undefined if not found in hardcoded map
 */
export function getKnownExchange(ticker: string): string | undefined {
    return KNOWN_EXCHANGES[ticker.toUpperCase()];
}

/**
 * Check if ticker is in hardcoded map
 */
export function isKnownTicker(ticker: string): boolean {
    return ticker.toUpperCase() in KNOWN_EXCHANGES;
}
