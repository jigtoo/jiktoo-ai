// services/AutoPilotController.ts
import { autoPilotService } from './AutoPilotService';
import { telegramIntelligenceService } from './TelegramIntelligenceService'; // Import Telegram Service
import type { MarketTarget } from '../types';

export class AutoPilotController {

    /**
     * Start the AutoPilot service
     */
    public start() {
        autoPilotService.start();

        // [NEW] Attach Telegram Intelligence to AutoPilot
        telegramIntelligenceService.setSignalHandler(async (insight, _sourceData) => {
            console.log(`[Controller] 📨 Received Actionable Intel: ${insight.relatedTickers?.join(', ')}`);

            if (insight.suggestedAction === 'BUY' || insight.suggestedAction === 'WATCH') {
                for (const ticker of insight.relatedTickers) {
                    await autoPilotService.executeSignal({
                        ticker: ticker.replace(/[^0-9A-Z]/g, ''), // Clean ticker
                        stockName: ticker, // Fallback name
                        type: 'NEWS_RADAR',
                        score: insight.confidenceScore,
                        details: `[Intel] ${insight.sentiment}: ${insight.reasoning}`,
                        currentPrice: 0, // AutoPilot will fetch
                        changeRate: 0,
                        volume: 0
                    });
                }
            }
        });
        console.log('[Controller] Telegram Intelligence attached to AutoPilot.');
    }

    /**
     * Stop the AutoPilot service
     */
    public stop() {
        autoPilotService.stop();
    }

    /**
     * Update trading configuration
     */
    public updateConfig(config: {
        market: MarketTarget;
        mode: 'AGGRESSIVE' | 'SELECTIVE';
    }) {
        autoPilotService.setMarketTarget(config.market);
        autoPilotService.setTradingMode(config.mode);
    }

    /**
     * Get current status
     */
    public getStatus() {
        return autoPilotService.getStatus();
    }

    /**
     * Force run a specific analysis tool
     */
    public async runTool(toolName: string, market: MarketTarget) {
        console.log(`[Controller] Manually running tool: ${toolName} for ${market}`);
        // Implementation would dispatch to autoPilotService or scannerTools
        return { success: true, message: `Tool ${toolName} triggered` };
    }
}

export const autoPilotController = new AutoPilotController();
