import { gem1_Reliability, ReliabilityResult } from './gems/Gem1_Reliability';
import { gem2_ValueChain, ValueChainResult } from './gems/Gem2_ValueChain';

// Define the signal structure expected by AutoPilot
interface ExternalSignal {
    ticker: string;
    stockName: string;
    score: number; // Reliability Score 0-30 -> mapped to confidence
    details: string;
    source: string;
    timestamp: number;
    metadata: any;
    reliability: ReliabilityResult;
    valueChain?: ValueChainResult;
}

type SignalHandler = (signal: ExternalSignal) => Promise<void>;

export class TelegramIntelligenceService {
    private signalHandler: SignalHandler | null = null;

    /**
     * Registers the callback for processed signals (AutoPilot binds here)
     */
    public setSignalHandler(handler: SignalHandler) {
        this.signalHandler = handler;
        console.log('[TelegramIntelligence] Signal Handler attached.');
    }

    /**
     * Entry point for Telegram/Collector news.
     * @param text The raw message text
     * @param metadata Source metadata (channel name, time, etc.)
     */
    public async processMessage(text: string, metadata: any = {}) {
        console.log(`[TelegramIntelligence] 📨 Processing message...`);

        // 1. Gem 1: Reliability Filter (The Funnel)
        const reliability = await gem1_Reliability.evaluate(text);

        if (!reliability.isPass) {
            console.log(`[Gem 1] 🛑 Filtered: Score ${reliability.score}/30 - ${reliability.warning}`);
            return;
        }

        console.log(`[Gem 1] ✅ Passed: Score ${reliability.score}/30. Entities: ${JSON.stringify(reliability.entities)}`);

        // 2. Gem 2: Value Chain Analysis (Context Enriched)
        // Only run if score is relatively high (e.g. > 18) to save tokens, or for all passed items?
        // Let's run for all passed items to get 'relatedStocks'
        const valueChain = await gem2_ValueChain.analyze(text);
        console.log(`[Gem 2] 🔗 Value Chain: ${valueChain.theme} (${valueChain.directImpact.sentiment})`);

        // Combine Gem 1 entities with Gem 2 related stocks
        // Prioritize Gem 2 related stocks if they have tickers
        const allEntities: { ticker: string; name: string; reason?: string }[] = [];

        // Add Gem 1 primary entities
        reliability.entities?.forEach(e => {
            if (e.ticker) allEntities.push({ ticker: e.ticker, name: e.name, reason: 'Primary Subject' });
        });

        // Add Gem 2 related stocks (Impacted stocks)
        valueChain.relatedStocks?.forEach(s => {
            if (s.ticker) {
                // Check dupes
                if (!allEntities.find(e => e.ticker === s.ticker)) {
                    allEntities.push({ ticker: s.ticker, name: s.name, reason: `Value Chain: ${s.relationship} (${s.reason})` });
                }
            }
        });

        // Emit Signals for ALL impacted entities
        if (allEntities.length > 0) {
            for (const entity of allEntities) {

                // Adjust score based on relationship?
                // Direct = High Confidence, Indirect = Slightly Lower?
                let confidence = Math.min(reliability.score * 3.33, 99);
                if (entity.reason?.includes('Value Chain')) {
                    confidence *= 0.9; // Slight discount for 2nd order
                }

                const signal: ExternalSignal = {
                    ticker: entity.ticker,
                    stockName: entity.name,
                    score: Math.floor(confidence),
                    details: `[Gem 2 Analysis] ${valueChain.directImpact.description}`,
                    source: 'Telegram_Gems',
                    timestamp: Date.now(),
                    metadata: {
                        ...metadata,
                        theme: valueChain.theme,
                        keywords: valueChain.keywords,
                        reason: entity.reason
                    },
                    reliability,
                    valueChain // Pass full analysis
                };

                // Emit to AutoPilot
                if (this.signalHandler) {
                    await this.signalHandler(signal);
                } else {
                    console.warn('[TelegramIntelligence] No Handler attached! Signal dropped.');
                }
            }
        } else {
            console.warn('[Gem 1+2] Passed analysis but no clickable tickers found.');
        }
    }
}

export const telegramIntelligenceService = new TelegramIntelligenceService();
