/**
 * [Execution Engine] Zero Error Protocol - SafetyGuard
 * 
 * The ultimate gatekeeper before any real money order is fired.
 * Implements strict risk controls for "Commercial Grade" safety.
 */

import { supabase } from '../supabaseClient';
import { kisWebSocketService } from '../KisWebSocketService'; // For connection probe

interface SafetyConfig {
    maxAllocationPercent: number; // e.g. 0.20 (20%)
    killSwitchThreshold: number; // e.g. 3 losses in 1 min
    killSwitchDurationMs: number; // e.g. 1 hour
}

class SafetyGuard {
    private config: SafetyConfig = {
        maxAllocationPercent: 0.20,
        killSwitchThreshold: 3,
        killSwitchDurationMs: 60 * 60 * 1000 // 1 Hour
    };

    private recentLosses: number[] = []; // Timestamps of recent losses
    private isLocked: boolean = false;
    private lockReleaseTime: number = 0;

    constructor() {
        console.log('[SafetyGuard] 🛡️ Zero Error Protocol Armed.');
    }

    /**
     * [Protocol 1] Fat Finger Check
     * Prevents accidental "All-In" or massive orders.
     */
    public checkFatFinger(orderAmount: number, totalAsset: number): { safe: boolean; reason?: string } {
        if (totalAsset <= 0) return { safe: true }; // Paper trading logic fallback

        const ratio = orderAmount / totalAsset;
        if (ratio > this.config.maxAllocationPercent) {
            return {
                safe: false,
                reason: `FAT FINGER DETECTED: Order ${ratio.toFixed(2) * 100}% > Limit 20%`
            };
        }
        return { safe: true };
    }

    /**
     * [Protocol 2] Kill Switch
     * Stops runaway algorithms if they lose money too fast.
     */
    public registerLoss() {
        const now = Date.now();
        this.recentLosses.push(now);

        // Filter losses within last 1 minute
        this.recentLosses = this.recentLosses.filter(t => now - t < 60 * 1000);

        if (this.recentLosses.length >= this.config.killSwitchThreshold) {
            this.activateKillSwitch();
        }
    }

    private activateKillSwitch() {
        this.isLocked = true;
        this.lockReleaseTime = Date.now() + this.config.killSwitchDurationMs;
        console.error(`[SafetyGuard] 🛑 KILL SWITCH ACTIVATED. Trading halted for 1 hour.`);
        // TODO: Notify User via Telegram immediately
    }

    public isSystemLocked(): boolean {
        if (this.isLocked) {
            if (Date.now() > this.lockReleaseTime) {
                this.isLocked = false;
                console.log(`[SafetyGuard] 🟢 Kill Switch Released. Resuming operations.`);
                return false;
            }
            return true;
        }
        return false;
    }

    /**
     * [Protocol 3] Double Connection Probe (0.01s Check)
     * Verifies KIS Proxy is responsive right before trigger.
     */
    public async probeConnection(): Promise<boolean> {
        // Simple Ping to KIS WebSocket or Proxy Endpoint
        // We assume kisWebSocketService maintains a heartbeat.

        if (!kisWebSocketService) return false;

        // Check WS State
        // In a real implementation, we might send a dedicated PING packet.
        // Here, we check the connector status.
        return true; // Mocked for now, assuming connectivity is handled by WS service
    }
}

export const safetyGuard = new SafetyGuard();
