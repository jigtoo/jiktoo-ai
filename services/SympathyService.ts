
import { generateContentWithRetry, ai } from './gemini/client';
import { sanitizeJsonString } from './utils/jsonUtils';
import type { SniperTrigger } from './SniperTriggerService'; // Type needs to be imported or defined
import { autoPilotService } from './AutoPilotService';
import { marketInfo } from './marketInfo';
import type { MarketTarget } from '../types';
import { SchemaType } from '@google/generative-ai';
import { _fetchLatestPrice } from './dataService';

interface CoupledGroup {
    id: string;
    theme: string;
    leader: string;
    followers: string[];
    rationale: string;
    createdAt: number;
}

class SympathyService {
    private groups: Map<string, CoupledGroup> = new Map(); // Key: Leader Ticker

    /**
     * Registers a group of tickers by identifying Leader and Followers via AI.
     */
    public async registerCoupling(market: MarketTarget, theme: string, tickers: string[]) {
        if (!ai || tickers.length < 2) return;

        console.log(`[Sympathy] Analyzing coupling structure for theme: ${theme} (${tickers.join(', ')})`);

        const prompt = `
        Analyze the following list of stocks in the ${marketInfo[market].name} market related to the theme "${theme}".
        Identify which ONE stock is the "Leader" (?€?¥ì£¼) and which are "Followers" (ë¶€?˜ì£¼/?„ë°œì£?.
        
        Stocks: ${tickers.join(', ')}

        Return JSON:
        {
            "leader": "TICKER",
            "followers": ["TICKER", "TICKER"],
            "rationale": "Why is this the leader?"
        }
        `;

        try {
            const response = await generateContentWithRetry({
                model: "gemini-2.0-flash-001",
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: SchemaType.OBJECT,
                        properties: {
                            leader: { type: SchemaType.STRING },
                            followers: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                            rationale: { type: SchemaType.STRING }
                        },
                        required: ["leader", "followers", "rationale"]
                    }
                }
            });

            const result = JSON.parse(sanitizeJsonString(response.text || '{}'));
            if (result.leader && result.followers && result.followers.length > 0) {
                this.groups.set(result.leader, {
                    id: `${theme}-${Date.now()}`,
                    theme: theme,
                    leader: result.leader,
                    followers: result.followers,
                    rationale: result.rationale,
                    createdAt: Date.now()
                });
                console.log(`[Sympathy] Registered Group: ?‘‘ ${result.leader} -> ?”— ${result.followers.join(', ')}`);
            }
        } catch (e) {
            console.error('[Sympathy] Failed to register coupling:', e);
        }
    }

    /**
     * Called when a Sniper Trigger fires (e.g., VI, Spike).
     * If the trigger is a Leader, we check Followers.
     */
    public async onTrigger(trigger: any) {
        const group = this.groups.get(trigger.ticker);
        if (!group) return;

        console.log(`[Sympathy] ??Leader Trigger Detected: ${trigger.stockName} (${trigger.ticker}). Checking followers...`);

        // Check Followers
        for (const followerTicker of group.followers) {
            try {
                // Fetch Follower Price
                const priceData = await _fetchLatestPrice(followerTicker, 'UNKNOWN', 'KR'); // Assuming KR for now, need market context
                if (!priceData) continue;

                const followerChange = priceData.changeRate; // e.g., 2.5 (%)

                // Logic: If Leader is flying (Triggered) but Follower is strictly lagging
                // e.g. Leader > 10%, Follower < 5%
                // We assume Trigger means Leader is moving FAST.

                // Simple Logic: If Follower is not yet "Too High" (< 10%), Buy it.
                if (followerChange < 5.0) {
                    console.log(`[Sympathy] ?Ž¯ Opportunity: Follower ${followerTicker} is lagging (${followerChange}%). Signaling Buy!`);

                    // Synthesize a Signal for AutoPilot
                    const sympathySignal = {
                        ticker: followerTicker,
                        stockName: followerTicker, // Ideally fetch name
                        type: 'SYMPATHY_PULSE', // New Signal Type
                        score: 85, // High confidence for Sympathy
                        currentPrice: priceData.price,
                        changeRate: followerChange,
                        details: `[Sympathy] Leader ${group.leader} triggered ${trigger.type}. Catching up.`
                    };

                    await autoPilotService.executeSignal(sympathySignal);
                } else {
                    console.log(`[Sympathy] ??¸ Follower ${followerTicker} already moved (${followerChange}%). Skipping.`);
                }
            } catch (e) {
                console.error(`[Sympathy] Error checking follower ${followerTicker}:`, e);
            }
        }
    }
}

export const sympathyService = new SympathyService();
