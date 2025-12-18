/**
 * [Execution Engine] Sniper - The Hands
 * 
 * Responsible for the physical act of trading:
 * 1. Receive Target (Ticker)
 * 2. Validate Safety (SafetyGuard)
 * 3. Calculate Optimal Entry (Limit Order Logic)
 * 4. Pull the Trigger (Execute Order)
 */

import { safetyGuard } from './SafetyGuard';
import { virtualTradingService } from '../VirtualTradingService';
import { _fetchLatestPrice } from '../dataService';

export interface SniperTarget {
    ticker: string;
    stockName: string;
    targetPrice?: number; // Optional limit price
    confidence: number;
    allocation: number; // Amount to buy
}

class SniperService {

    constructor() {
        console.log('[Sniper] 🔫 Ready to fire.');
    }

    /**
     * The Main Trigger Method
     * "Don't think, just shoot."
     */
    public async executeOrder(target: SniperTarget, market: 'KR' | 'US' = 'KR'): Promise<boolean> {
        console.log(`[Sniper] 👁️ Locking on target: ${target.stockName} (${target.ticker})`);

        // 1. Kill Switch Check
        if (safetyGuard.isSystemLocked()) {
            console.warn(`[Sniper] 🛑 LOCKED. Execution blocked by Kill Switch.`);
            return false;
        }

        // 2. Fat Finger Check
        const account = virtualTradingService.getAccount();
        const safetyCheck = safetyGuard.checkFatFinger(target.allocation, account.totalAsset);
        if (!safetyCheck.safe) {
            console.error(`[Sniper] 🛑 BLOCKED: ${safetyCheck.reason}`);
            return false;
        }

        // 3. Double Connection Probe
        const isConnected = await safetyGuard.probeConnection();
        if (!isConnected) {
            console.error(`[Sniper] 🔌 CONNECTIVITY LOST. Aborting order.`);
            return false;
        }

        // 4. Final Price Check (Limit Order Logic)
        // In virtual trading, we just get latest price. In real trading, we read the Orderbook.
        const priceData = await _fetchLatestPrice(target.ticker, target.stockName, market);
        if (!priceData || priceData.price <= 0) {
            console.error(`[Sniper] ❌ Price unavailable for ${target.ticker}`);
            return false;
        }

        // 5. PULL THE TRIGGER
        // We pass the order to VirtualTradingService (which acts as the Broker API Wrapper)
        const result = await virtualTradingService.buy(target.ticker, target.stockName, target.allocation, priceData.price);

        if (result.success) {
            console.log(`[Sniper] 🎯 HIT! Bought ${target.stockName} at ${priceData.price}`);
            return true;
        } else {
            console.error(`[Sniper] 💨 MISS! Execution failed: ${result.message}`);
            return false;
        }
    }
}

export const sniperService = new SniperService();
