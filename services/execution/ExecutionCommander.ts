import { MarketTarget } from '../../types';
import { sniperService } from './SniperService';
import { safetyGuard } from './SafetyGuard';

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
    private isActive = false;
    private config: CommanderConfig = {
        sniperThreshold: 90
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

        // 1. Evaluate Confidence
        const confidence = playbook.score || playbook.confidence || 0;
        if (confidence < this.config.sniperThreshold) {
            console.log(`[ExecutionCommander] 🛑 Rejected: Score ${confidence} < Threshold ${this.config.sniperThreshold}`);
            return;
        }

        console.log(`[ExecutionCommander] 🌩️ COMMANDER AUTHORIZED: Executing Sniper for ${playbook.ticker} (Score ${confidence})`);

        // 2. Delegate to Sniper (The Hands)
        // Default allocation: 10% of portfolio (for now, will be dynamic later)
        // We need to fetch total asset first to calculate actual amount, but SafetyGuard checks ratio anyway.
        // Let's assume a standard allocation logic or pass a fixed amount for now.
        // Ideally, Position Sizer should be here.
        // For Phase 1, we use a fixed mock allocation or just trigger "buy max safe".

        const success = await sniperService.executeOrder({
            ticker: playbook.ticker,
            stockName: playbook.stockName || playbook.ticker,
            confidence: confidence,
            allocation: 1000000 // Mock: 1 Million KRW per trade (needs PositionSizer)
        }, market);

        if (success) {
            console.log(`[ExecutionCommander] Trade Successful. Reporting to Evolution Engine.`);
            // [Architecture 2.0] Evolution Loop
            // We assume sniperService returns details or we pass context.
            // For now, simpler notification.
            // TODO: In Phase 4, we'd pass the actual trade record ID.
        } else {
            console.warn(`[ExecutionCommander] Trade Failed. Logging error for future analysis.`);
            // Register loss or failure? SafetyGuard might register loss later on PnL check.
        }
    }
}

export const executionCommander = new ExecutionCommander();
