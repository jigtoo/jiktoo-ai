import { v4 as uuidv4 } from 'uuid';
import { supabase } from './supabaseClient';
import type { MarketTarget } from '../types';
import { strategyCommander } from './gemini/StrategyCommander';
import { marketInfo } from '../marketInfo';

export interface VirtualPosition {
    ticker: string;
    stockName: string;
    avgPrice: number;
    quantity: number;
    currentPrice: number;
    profitRate: number;
    profitAmount: number;
    stopLossPrice?: number; // Dynamic Stop Loss
    maxPriceSinceEntry?: number; // For Trailing Stop
    pyramidCount?: number; // For Pyramiding limit
    strategy: 'DAY' | 'SWING' | 'LONG'; // Strategy Tag
    entryDate?: string;
}

export interface VirtualTradeLog {
    id: string;
    timestamp: number;
    type: 'BUY' | 'SELL';
    ticker: string;
    stockName: string;
    price: number;
    quantity: number;
    amount: number;
    fee: number;
    balanceAfter: number;
    reason?: string;
    profitLoss?: number; // Added for Kelly Criterion
}

export interface VirtualAccount {
    cash: number;
    totalAsset: number;
    positions: VirtualPosition[];
    tradeLogs: VirtualTradeLog[];
    initialCapital: number;
}

const STORAGE_KEY = 'jiktoo_shadow_account_v2'; // [RESET] Force fresh start
const FEE_RATE = 0.00015; // 0.015% (업계 최저 수준 가정)
const SLIPPAGE_RATE = 0.001; // 0.1% (현실적 슬리피지)
// [RESET] New Initial Capital (User Request)
const DEFAULT_KR_CAPITAL = 50000000; // 5,000만 원
const DEFAULT_US_CAPITAL = 30000;    // 3만 달러

// [REAL TRADING CONFIG]
const IS_REAL_TRADING_ENABLED = false; // Set to false to prevent KIS Sync from wiping virtual positions
const KIS_ACCOUNT_NUM = '46783393'; // User provided account
const KIS_PROXY_URL = 'http://127.0.0.1:8080';

class VirtualTradingService {
    private accounts: { [key in MarketTarget]: VirtualAccount };
    private marketTarget: MarketTarget = 'KR'; // Track current market for currency display
    private tradePairs = new Map<string, string>(); // [Fix] Track active trade IDs for pairing

    constructor() {
        this.accounts = {
            KR: this.getDefaultAccount('KR'),
            US: this.getDefaultAccount('US')
        };
        this.loadAccounts(); // Load from storage
        this.ensureWarChestLines(); // [Project AWS] Inject capital if needed
        this.syncWithDB(); // Start background sync
    }

    /**
     * [Project AWS] Ensure we have enough ammo for Hell Week
     */
    private ensureWarChestLines() {
        // 1. Check and Inject KR Capital
        const krCash = this.accounts.KR?.cash ?? 0; // [FIX] Null-safe access
        if (krCash < DEFAULT_KR_CAPITAL) {
            console.log(`[WarChest] 🇰🇷 Injecting capital for Hell Week: ${krCash.toLocaleString()} -> ${DEFAULT_KR_CAPITAL.toLocaleString()} KRW`);
            this.accounts.KR.cash = DEFAULT_KR_CAPITAL;
            this.accounts.KR.totalAsset = this.accounts.KR.cash;
            this.accounts.KR.initialCapital = DEFAULT_KR_CAPITAL;
            this.saveAccount();
        } else if ((this.accounts.KR?.initialCapital ?? 0) < DEFAULT_KR_CAPITAL) {
            // [FIX] Retroactively correct initialCapital if cash was already injected but baseline not updated
            console.log('[WarChest] 🇰🇷 Fixing initialCapital mismatch for accurate ROI.');
            this.accounts.KR.initialCapital = DEFAULT_KR_CAPITAL;
            this.saveAccount();
        }

        // 2. Check and Inject US Capital
        const usCash = this.accounts.US?.cash ?? 0; // [FIX] Null-safe access
        if (usCash < DEFAULT_US_CAPITAL) {
            console.log(`[WarChest] 🇺🇸 Injecting capital for Hell Week: $${usCash.toLocaleString()} -> $${DEFAULT_US_CAPITAL.toLocaleString()}`);
            this.accounts.US.cash = DEFAULT_US_CAPITAL;
            this.accounts.US.totalAsset = this.accounts.US.cash;
            this.accounts.US.initialCapital = DEFAULT_US_CAPITAL;
            this.saveAccount();
        } else if ((this.accounts.US?.initialCapital ?? 0) < DEFAULT_US_CAPITAL) {
            // [FIX] Retroactively correct initialCapital
            console.log('[WarChest] 🇺🇸 Fixing initialCapital mismatch for accurate ROI.');
            this.accounts.US.initialCapital = DEFAULT_US_CAPITAL;
            this.saveAccount();
        }
    }

