import { sniperService } from './SniperService';
import { marketRegimeService } from '../MarketRegimeService';
import { deepResearchService } from '../DeepResearchService';

/**
 * [Architecture 2.0] Execution Engine - ExecutionCommander
 * 
 * The Field Commander responsible for "Zero Error" execution.
 * Replaces the monolithic AutoPilotService.
 * 
 * Responsibilities:
 * 1. Receive Playbook from Discovery Engine
 * 2. Check "Sniper Mode" conditions (Confidence > 90)
 * 3. Validate Safety (Fat Finger, Kill Switch) - *Zero Error Protocol*
 * 4. Execute Order via Sniper
 */

interface CommanderConfig {
    sniperThreshold: number; // e.g. 90
}

class ExecutionCommander {
    private isActive = true; // [Learning Mode] Auto-start for continuous learning
    private config: CommanderConfig = {
        sniperThreshold: 60 // [Learning Mode] Lower threshold to allow more experimental trades
    };

    constructor() {
        console.log('[ExecutionCommander] 🔫 Execution Engine Initialized.');
    }

    public async startDuty() {
        this.isActive = true;
        console.log('[ExecutionCommander] Standing by for high-confidence targets.');
    }

    public async stopDuty() {
        this.isActive = false;
        console.log('[ExecutionCommander] Standing down.');
    }

    /**
     * The Trigger Entry Point
     * @param playbook The Alpha-Link Playbook item or Signal
     */
    public async executeOrder(playbook: any, market: 'KR' | 'US' = 'KR') {
        if (!this.isActive) {
            console.log(`[ExecutionCommander] Ignored order for ${playbook.ticker} (Commander Inactive)`);
            return;
        }

        // 1. Evaluate Confidence & Market Compatibility
        const confidence = playbook.score || playbook.confidence || 0;
        const regimeStatus = marketRegimeService.getLastStatus(market);
        const exposure = regimeStatus?.recommendedExposure ?? 0.3;

        // [Adaptive Sizing Phase 1]
        // Base Amount: 1M KRW (Standard)
        // Adjusted by: (Confidence / 100) * (Market Exposure)
        // If Confidence = 100, Market = Super Bull (1.0) -> Amount = 1M
        // If Confidence = 90, Market = Sideways (0.5) -> Amount = 450k
        const baseAllocation = market === 'KR' ? 1000000 : 1000; // 1M KRW or 1000 USD
        // [Scanner-Driven Override] Ensure minimum exposure for high conviction signals even in Bear Markets
        // User Request: "Remove Regime Filter" -> Minimum 0.3 allocation
        const effectiveExposure = Math.max(exposure, 0.3);
        const dynamicAllocation = Math.round(baseAllocation * (confidence / 100) * effectiveExposure);

        if (confidence < this.config.sniperThreshold) {
            console.log(`[ExecutionCommander] 🛑 Rejected: Score ${confidence} < Threshold ${this.config.sniperThreshold}`);
            return;
        }

        /* [Disabled by User Request - Bottom-Up Mode]
        if (exposure <= 0) {
            console.log(`[ExecutionCommander] 🛑 Rejected: Market Regime (${regimeStatus?.regime}) forbids new exposure.`);
            return;
        }
        */

        // 2. [Ghost Protocol] Deep Research Verification
        console.log(`[ExecutionCommander] 🕵️ Ghost Protocol: Verifying ${playbook.ticker}...`);
        const forensicResult = await deepResearchService.analyzePricedInRisk(playbook.ticker, market);

        // [Learning Mode] Relaxed Ghost Protocol - Allow learning from "priced-in" stocks
        if (forensicResult.isPricedIn && forensicResult.riskScore > 90) {
            console.warn(`[ExecutionCommander] 🛑 ABORT: ${playbook.ticker} is EXTREMELY PRE-PRICED (${forensicResult.riskScore}/100). Risk: ${forensicResult.rationale}`);
            return;
        } else if (forensicResult.isPricedIn && forensicResult.riskScore > 70) {
            console.log(`[ExecutionCommander] ⚠️ CAUTION: ${playbook.ticker} may be priced-in (${forensicResult.riskScore}/100), but proceeding for learning.`);
        }

        console.log(`[ExecutionCommander] 🌩️ COMMANDER AUTHORIZED: Executing for ${playbook.ticker} (Score ${confidence}, Market ${regimeStatus?.regime}, Amount ${dynamicAllocation})`);

        // 3. Delegate to Sniper (The Hands)
        const success = await sniperService.executeOrder({
            ticker: playbook.ticker,
            stockName: playbook.stockName || playbook.ticker,
            confidence: confidence,
            allocation: dynamicAllocation
        }, market);

        if (success) {
            console.log(`[ExecutionCommander] ✅ Trade Successful. Reporting to Evolution Engine.`);
        } else {
            console.warn(`[ExecutionCommander] ❌ Trade Failed. Logging error for future analysis.`);
        }
    }
}

export const executionCommander = new ExecutionCommander();
