// services/telegramService.ts
import { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID } from '../config';

export interface TelegramMessage {
    title: string;
    body: string;
    urgency?: 'low' | 'medium' | 'high';
    emoji?: string;
}

class TelegramService {
    private baseUrl: string;
    private isEnabled: boolean;

    constructor() {
        this.baseUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
        this.isEnabled = !!(TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID);

        if (!this.isEnabled) {
            console.warn('[Telegram] Bot token or chat ID not configured. Notifications disabled.');
        } else {
            if (TELEGRAM_CHAT_ID === '1234567890') {
                console.warn('[Telegram] ⚠️ WARNING: Using placeholder Chat ID (1234567890). Messages will NOT be delivered. Please set TELEGRAM_CHAT_ID in .env');
            } else {
                console.log(`[Telegram] Service initialized. Chat ID: ${TELEGRAM_CHAT_ID.slice(0, 4)}...`);
            }
        }
    }

    /**
     * Send a message to Telegram
     */
    public async sendMessage(message: TelegramMessage): Promise<boolean> {
        if (!this.isEnabled) {
            console.log('[Telegram] Skipped (not configured):', message.title);
            return false;
        }

        try {
            const emoji = message.emoji || this.getEmojiByUrgency(message.urgency || 'medium');
            const text = `${emoji} *${message.title}*\n\n${message.body}`;

            const response = await fetch(`${this.baseUrl}/sendMessage`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    chat_id: TELEGRAM_CHAT_ID,
                    text,
                    parse_mode: 'Markdown',
                }),
            });

            if (!response.ok) {
                const error = await response.json();

                // Retry without Markdown if Bad Request (likely formatting error or too long)
                if (response.status === 400) {
                    console.warn(`[Telegram] ⚠️ Send failed. API Error: ${JSON.stringify(error)}`);
                    console.warn('[Telegram] Retrying as plain text...');

                    // Truncate if too long (Telegram limit 4096)
                    let safeText = message.body || '';
                    if (safeText.length > 3500) safeText = safeText.substring(0, 3500) + '... (Truncated)';

                    // Complete strip of special characters to ensure safety
                    safeText = safeText.replace(/[*_`\[\]()]/g, '');
                    const plainTitle = message.title.replace(/[*_`\[\]()]/g, '');

                    const plainText = `${plainTitle}\n\n${safeText}`;

                    const retryResponse = await fetch(`${this.baseUrl}/sendMessage`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            chat_id: TELEGRAM_CHAT_ID,
                            text: plainText
                            // parse_mode is OMITTED for generic text
                        }),
                    });
                    if (retryResponse.ok) {
                        console.log('[Telegram] Message sent (Plain Text fallback):', message.title);
                        return true;
                    } else {
                        const retryError = await retryResponse.json();
                        console.error(`[Telegram] ❌ Retry also failed. API Error: ${JSON.stringify(retryError)}`);
                    }
                }

                console.error('[Telegram] Send failed:', error);
                return false;
            }

            console.log('[Telegram] Message sent:', message.title);
            return true;
        } catch (error) {
            console.error('[Telegram] Error:', error);
            return false;
        }
    }

    /**
     * Escape special characters for Telegram Markdown (V1)
     */
    private escapeMarkdown(text: string): string {
        return text.replace(/[_*[\]]/g, '\\$&');
    }

    /**
     * Send Sniper Trigger alert
     */
    public async sendSniperTrigger(data: {
        ticker: string;
        stockName: string;
        type: string;
        score: number;
        currentPrice: number;
        changeRate: number;
        volume: number;
        details: string;
    }): Promise<boolean> {
        const emoji = data.type === 'VOLUME_SPIKE' ? '📢' : '🚀';
        const typeLabel = data.type === 'VOLUME_SPIKE' ? '거래량 급증' : '변동성 돌파';

        const message: TelegramMessage = {
            title: `Sniper Trigger: ${this.escapeMarkdown(data.stockName)}`,
            body: `*분류*: ${typeLabel}\n*종목*: ${this.escapeMarkdown(data.stockName)} (${this.escapeMarkdown(data.ticker)})\n*현재가*: ${data.currentPrice.toLocaleString()}원\n*등락률*: ${data.changeRate > 0 ? '+' : ''}${data.changeRate.toFixed(2)}%\n*거래량*: ${data.volume.toLocaleString()}주\n*스코어*: ${data.score}/100\n\n_${this.escapeMarkdown(data.details)}_`,
            urgency: data.score >= 90 ? 'high' : data.score >= 80 ? 'medium' : 'low',
            emoji,
        };

        return this.sendMessage(message);
    }

    /**
     * Send Market Regime change alert
     */
    public async sendMarketRegimeChange(data: {
        previousRegime: string;
        newRegime: string;
        reason: string;
        recommendation: string;
    }): Promise<boolean> {
        const message: TelegramMessage = {
            title: '시장 국면 변경 감지',
            body: `*이전*: ${this.escapeMarkdown(data.previousRegime)}\n*현재*: ${this.escapeMarkdown(data.newRegime)}\n\n*변경근거*:\n${this.escapeMarkdown(data.reason)}\n\n*추천전략*:\n${this.escapeMarkdown(data.recommendation)}`,
            urgency: 'high',
            emoji: '🔄',
        };

        return this.sendMessage(message);
    }

    /**
     * Send Shadow Trader trade report
     */
    public async sendTradeReport(data: {
        action: 'BUY' | 'SELL';
        ticker: string;
        stockName: string;
        quantity: number;
        price: number;
        amount: number;
        reason: string;
        confidence: number;
    }): Promise<boolean> {
        const emoji = data.action === 'BUY' ? '🔵' : '🔴';
        const actionLabel = data.action === 'BUY' ? '매수' : '매도';

        const message: TelegramMessage = {
            title: `Shadow Trader ${actionLabel}: ${this.escapeMarkdown(data.stockName)}`,
            body: `*종목*: ${this.escapeMarkdown(data.stockName)} (${this.escapeMarkdown(data.ticker)})\n*수량*: ${data.quantity.toLocaleString()}주\n*가격*: ${data.price.toLocaleString()}원\n*금액*: ${data.amount.toLocaleString()}원\n*AI 확신도*: ${data.confidence}%\n\n*근거*:\n${this.escapeMarkdown(data.reason)}`,
            urgency: 'medium',
            emoji,
        };

        return this.sendMessage(message);
    }

    /**
     * Send Closing Bet (종가배팅) Alert
     */
    public async sendClosingBetAlert(data: {
        stockName: string;
        ticker: string;
        currentPrice: string;
        score: number;
        rationale: string;
        entryPlan: { timing: string; strategy: string };
        exitScenarios: { gapUp: string; flat: string; gapDown: string };
    }): Promise<boolean> {
        const message: TelegramMessage = {
            title: `AI 종가배팅 포착: ${this.escapeMarkdown(data.stockName)}`,
            body: `*종목*: ${this.escapeMarkdown(data.stockName)} (${this.escapeMarkdown(data.ticker)})\n*현재가*: ${this.escapeMarkdown(data.currentPrice)}\n*AI 점수*: ${data.score}점\n\n*선정 이유*:\n${this.escapeMarkdown(data.rationale)}\n\n*진입 전략*:\n${this.escapeMarkdown(data.entryPlan.strategy)}\n\n*대응 전략 (익일)*:\n상승 출발시: ${this.escapeMarkdown(data.exitScenarios.gapUp)}\n보합/하락: ${this.escapeMarkdown(data.exitScenarios.flat)}\n급락 출발시: ${this.escapeMarkdown(data.exitScenarios.gapDown)}`,
            urgency: 'high',
            emoji: '🌅',
        };

        return this.sendMessage(message);
    }

    /**
     * Send Morning Briefing (Oracle Logic Chains)
     */
    /**
     * Send Morning Briefing (Oracle Logic Chains)
     */
    public async sendMorningBriefing(market: string, chains: any[], reportMarkdown?: string): Promise<boolean> {
        const flag = market === 'KR' ? '🇰🇷' : '🇺🇸';

        let body = '';
        if (reportMarkdown) {
            // Use the S-Class Report directly
            body = reportMarkdown;
        } else {
            // Fallback for legacy calls
            body = `*${flag} ${market} 모닝 오라클 브리핑*\n\n`;
            chains.forEach((chain, index) => {
                body += `*${index + 1}. ${this.escapeMarkdown(chain.primaryKeyword || '')}*\n`;
                body += `논리: ${this.escapeMarkdown(chain.cause || '')} ➡️ ${this.escapeMarkdown(chain.effect || '')}\n`;
                body += `수혜: *${this.escapeMarkdown(chain.beneficiarySector || '')}*\n`;
                body += `관련주: \`${(chain.relatedTickers || []).map((t: string) => this.escapeMarkdown(t)).join(', ')}\`\n`;
                body += `강도: ${chain.logicStrength}/100 | 정보격차: ${chain.alphaGap}/100\n\n`;
            });
            body += `_AI가 분석한 시장의 인과관계들입니다._`;
        }

        const message: TelegramMessage = {
            title: `${flag} [Target Radar] 시장 정밀 브리핑`,
            body: body,
            urgency: 'medium',
            emoji: '📡',
        };

        return this.sendMessage(message);
    }

    /**
     * Get emoji based on urgency
     */
    private getEmojiByUrgency(urgency: 'low' | 'medium' | 'high'): string {
        switch (urgency) {
            case 'high':
                return '🚨';
            case 'medium':
                return '⚠️';
            case 'low':
                return 'ℹ️';
            default:
                return '📬';
        }
    }

    /**
     * Check if telegram is enabled
     */
    public isConfigured(): boolean {
        return this.isEnabled;
    }
}

export const telegramService = new TelegramService();