    public setMarketTarget(market: MarketTarget) {
        this.marketTarget = market;
    }

    public getMarketTarget(): MarketTarget {
        return this.marketTarget;
    }

    public formatCurrency(amount: number): string {
        if (this.marketTarget === 'US') {
            return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        } else {
            return `${Math.floor(amount).toLocaleString()}원`;
        }
    }

    private getDefaultAccount(market: MarketTarget): VirtualAccount {
        const isUS = market === 'US';
        const initialCapital = isUS ? DEFAULT_US_CAPITAL : DEFAULT_KR_CAPITAL;

        return {
            cash: initialCapital,
            totalAsset: initialCapital,
            positions: [],
            tradeLogs: [],
            initialCapital: initialCapital
        };
    }

    private async syncWithDB() {
        if (!supabase) return;

        try {
            // Load both portfolios
            const markets: MarketTarget[] = ['KR', 'US'];

            for (const market of markets) {
                const { data } = await (supabase as any)
                    .from('portfolios')
                    .select('*')
                    .eq('owner', `me_${market}`) // Use distinct owner keys for DB
                    .maybeSingle();

                if (data && data.meta) {
                    const cash = data.meta.cash ?? (market === 'US' ? DEFAULT_US_CAPITAL : DEFAULT_KR_CAPITAL);
                    const totalAsset = data.meta.totalAsset ?? cash;
                    const initialCapital = data.meta.initialCapital ?? cash;

                    this.accounts[market] = {
                        cash,
                        totalAsset,
                        initialCapital,
                        positions: Array.isArray(data.positions) ? data.positions : [],
                        tradeLogs: []
                    };
                }
            }
            console.log(`[VirtualTrading] Synced accounts. KR Cash: ${this.formatCurrency(this.accounts.KR.cash)}, US Cash: ${this.formatCurrency(this.accounts.US.cash)}`);

        } catch (e) {
            console.error('[VirtualTrading] Sync failed:', e);
        }
    }

    // services/VirtualTradingService.ts (Updated for Localization & UI Sync)

    // Helper to resolve stock name
    // import { marketInfo } from '../marketInfo'; // Moved to top

    // ... (Existing Imports)

    private async saveAccountToDB() {
        if (!supabase) return;

        const currentAccount = this.getAccount(); // Save CURRENT account
        const meta = {
            cash: currentAccount.cash,
            totalAsset: currentAccount.totalAsset,
            initialCapital: currentAccount.initialCapital
        };

        // 1. Save to 'portfolios' (Original Logic - Backend)
        await (supabase as any).from('portfolios').upsert({
            owner: `me_${this.marketTarget}`,
            positions: currentAccount.positions as any,
            meta: meta as any,
            updated_at: new Date().toISOString()
        });

        // 2. [UI SYNC] Sync to 'ai_trader_portfolios' (Frontend Visibility)
        // [Refactor] Split by Strategy as per User Request (Day/Swing/Long)

        const strategyMap: Record<string, string> = {
            'DAY': 'aggressive',   // Day Trading -> Aggressive Account
            'SWING': 'balanced',   // Swing -> Balanced Account
            'LONG': 'stable'       // Long-term -> Stable Account
        };

        const activeStrategies = ['DAY', 'SWING', 'LONG'];

        for (const strat of activeStrategies) {
            const targetStyle = strategyMap[strat]; // aggressive, balanced, stable

            // Filter positions for this strategy
            // If strategy is undefined, default to SWING (Balanced)
            const stratPositions = currentAccount.positions.filter(p => (p.strategy || 'SWING') === strat);

            if (stratPositions.length === 0 && strat !== 'SWING') continue; // Skip empty accounts except default

            // Calculate approximate value for this sub-account
            const subValue = stratPositions.reduce((sum, p) => sum + (p.currentPrice * p.quantity), 0);

            // Proportional Cash Allocation (Simplified: Split cash evenly or keep central? 
            // For UI, we'll show "Shared Cash" in Balanced, others 0 for now to avoid double counting)
            const subCash = strat === 'SWING' ? currentAccount.cash : 0;
            const subInitial = strat === 'SWING' ? currentAccount.initialCapital : 0;

            const uiPortfolioData: any = {
                initialCapital: subInitial, // Only show capital in main account logic
                cash: subCash,
                holdings: stratPositions.map(p => ({
                    id: crypto.randomUUID(),
                    ticker: p.ticker,
                    stockName: p.stockName,
                    entryPrice: p.avgPrice,
                    quantity: p.quantity,
                    purchaseTimestamp: p.entryDate
                })),
                currentValue: subValue + subCash,
                profitOrLoss: (subValue + subCash) - subInitial,
                profitOrLossPercent: subInitial > 0 ? (((subValue + subCash) - subInitial) / subInitial) * 100 : 0,
                investmentStyle: targetStyle
            };

            await (supabase as any).from('ai_trader_portfolios').upsert({
                market: this.marketTarget,
                style: targetStyle,
                data: uiPortfolioData,
                updated_at: new Date().toISOString()
            }, { onConflict: 'market, style' });
        }
    }

