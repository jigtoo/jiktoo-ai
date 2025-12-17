import { generateContentWithRetry } from './gemini/client';
import { sanitizeJsonString } from './utils/jsonUtils';
import { marketRegimeService } from './MarketRegimeService';
import { supabase } from './supabaseClient';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface IntelligenceImpact {
    sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'CAUTION';
    urgency: 'HIGH' | 'MEDIUM' | 'LOW';
    confidenceScore: number;
    relatedTickers: string[];
    actionable: boolean;
    reasoning: string;
    suggestedAction?: 'BUY' | 'SELL' | 'WATCH' | 'AVOID';
}

class TelegramIntelligenceService {
    private channel: RealtimeChannel | null = null;
    private processedMessages: Set<string> = new Set(); // [NEW] Track processed message IDs
    private readonly MAX_PROCESSED_CACHE = 1000; // Prevent memory leak

    // We attach the autopilot handler dynamically to avoid circular dependency issues during initialization
    private signalHandler: ((insight: any, sourceData: any) => Promise<void>) | null = null;

    constructor() {
        this.startSubscription();
        this.processRecentMessages(); // [NEW] Process recent messages on startup
    }

    public setSignalHandler(handler: (insight: any, sourceData: any) => Promise<void>) {
        this.signalHandler = handler;
    }

