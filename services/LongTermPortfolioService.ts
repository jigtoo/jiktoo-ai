
import { supabase } from './supabaseClient';
import { marketRegimeService } from './MarketRegimeService';
import type { MarketTarget } from '../types';

/**
 * [Project Awakening] Long-Term Portfolio Service
 * Responsibility: Manage the 'Core' (70%) vs 'Satellite' (30%) Asset Allocation.
 * - Core: Stable ETFs, Dividend Aristocrats, Quality Stocks (Megatrend).
 * - Satellite: Aggressive Trading (AutoPilot / Hell Week Logic).
 */
class LongTermPortfolioService {
    private readonly CORE_TARGET_RATIO = 0.7; // 70% Core
    private readonly SATELLITE_CAP_RATIO = 0.3; // 30% Satellite

    constructor() {
        console.log('[LongTerm] Service Initialized. Target: 70% Core / 30% Satellite.');
    }

    /**
     * Calculate allowable budget for Satellite (AutoPilot) trading.
     * @param totalEquity Current Total Asset Value
     * @param currentSatelliteExposure Current Value of AutoPilot Positions
     */
    public getSatelliteBudget(totalEquity: number, currentSatelliteExposure: number): number {
        const maxSatellite = totalEquity * this.SATELLITE_CAP_RATIO;
        const remainingBudget = maxSatellite - currentSatelliteExposure;

        return Math.max(0, remainingBudget);
    }

    /**
     * [Core Logic] Select Top Assets for Long-Term Holding
     * Based on:
     * 1. Market Regime (e.g., Inflation -> Gold/Energy, Growth -> Tech)
     * 2. Business Quality (ROE > 15%, Debt < 50%)
     */
    public async rebalanceCorePortfolio(totalEquity: number) {
        // 1. Check Market Regime
        const regime = await marketRegimeService.analyzeCurrentRegime('KR'); // Default Context
        console.log(`[LongTerm] Rebalancing Core for Regime: ${regime.regime}`);

        // 2. Determine Sector Weight based on Regime (Simplified Logic)
        // Panic/Bear -> Defensive (Bond, Consumer Staples, Gold)
        // Bull -> Growth (Tech, Consumer Discretionary)
        let focusSectors: string[] = [];
        if (regime.regime.includes('BEAR')) {
            focusSectors = ['DEFENSIVE', 'BONDS', 'GOLD'];
        } else {
            focusSectors = ['TECHNOLOGY', 'SEMICONDUCTOR', 'FINANCE'];
        }

        // 3. Fetch Candidate Stocks (Stub - would query DB/API)
        // For now, return recommendations
        return {
            action: 'REBALANCE',
            focus: focusSectors,
            targetCoreValue: totalEquity * this.CORE_TARGET_RATIO,
            message: `Optimizing Core for ${regime.regime}. Focus: ${focusSectors.join(', ')}`
        };
    }

    /**
     * [Filter] Constitution Article 6 (Addendum): Business Quality
     * "We do not hold junk for long term."
     */
    public checkBusinessQuality(stockInfo: any): boolean {
        // Defaults
        const roe = stockInfo.roe || 0;
        const debtRatio = stockInfo.debtRatio || 100;

        // Quality Criteria
        const isQuality = roe > 10.0 && debtRatio < 150.0;

        if (!isQuality) {
            console.log(`[LongTerm] 🗑️ Quality Filter Reject: ${stockInfo.name} (ROE: ${roe}%, Debt: ${debtRatio}%)`);
        } else {
            console.log(`[LongTerm] 💎 Quality Verified: ${stockInfo.name}`);
        }

        return isQuality;
    }
}

export const longTermPortfolioService = new LongTermPortfolioService();