    // ... (Existing methods)

    private async executeSell(position: any, price: number, quantity: number, reason: string) {
        const success = virtualTradingService.sell(position.ticker, price, quantity, reason);
        if (success) {
            const amount = price * quantity;

            // [Localization] "SELL" -> "매도"
            await telegramService.sendTradeReport({
                action: '매도', // Localized
                ticker: position.ticker,
                stockName: position.stockName,
                quantity: quantity,
                price: price,
                amount: amount,
                reason: reason,
                confidence: 100
            });
        }
    }

    // In buy() method (needs to be updated manually if not in this chunk, 
    // but executeSell is here in AutoPilotService context... wait. 
    // The previous view_file was AutoPilotService ? No, VirtualTradingService. 
    // Ah, executeSell is in AutoPilotService. VirtualTradingService has buy/sell methods.
    // Let's verify which file I am editing. I am replacing content in VirtualTradingService? 
    // NO, the target file for replace must be specific.
    // The previous tool call viewed `VirtualTradingService.ts`. 
    // Wait, the `executeSell` snippet above looks like it belongs to `AutoPilotService.ts`. 
    // `VirtualTradingService` has `buy()` and `sell()` methods but they don't call `telegramService` directly usually?
    // Let's re-read `VirtualTradingService`.
    // Line 870 in `AutoPilotService` calls `telegramService`.
    // `VirtualTradingService` seems to handle the DB logic.

    // This tool call is for `VirtualTradingService.ts`?
    // The prompt says "Update VirtualTradingService.ts: strict sync".
    // I will stick to `VirtualTradingService.ts` for the DB sync part.
    // And I will Update `AutoPilotService.ts` separately for the Localization.

    // Let's refine the replacement for VirtualTradingService.ts ONLY.


    private loadAccounts() {
        if (typeof localStorage !== 'undefined') {
            const savedKR = localStorage.getItem(`${STORAGE_KEY}_KR`);
            const savedUS = localStorage.getItem(`${STORAGE_KEY}_US`);

            if (savedKR) this.accounts.KR = JSON.parse(savedKR);
            if (savedUS) this.accounts.US = JSON.parse(savedUS);
        }
    }

    private saveAccount() {
        const currentAccount = this.getAccount();

        // 자산 재계산
        let positionValue = 0;
        currentAccount.positions.forEach(p => {
            positionValue += p.currentPrice * p.quantity;
        });
        currentAccount.totalAsset = currentAccount.cash + positionValue;

        // 1. Save to LocalStorage
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem(`${STORAGE_KEY}_${this.marketTarget}`, JSON.stringify(currentAccount));
        }