    private startSubscription() {
        console.log('[TelegramIntel] Starting Supabase Realtime Subscription...');

        // Listen to INSERT on telegram_messages
        if (!supabase) {
            console.error('[TelegramIntel] Supabase client not initialized');
            return;
        }

        // [NEW] Log for debugging
        console.log('[TelegramIntel] Ready to receive signals.');

        this.channel = supabase
            .channel('telegram-intelligence')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'telegram_messages' },
                async (payload: any) => {
                    console.log(`[TelegramIntel] ?“© New Message detected: ${payload.new.id} from ${payload.new.channel}`);
                    console.log(`[TelegramIntel] Content preview: ${payload.new.message?.substring(0, 50)}...`);

                    const msg = {
                        id: payload.new.id,
                        channel: payload.new.channel || 'Unknown',
                        message: payload.new.message,
                        created_at: payload.new.created_at
                    };
                    await this.handleNewMessage(msg);
                }
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'telegram_urls' },
                async (payload) => {
                    // Check if title/content was just populated
                    const newData = payload.new;
                    const oldData = payload.old;

                    if (newData.title && !oldData.title) {
                        console.log('[TelegramIntel] ?”— Link Expanded detected:', newData.url);
                        await this.handleExpandedLink(newData);
                    }
                }
            )
            .subscribe((status) => {
                console.log(`[TelegramIntel] Subscription status: ${status}`);
                if (status === 'SUBSCRIBED') {
                    console.log('[TelegramIntel] ??Realtime subscription active. Waiting for NEW messages...');
                }
            });
    }

    /**
     * [NEW] Process recent messages that may have been inserted before subscription was active
     * This catches up on messages that were collected while app was offline
     */
    private async processRecentMessages() {
        if (!supabase) {
            console.warn('[TelegramIntel] Cannot backfill - Supabase not available');
            return;
        }

        try {
            console.log('[TelegramIntel] ?”„ Checking for recent unprocessed messages...');

            // Fetch messages from last 15 minutes that haven't been analyzed yet (REDUCED TO SAVE TOKENS)
            const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

            const { data: recentMessages, error } = await supabase
                .from('telegram_messages')
                .select('id, channel, message, created_at')
                .gte('created_at', fifteenMinutesAgo)
                .neq('channel', 'SYSTEM')
                .order('created_at', { ascending: true })
                .limit(5); // REDUCED from 20 to 5

            if (error) {
                console.error('[TelegramIntel] Failed to fetch recent messages:', error);
                return;
            }

            if (!recentMessages || recentMessages.length === 0) {
                console.log('[TelegramIntel] ??No recent messages to process');
                return;
            }

            console.log(`[TelegramIntel] ?“¦ Found ${recentMessages.length} recent messages (last 15min). Processing...`);

            // Process each message with delay to avoid rate limits
            for (const msg of recentMessages) {
                await this.handleNewMessage(msg);
                // Increased delay to further reduce API pressure
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            console.log('[TelegramIntel] ??Backfill complete');

        } catch (error) {
            console.error('[TelegramIntel] Backfill error:', error);
        }
    }

    private async handleNewMessage(msg: any) {
        console.log(`[TelegramIntel] ?“© Processing polled message: ${msg.id} from ${msg.channel}`);

        // [CRITICAL FIX] Deduplication - prevents re-analyzing old messages
        if (this.processedMessages.has(msg.id)) {
            console.log(`[TelegramIntel] ??¸ Skipping already processed message ${msg.id}`);
            return;
        }

        // [DEBUG] Log message structure
        console.log(`[TelegramIntel] ?” Message ${msg.id} details:`, {
            hasMessage: !!msg.message,
            length: msg.message?.length || 0,
            preview: msg.message?.substring(0, 50) || '(empty)'
        });

        // [FIX] Skip SYSTEM messages - they're just collector status updates
        if (msg.channel === 'SYSTEM' || msg.channel?.includes('t.me/SYSTEM')) {
            console.log(`[TelegramIntel] ??¸ Skipping SYSTEM message ${msg.id}`);
            return;
        }

        // Only skip completely empty messages
        if (!msg.message || msg.message.trim().length === 0) {
            console.log(`[TelegramIntel] ? ï¸ Skipping empty message ${msg.id}`);
            return;
        }

        // Mark as processed BEFORE analysis to prevent duplicate processing
        this.processedMessages.add(msg.id);

        // Clean cache if too large
        if (this.processedMessages.size > this.MAX_PROCESSED_CACHE) {
            const toDelete = Array.from(this.processedMessages).slice(0, 500);
            toDelete.forEach(id => this.processedMessages.delete(id));
            console.log('[TelegramIntel] ?§¹ Cleaned message cache');
        }

        try {
            console.log(`[TelegramIntel] ?? Initiating AI analysis for message ${msg.id}...`);
            await this.analyzeContent({
                type: 'MESSAGE',
                title: `Telegram Signal (${msg.channel || 'Unknown'})`,
                description: msg.message.substring(0, 100),
                content: msg.message,
                originalUrl: null
            });
        } catch (error) {
            console.error(`[TelegramIntel] ??Analysis failed for message ${msg.id}:`, error);
        }
    }

    private async handleExpandedLink(urlData: any) {
        await this.analyzeContent({
            type: 'ARTICLE',
            title: urlData.title,
            description: urlData.title, // URL often has no separate desc in DB
            content: `[Title] ${urlData.title}\n[URL] ${urlData.url}`, // Content body might not be completely in DB yet depending on crawler schema
            originalUrl: urlData.url
        });
    }

    private async analyzeContent(data: { type: string, title: string; description: string; content: string; originalUrl: string | null }) {
        if (!this.signalHandler) {
            console.warn('[TelegramIntel] ? ï¸ No signal handler attached. Skipping analysis.');
            return;
        }

        console.log(`[TelegramIntel] ?§  Analyzing ${data.type}: ${data.title}`);

        const currentRegime = marketRegimeService.getLastStatus('KR')?.regime || 'SIDEWAYS';

        // Log analysis start
        if (supabase) {
            const { error } = await supabase.from('ai_thought_logs').insert({
                action: 'ANALYSIS',
                market: 'KR',
                ticker: 'PENDING',
                message: `[Intel] Analyzing: ${data.title}...`,
                confidence: 50,
                strategy: 'CONTENT_ANALYSIS',
                created_at: new Date().toISOString()
            } as any);

            if (error) {
                console.error('[TelegramIntel] ??DB INSERT failed (check RLS):', error);
                return; // Don't proceed if DB is inaccessible
            }
        }

        const prompt = `
        You are a highly sophisticated Financial Intelligence AI.
        Your task is to analyze the following market intelligence derived from a professional telegram channel.
        
        Current Market Regime: ${currentRegime}
        
        Type: ${data.type}
        Title: ${data.title}
        Content:
        ${data.content.substring(0, 3000)} ... (truncated)
        
        Determine if this information provides a SPECIFIC, ACTIONABLE trading signal or crucial market insight.
        
        Respond ONLY in valid JSON format:
        {
            "sentiment": "BULLISH" | "BEARISH" | "NEUTRAL" | "CAUTION",
            "urgency": "HIGH" | "MEDIUM" | "LOW",
            "confidenceScore": number (0-100),
            "relatedTickers": ["Array of tickers. KR: 6 digits (e.g., '005930'), US: 1-5 letters (e.g., 'TSLA'). DO NOT include dates or company names."],
            "actionable": boolean,
            "reasoning": "Concise explanation in Korean",
            "suggestedAction": "BUY" | "SELL" | "WATCH" | "AVOID"
        }
        `;

        try {
            const aiResponse = await generateContentWithRetry({
                model: 'gemini-1.5-flash',
                contents: prompt,
                // config: { responseMimeType: 'application/json' }
            });

            const rawText = aiResponse.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
            const analysis: IntelligenceImpact = JSON.parse(sanitizeJsonString(rawText));

            // FILTER: Remove distinctively invalid tickers (e.g., 4-digit numbers like JP stocks or years)
            if (analysis.relatedTickers && Array.isArray(analysis.relatedTickers)) {
                analysis.relatedTickers = analysis.relatedTickers.filter(t => {
                    // Allow KR (6 digits) and US (letters)
                    const isKR = /^\d{6}$/.test(t);
                    const isUS = /^[A-Za-z]{1,5}$/.test(t);
                    // Explicitly block 4-digit numbers (likely JP stocks or years)
                    const isJP = /^\d{4}$/.test(t);
                    return (isKR || isUS) && !isJP;
                });
            }

            console.log(`[TelegramIntel] AI Analysis Result: ${analysis.sentiment} (Score: ${analysis.confidenceScore})`);

            // [FIX] Log SUCCESS to ai_thought_logs
            if (supabase) {
                supabase.from('ai_thought_logs').insert({
                    action: 'ANALYSIS',
                    market: 'KR', // Default
                    ticker: analysis.relatedTickers?.[0] || 'GENERAL',
                    message: `[Intel] ë¶„ì„ ?„ë£Œ: ${data.title} -> ${analysis.sentiment} (${analysis.reasoning})`,
                    confidence: analysis.confidenceScore,
                    strategy: 'CONTENT_ANALYSIS',
                    details: {
                        source_title: data.title,
                        source_desc: data.description,
                        analysis_result: analysis
                    },
                    created_at: new Date().toISOString()
                } as any).then(({ error }) => {
                    if (error) console.error('[TelegramIntel] Failed to log thought:', error);
                });
            }

            if (analysis.actionable) {
                await this.signalHandler(analysis, data);
            }

        } catch (error: any) {
            console.error('[TelegramIntel] AI Analysis Failed:', error);
            // [FIX] Log FAILURE to ai_thought_logs
            if (supabase) {
                supabase.from('ai_thought_logs').insert({
                    action: 'ERROR',
                    market: 'KR',
                    ticker: 'ERROR',
                    message: `[Intel] AI ë¶„ì„ ?¤íŒ¨: ${error.message || 'Unknown Error'}`,
                    confidence: 0,
                    strategy: 'CONTENT_ANALYSIS',
                    created_at: new Date().toISOString()
                } as any).then(() => { });
            }
        }
    }
}

export const telegramIntelligenceService = new TelegramIntelligenceService();