        // 2. Save to DB (Background)
        this.saveAccountToDB().catch(err => console.error('[VirtualTrading] DB Save Error:', err));
    }

    public getAccount(): VirtualAccount {
        return this.accounts[this.marketTarget];
    }

    public getAllAccounts() {
        return this.accounts;
    }

    public resetAccount() {
        localStorage.removeItem(`${STORAGE_KEY}_${this.marketTarget}`);
        this.accounts[this.marketTarget] = this.getDefaultAccount(this.marketTarget);
        this.saveAccount(); // Save reset state
    }

    /**
     * 현재가 업데이트 (평가금액 갱신용)
     */
    public updatePrices(priceMap: { [ticker: string]: number }) {
        const account = this.getAccount();
        let updated = false;
        account.positions.forEach(p => {
            if (priceMap[p.ticker]) {
                p.currentPrice = priceMap[p.ticker];

                // Update Max Price for Trailing Stop
                if (!p.maxPriceSinceEntry || p.currentPrice > p.maxPriceSinceEntry) {
                    p.maxPriceSinceEntry = p.currentPrice;
                }

                const valuation = p.currentPrice * p.quantity;
                const costBasis = p.avgPrice * p.quantity;
                p.profitAmount = valuation - costBasis;
                p.profitRate = (p.profitAmount / costBasis) * 100;
                updated = true;
            }
        });

        if (updated) {
            this.saveAccount();
        }
        return true;
    }

    /**
     * Update Stop Loss Price (for Trailing Stop)
     */
    public updateStopLoss(ticker: string, newStopLoss: number) {
        const account = this.getAccount();
        const position = account.positions.find(p => p.ticker === ticker);
        if (position) {
            position.stopLossPrice = newStopLoss;
            this.saveAccount();
            console.log(`[VirtualTrading] 🛡️ Stop Loss Updated for ${position.stockName}: ${newStopLoss.toLocaleString()} KRW`);
        }
    }

    /**
     * 가상 매수 실행
     */
    public async buy(
        ticker: string,
        stockName: string,
        price: number,
        quantity: number,
        reason: string = '',
        stopLossPrice?: number,
        strategy: 'DAY' | 'SWING' | 'LONG' = 'SWING',
        orderType: string = '00' // '00': Limit, '01': Market
    ): Promise<boolean> {
        // ⚠️ CRITICAL VALIDATION: Prevent trading with invalid price or quantity
        // ⚠️ CRITICAL VALIDATION: If price is missing, try to fetch it LAST RESORT
        if (!price || price <= 0 || !isFinite(price)) {
            console.warn(`[VirtualTrading] ⚠️ Invalid price (${price}) detected for ${stockName} (${ticker}). Attempting emergency fetch...`);
            try {
                // Try to fetch from KIS Proxy using /rt-snapshot
                const mk = this.marketTarget; // 'KR' or 'US'
                const res = await fetch(`${KIS_PROXY_URL}/rt-snapshot?ticker=${ticker}&market=${mk}`);
                const data = await res.json();

                let fetchedPrice = 0;
                // /rt-snapshot returns { quote: { stck_prpr: ... } } for both markets
                if (data.quote && data.quote.stck_prpr) {
                    fetchedPrice = parseFloat(data.quote.stck_prpr);
                }

                if (fetchedPrice > 0) {
                    console.log(`[VirtualTrading] ✅ Emergency price recovered: ${fetchedPrice}`);
                    price = fetchedPrice;
                } else {
                    throw new Error("Fetch returned 0 or invalid data");
                }
            } catch (e) {
                console.error(`[VirtualTrading] ❌ Emergency fetch failed for ${ticker}. ABORTING TRADE.`);
                return false;
            }
        }

        if (!price || price <= 0 || !isFinite(price)) return false; // Double check

        if (!quantity || quantity <= 0 || !isFinite(quantity)) {
            console.error(`[VirtualTrading] ❌ INVALID QUANTITY for ${stockName} (${ticker}): ${quantity}. ABORTING TRADE.`);
            return false;
        }

        // 슬리피지 적용 (매수가는 조금 더 비싸게 체결된다고 가정)
        const executionPrice = price * (1 + SLIPPAGE_RATE);
        const amount = executionPrice * quantity;
        const fee = amount * FEE_RATE;
        const totalCost = amount + fee;

        if (this.getAccount().cash < totalCost) {
            console.warn(`[VirtualTrading] Insufficient cash. Need: ${totalCost}, Have: ${this.getAccount().cash}`);
            return false;
        }

        // 현금 차감
        this.getAccount().cash -= totalCost;

        // 포지션 업데이트
        const existing = this.getAccount().positions.find(p => p.ticker === ticker && p.strategy === strategy);

        if (existing) {
            // 물타기/불타기 (Average Cost)
            const totalQty = existing.quantity + quantity;
            const totalAmt = (existing.avgPrice * existing.quantity) + (executionPrice * quantity);
            existing.avgPrice = totalAmt / totalQty;
            existing.quantity = totalQty;
            existing.currentPrice = price;

            // Pyramiding Logic updates
            if (existing.pyramidCount === undefined) existing.pyramidCount = 0;
            existing.pyramidCount += 1;

            // Update stop loss if provided
            if (stopLossPrice) existing.stopLossPrice = stopLossPrice;
        } else {
            // 신규 진입
            this.getAccount().positions.push({
                ticker,
                stockName,
                avgPrice: executionPrice, // 체결가 기준 평단
                quantity,
                currentPrice: price,
                profitRate: 0,
                profitAmount: 0,
                stopLossPrice,
                maxPriceSinceEntry: price,
                pyramidCount: 0,
                strategy,
                entryDate: new Date().toISOString()
            });
        }

        // 로그 기록
        this.getAccount().tradeLogs.unshift({
            id: uuidv4(),
            timestamp: Date.now(),
            type: 'BUY',
            ticker,
            stockName,
            price: executionPrice,
            quantity,
            amount,
            fee,
            balanceAfter: this.getAccount().cash,
            reason: `[${strategy}] ${reason}`
        });

        this.saveAccount();
        console.log(`[VirtualTrading] BUY (${strategy}) Executed: ${stockName} (${ticker}) ${quantity} shares @ ${executionPrice.toLocaleString()}원`);

        // Log to Supabase for autonomous learning
        this.logTradeToSupabase({
            action: 'BUY',
            ticker,
            stock_name: stockName,
            quantity,
            price: executionPrice,
            amount: totalCost,
            reason: `[${strategy}] ${reason}`,
            ai_confidence: null, // Will be filled by AutoPilot if available
            trigger_type: null,
            market_regime: null,
            outcome: 'ONGOING',
            trade_pair_id: uuidv4(),
            context: { strategy }
        }).then(tradeId => {
            if (tradeId) {
                this.tradePairs.set(ticker, tradeId);
            }
        });

        // [REAL TRADING] Send Order to KIS Proxy
        if (IS_REAL_TRADING_ENABLED) {
            this._sendOrderToKisProxy('order_buy', ticker, quantity, executionPrice, orderType);
        }

        return true;
    }

    /**
     * 가상 매도 실행
     */
    public sell(ticker: string, price: number, quantity: number, reason?: string): boolean {
        const account = this.getAccount();
        const positionIndex = account.positions.findIndex(p => p.ticker === ticker);
        if (positionIndex === -1) return false;

        const position = account.positions[positionIndex];
        if (position.quantity < quantity) return false;

        // 슬리피지 적용 (매도가는 조금 더 싸게 체결된다고 가정)
        const executionPrice = price * (1 - SLIPPAGE_RATE);
        const amount = executionPrice * quantity;
        const fee = amount * FEE_RATE; // 매도 시에도 수수료 발생
        const netProceeds = amount - fee;

        // Calculate profit/loss BEFORE removing position
        const costBasis = position.avgPrice * quantity;
        const profitLoss = netProceeds - costBasis;
        const profitLossRate = (profitLoss / costBasis) * 100;

        // 현금 입금
        account.cash += netProceeds;

        // 포지션 업데이트
        position.quantity -= quantity;
        if (position.quantity <= 0) {
            account.positions.splice(positionIndex, 1);
        }

        // 로그 기록
        account.tradeLogs.unshift({
            id: uuidv4(),
            timestamp: Date.now(),
            type: 'SELL',
            ticker,
            stockName: position.stockName,
            price: executionPrice,
            quantity,
            amount,
            fee,
            balanceAfter: account.cash,
            reason,
            profitLoss // Store P/L for Kelly Criterion
        });

        this.saveAccount();
        console.log(`[VirtualTrading] SELL ${position.stockName} (${ticker}): ${quantity}주 @ ${executionPrice.toLocaleString()}원 | P/L: ${profitLoss.toLocaleString()}원 (${profitLossRate.toFixed(2)}%)`);

        // Log to Supabase
        const buyTradeId = this.tradePairs.get(ticker);
        const outcome = profitLoss > 0 ? 'WIN' : profitLoss < 0 ? 'LOSS' : 'BREAKEVEN';

        this.logTradeToSupabase({
            action: 'SELL',
            ticker,
            stock_name: position.stockName,
            quantity,
            price: executionPrice,
            amount: netProceeds,
            reason,
            ai_confidence: null,
            trigger_type: reason?.includes('Take Profit') ? 'TAKE_PROFIT' : reason?.includes('Stop Loss') ? 'STOP_LOSS' : null,
            market_regime: null,
            outcome,
            profit_loss: profitLoss,
            profit_loss_rate: profitLossRate,
            related_buy_id: buyTradeId || null,
            trade_pair_id: buyTradeId
        });

        // Clean up trade pair
        if (position.quantity <= 0) {
            this.tradePairs.delete(ticker);
        }

        // [REAL TRADING] Send Order to KIS Proxy
        if (IS_REAL_TRADING_ENABLED) {
            this._sendOrderToKisProxy('order_sell', ticker, quantity, executionPrice);
        }

        // 3. Log Trade Journal (AI Post-Mortem)
        this.logTradeJournal({
            ticker,
            stockName: position.stockName,
            entryDate: position.entryDate || new Date().toISOString(),
            exitDate: new Date().toISOString(),
            entryPrice: position.avgPrice,
            exitPrice: executionPrice,
            pnlPercent: profitLossRate,
            pnlAmount: profitLoss,
            marketCondition: 'UNKNOWN', // Ideally fetch from MarketRegimeService
            strategyUsed: position.strategy || 'MANUAL',
            entryReason: 'See trade logs', // Ideally fetch from buy log
            outcome: outcome
        });

        return true;
    }

    /**
     * Send Order to KIS Proxy (Real/Virtual Execution)
     */
    private async _sendOrderToKisProxy(type: 'order_buy' | 'order_sell', ticker: string, quantity: number, price: number, orderType: string = '00') {
        try {
            const market = this.marketTarget;
            console.log(`[RealTrading] Sending ${type} order for ${ticker} (${quantity} shares @ ${price}) [${market}] Type: ${orderType}`);

            // KIS API requires 8-digit account + 2-digit product code
            const CANO = KIS_ACCOUNT_NUM.substring(0, 8);
            const ACNT_PRDT_CD = '01';

            const payload: any = {
                CANO,
                ACNT_PRDT_CD,
                PDNO: ticker, // Stock Code
                ORD_DVSN: orderType, // '00': Limit, '01': Market
                ORD_QTY: quantity.toString(),
                ORD_UNPR: orderType === '01' ? '0' : Math.floor(price).toString(), // Market price -> 0
                type: type === 'order_buy' ? 'buy' : 'sell',
                market: market // 'KR' or 'US'
            };

            if (market === 'US') {
                // 미국 주식은 거래소 정보가 필요함.
                // 현재 시스템에서 거래소 정보를 별도로 관리하지 않으므로,
                // 일단 NAS(나스닥)를 기본으로 하고, 필요 시 확장.
                // (KIS Proxy에서 NAS -> NASD 등으로 변환 처리함)
                payload.exchange = 'NAS';

                // 미국 주식은 가격이 소수점일 수 있음 (달러)
                payload.ORD_UNPR = orderType === '01' ? '0' : price.toString();
            }

            const response = await fetch(`${KIS_PROXY_URL}/order`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error(`[RealTrading] Order Failed: ${errorData.msg1 || response.statusText}`);
            } else {
                const data = await response.json();
                console.log(`[RealTrading] Order Success: ${data.msg1} (Order No: ${data.output?.ODNO})`);
            }

        } catch (error) {
            console.error('[RealTrading] Failed to send order to KIS Proxy:', error);
        }
    }

    /**
     * 🧠 AI Trade Journaling (Post-Mortem)
     * Asks Gemini to analyze the completed trade and saves the lesson to DB.
     */
    private async logTradeJournal(tradeData: any) {
        if (!supabase) {
            console.warn('[VirtualTrading] Supabase not available, skipping trade journal');
            return;
        }

        try {
            console.log(`[VirtualTrading] 🧠 Generating AI Trade Journal for ${tradeData.stockName}...`);

            // AI Analysis ENABLED - Full functionality per user request
            const ENABLE_AI_ANALYSIS = true; // ✅ Full AI analysis enabled

            let analysis;
            if (ENABLE_AI_ANALYSIS) {
                analysis = await strategyCommander.analyzeTrade(tradeData);
            } else {
                // Simple fallback without AI (only if ENABLE_AI_ANALYSIS = false)
                const profitPercent = ((tradeData.exitPrice - tradeData.entryPrice) / tradeData.entryPrice) * 100;
                analysis = {
                    analysis: `${tradeData.strategyUsed} - ${profitPercent > 0 ? 'Profit' : 'Loss'} ${Math.abs(profitPercent).toFixed(2)}%`,
                    lesson: `${profitPercent > 0 ? 'Win' : 'Loss'} - ${tradeData.stockName}`,
                    score: profitPercent > 0 ? 70 : 30
                };
            }
            const { error } = await supabase
                .from('ai_trade_journals')
                .insert({
                    ticker: tradeData.ticker,
                    stock_name: tradeData.stockName,
                    entry_date: tradeData.entryDate,
                    exit_date: tradeData.exitDate,
                    entry_price: tradeData.entryPrice,
                    exit_price: tradeData.exitPrice,
                    pnl_percent: tradeData.pnlPercent,
                    pnl_amount: tradeData.pnlAmount,
                    market_condition: tradeData.marketCondition,
                    strategy_used: tradeData.strategyUsed,
                    entry_reason: tradeData.entryReason,
                    outcome_analysis: analysis.analysis,
                    lessons_learned: analysis.lesson,
                    score: analysis.score,
                    user_id: (await supabase.auth.getUser()).data.user?.id
                } as any);

            if (error) throw error;
            console.log(`[VirtualTrading] ✅ AI Trade Journal Saved! Score: ${analysis.score} `);

        } catch (e) {
            console.error('[VirtualTrading] Failed to log trade journal:', e);
        }
    }

    /**
     * Log trade to Supabase for autonomous learning
     */
    private async logTradeToSupabase(trade: any): Promise<string | null> {
        if (!supabase) {
            console.warn('[VirtualTrading] Supabase not available, skipping trade log');
            return null;
        }

        try {
            const { data, error } = await supabase
                .from('shadow_trader_trades')
                .insert({
                    ticker: trade.ticker,
                    stock_name: trade.stock_name,
                    action: trade.action,
                    quantity: trade.quantity,
                    price: trade.price,
                    amount: trade.amount,
                    reason: trade.reason,
                    ai_confidence: trade.ai_confidence,
                    trigger_type: trade.trigger_type,
                    trigger_score: trade.trigger_score,
                    market_regime: trade.market_regime,
                    market_regime_score: trade.market_regime_score,
                    outcome: trade.outcome,
                    profit_loss: trade.profit_loss || 0,
                    profit_loss_rate: trade.profit_loss_rate || 0,
                    holding_days: trade.holding_days || 0,
                    trade_pair_id: trade.trade_pair_id,
                    related_buy_id: trade.related_buy_id,
                    related_sell_id: trade.related_sell_id,
                    context: trade.context || {}
                } as any)
                .select('id')
                .single();

            if (error) {
                console.error('[VirtualTradingService] Supabase log error:', error);
                return null;
            }

            const tradeId = (data as any)?.id;
            console.log(`[VirtualTradingService] Logged ${trade.action} to Supabase: `, tradeId);
            return tradeId;
        } catch (error) {
            console.error('[VirtualTradingService] Failed to log to Supabase:', error);
            return null;
        }
    }

    /**
     * [Kelly Criterion Logic] Calculate recent performance metrics
     * Returns Win Rate (p) and Payoff Ratio (b) for Kelly Formula.
     */
    public getRecentPerformance(): { winRate: number; payoffRatio: number; totalTrades: number } {
        const sellLogs = this.getAccount().tradeLogs.filter(l => l.type === 'SELL' && l.profitLoss !== undefined);

        if (sellLogs.length < 5) {
            // Not enough data, return conservative defaults
            // Win Rate 0.4, Payoff 1.5 (Slightly favorable but cautious)
            return { winRate: 0.4, payoffRatio: 1.5, totalTrades: sellLogs.length };
        }

        const wins = sellLogs.filter(l => (l.profitLoss || 0) > 0);
        const losses = sellLogs.filter(l => (l.profitLoss || 0) <= 0);

        const winRate = wins.length / sellLogs.length;

        const avgWin = wins.length > 0
            ? wins.reduce((sum, l) => sum + (l.profitLoss || 0), 0) / wins.length
            : 0;

        const avgLoss = losses.length > 0
            ? Math.abs(losses.reduce((sum, l) => sum + (l.profitLoss || 0), 0) / losses.length)
            : 1; // Avoid division by zero

        const payoffRatio = avgWin / avgLoss;

        return {
            winRate,
            payoffRatio: isNaN(payoffRatio) ? 1.5 : payoffRatio,
            totalTrades: sellLogs.length
        };
    }

    /**
     * Sync internal state with actual KIS Account
     */
    public async syncWithKisAccount() {
        if (!IS_REAL_TRADING_ENABLED) return;

        // [US Market Handling]
        if (this.marketTarget === 'US') {
            const confirmUS = confirm(`🇺🇸 미국 주식(Paper Trading)을 시작하시겠습니까 ?\n가상 자본금 $${DEFAULT_US_CAPITAL.toLocaleString()}가 설정됩니다.`);
            if (confirmUS) {
                const account = this.getAccount();
                account.cash = DEFAULT_US_CAPITAL;
                account.totalAsset = DEFAULT_US_CAPITAL;
                account.initialCapital = DEFAULT_US_CAPITAL;
                account.positions = []; // Reset positions for US context
                console.log(`[VirtualTrading] Applied US Virtual Capital: $${DEFAULT_US_CAPITAL} `);
                this.saveAccountToDB();
            }
            return;
        }

        try {
            console.log('[VirtualTrading] Syncing with KIS Account...');
            const CANO = KIS_ACCOUNT_NUM.substring(0, 8);
            const ACNT_PRDT_CD = '01';

            const response = await fetch(`${KIS_PROXY_URL}/balance?CANO=${CANO}&ACNT_PRDT_CD=${ACNT_PRDT_CD}&market=${this.marketTarget}`);
            const data = await response.json();

            if (data.rt_cd === '0') {
                // 1. Update Cash & Assets
                // output2[0].dnca_tot_amt (예수금총액) -> cash
                // output2[0].tot_evlu_amt (총평가금액) -> totalAsset (approx)
                const summary = data.output2[0];
                console.log('[VirtualTrading] Balance Summary:', summary);

                if (summary) {
                    let cash = parseInt(summary.dnca_tot_amt);
                    let assets = parseInt(summary.tot_evlu_amt);

                    // [FALLBACK] 잔고가 1원(오류)이거나 1000원 이하(잔고 없음)인 경우 가상 자본금 적용
                    if (cash <= 1000) {
                        const confirmVirtual = confirm(`⚠️ 실전 계좌(원화) 잔고가 없거나 조회가 원활하지 않습니다.\n(조회된 예수금: ${cash}원)\n\n가상 자본금 ${DEFAULT_KR_CAPITAL.toLocaleString()}원으로 'Paper Trading'을 시작하시겠습니까?`);
                        if (confirmVirtual) {
                            cash = DEFAULT_KR_CAPITAL;
                            assets = DEFAULT_KR_CAPITAL;
                            console.log(`[VirtualTrading] Applied Virtual Capital: ${DEFAULT_KR_CAPITAL.toLocaleString()} KRW`);
                        }
                    }

                    this.getAccount().cash = cash;
                    this.getAccount().totalAsset = assets > 0 ? assets : cash;
                }

                // 2. Update Positions
                // output1 array contains holdings
                const newPositions: VirtualPosition[] = [];
                if (data.output1) {
                    data.output1.forEach((item: any) => {
                        // pdno: 종목코드, prdt_name: 종목명, hldg_qty: 보유수량, pchs_avg_pric: 매입평균, prpr: 현재가
                        // evlu_pfls_amt: 평가손익, evlu_pfls_rt: 수익률
                        const qty = parseInt(item.hldg_qty);
                        if (qty > 0) {
                            // 기존 포지션에서 전략 정보 유지 시도
                            const existing = this.getAccount().positions.find(p => p.ticker === item.pdno);

                            newPositions.push({
                                ticker: item.pdno,
                                stockName: item.prdt_name,
                                avgPrice: parseFloat(item.pchs_avg_pric),
                                quantity: qty,
                                currentPrice: parseFloat(item.prpr),
                                profitRate: parseFloat(item.evlu_pfls_rt),
                                profitAmount: parseInt(item.evlu_pfls_amt),
                                strategy: existing?.strategy || 'SWING', // Default to SWING if new
                                entryDate: existing?.entryDate || new Date().toISOString()
                            });
                        }
                    });
                }

                this.getAccount().positions = newPositions;
                this.saveAccount();
                console.log(`[VirtualTrading] Sync Complete. Cash: ${this.getAccount().cash}, Positions: ${this.getAccount().positions.length}`);
                return true;
            } else {
                console.error('[VirtualTrading] Sync Failed:', data.msg1);
                return false;
            }

        } catch (error) {
            console.error('[VirtualTrading] Sync Error:', error);
            return false;
        }
    }

    /**
     * Remove logs containing '테스트' in stock name
     */
    public removeTestLogs() {
        const account = this.getAccount();
        const initialCount = account.tradeLogs.length;
        account.tradeLogs = account.tradeLogs.filter(log => !log.stockName.includes('테스트'));
        if (account.tradeLogs.length !== initialCount) {
            this.saveAccount();
            console.log(`[VirtualTrading] Removed ${initialCount - account.tradeLogs.length} test logs.`);
        }
    }
}

export const virtualTradingService = new VirtualTradingService();
