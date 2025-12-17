// services/schedulers/AdvancedStrategiesScheduler.ts
/**
 * 고급 전략 스케줄러
 * SMC, Anchored VWAP, Volatility Breakout 통합 실행
 */

import { scanForSMC } from '../gemini/smcScanner';
import { calculateAnchoredVWAP } from '../anchoredVWAP';
import { scanForVolatilityBreakouts, shouldTradeToday } from '../gemini/volatilityBreakout';
import { marketLogicService } from '../gemini/marketLogicService';
import { supabase } from '../supabaseClient';
import { telegramService } from '../telegramService';
import type { MarketTarget, SMCAnalysis, AnchoredVWAP, VolatilityBreakout, LogicChain } from '../../types';

interface SchedulerConfig {
    enabled: boolean;
    marketTarget: MarketTarget;
    preMarketTime: string; // "08:30" (장시작 전)
    postMarketTime: string; // "15:40" (장마감 후)
    watchlist: string[]; // 감시할 종목 목록
    notifyOnSignals: boolean; // Telegram 알림 여부
}

class AdvancedStrategiesScheduler {
    private config: SchedulerConfig;
    private intervalId: NodeJS.Timeout | null = null;
    private isRunning: boolean = false;

    constructor(config: SchedulerConfig) {
        this.config = config;
    }

    /**
     * 스케줄러 시작
     */
    start(): void {
        if (this.isRunning) {
            console.log('[고급 전략 스케줄러] 이미 실행 중입니다.');
            return;
        }

        if (!this.config.enabled) {
            console.log('[고급 전략 스케줄러] 비활성화 상태입니다.');
            return;
        }

        console.log('[고급 전략 스케줄러] 시작...');
        this.isRunning = true;

        // 1분마다 시간 확인
        this.intervalId = setInterval(() => {
            this.checkAndRun();
        }, 60000); // 1분

        // 즉시 실행 (테스트용)
        this.checkAndRun();
    }

    /**
     * 스케줄러 중지
     */
    stop(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.isRunning = false;
        console.log('[고급 전략 스케줄러] 중지');
    }

    /**
     * 현재 시간 확인 및 전략 실행
     */
    private checkAndRun(): void {
        const now = new Date();
        const koreaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
        const day = koreaTime.getDay();
        const currentTime = `${koreaTime.getHours().toString().padStart(2, '0')}:${koreaTime.getMinutes().toString().padStart(2, '0')}`;

        // Weekend Guard (0=Sun, 6=Sat)
        if (day === 0 || day === 6) return;

        // 장시작 전 스캔 (08:30)
        if (currentTime === this.config.preMarketTime) {
            console.log('[고급 전략 스케줄러] 장시작 전 스캔 실행...');
            this.runPreMarketScan();
        }

        // 장마감 후 스캔 (15:40)
        if (currentTime === this.config.postMarketTime) {
            console.log('[고급 전략 스케줄러] 장마감 후 스캔 실행...');
            this.runPostMarketScan();
        }
    }

    /**
     * 장시작 전 스캔
     */
    private async runPreMarketScan(): Promise<void> {
        try {
            console.log('[고급 전략 스케줄러] ☀️ 장시작 전 분석 시작...');

            const { marketTarget, watchlist } = this.config;

            // 0. Oracle Logic Inference (시장 논리 추론) - NEW!
            console.log('[고급 전략 스케줄러] 🔮 Oracle 시장 논리 추론 중...');
            const logicChains = await marketLogicService.analyzeMarketStructure(marketTarget);

            // 1. Volatility Breakout 스캔 (VIX 확인)
            const breakouts = await scanForVolatilityBreakouts(marketTarget, watchlist);

            // VIX 체크
            if (breakouts.length > 0) {
                const vixLevel = breakouts[0].vixLevel;

                if (!shouldTradeToday(vixLevel)) {
                    const message = `⚠️ 극단적 변동성 감지!\n\nVIX: ${vixLevel}\n모든 매매 중단을 권장합니다.`;
                    console.warn('[고급 전략 스케줄러]', message);

                    if (this.config.notifyOnSignals) {
                        await telegramService.sendMessage(message);
                    }

                    // 극단적 변동성이면 추가 스캔 중단
                    return;
                }
            }

            // 2. SMC Scanner 실행
            const smcSignals = await scanForSMC(marketTarget, watchlist);

            // 3. Anchored VWAP 계산
            const vwaps = await calculateAnchoredVWAP(marketTarget, watchlist);

            // 4. Supabase 저장
            await this.saveSignals(smcSignals, vwaps, breakouts, logicChains);

            // 5. Telegram 알림
            if (this.config.notifyOnSignals) {
                await this.sendTelegramSummary('장시작 전', smcSignals, vwaps, breakouts, logicChains);
            }

            console.log('[고급 전략 스케줄러] ✅ 장시작 전 분석 완료');

        } catch (error) {
            console.error('[고급 전략 스케줄러] 장시작 전 스캔 오류:', error);
        }
    }

    /**
     * 장마감 후 스캔
     */
    private async runPostMarketScan(): Promise<void> {
        try {
            console.log('[고급 전략 스케줄러] 🌙 장마감 후 분석 시작...');

            const { marketTarget, watchlist } = this.config;

            // 1. SMC Scanner 실행 (일일 결과 분석)
            const smcSignals = await scanForSMC(marketTarget, watchlist);

            // 2. Anchored VWAP 업데이트
            const vwaps = await calculateAnchoredVWAP(marketTarget, watchlist);

            // 3. Supabase 저장
            await this.saveSignals(smcSignals, vwaps, [], []);

            // 4. Telegram 알림
            if (this.config.notifyOnSignals) {
                await this.sendTelegramSummary('장마감 후', smcSignals, vwaps, [], []);
            }

            console.log('[고급 전략 스케줄러] ✅ 장마감 후 분석 완료');

        } catch (error) {
            console.error('[고급 전략 스케줄러] 장마감 후 스캔 오류:', error);
        }
    }

    /**
     * 결과 Supabase 저장
     */
    private async saveSignals(
        smcSignals: SMCAnalysis[],
        vwaps: AnchoredVWAP[],
        breakouts: VolatilityBreakout[],
        logicChains: LogicChain[]
    ): Promise<void> {
        if (!supabase) return;

        const today = new Date().toISOString().split('T')[0];

        try {
            // Oracle Logic Chains 저장 - NEW!
            if (logicChains.length > 0) {
                const logicRows = logicChains.map(chain => ({
                    market_target: this.config.marketTarget,
                    primary_keyword: chain.primaryKeyword,
                    cause: chain.cause,
                    effect: chain.effect,
                    beneficiary_sector: chain.beneficiarySector,
                    related_tickers: chain.relatedTickers,
                    logic_strength: chain.logicStrength,
                    alpha_gap: chain.alphaGap,
                    rationale: chain.rationale
                }));

                await supabase.from('logic_chains').insert(logicRows);
                console.log(`[고급 전략 스케줄러] Oracle 논리 ${logicChains.length}개 저장 완료`);
            }

            // SMC 신호 저장
            if (smcSignals.length > 0) {
                const smcRows = smcSignals.map(signal => ({
                    date: today,
                    market: this.config.marketTarget,
                    ticker: signal.ticker,
                    stock_name: signal.stockName,
                    pattern_type: signal.patternType,
                    confidence: signal.confidence,
                    rationale: signal.rationale,
                    entry_price: signal.entryPrice,
                    target_price: signal.takeProfit,
                    stop_loss: signal.stopLoss,
                    signal_timestamp: signal.signalDate,
                    is_active: true
                }));

                await supabase.from('smc_signals').insert(smcRows);
                console.log(`[고급 전략 스케줄러] SMC 신호 ${smcSignals.length}개 저장 완료`);
            }

            // Anchored VWAP 저장
            if (vwaps.length > 0) {
                const vwapRows = vwaps.map(vwap => ({
                    date: today,
                    market: this.config.marketTarget,
                    ticker: vwap.ticker,
                    stock_name: vwap.stockName,
                    anchor_date: vwap.anchorDate,
                    anchor_event: vwap.anchorEvent,
                    anchor_price: vwap.anchorPrice,
                    vwap_price: vwap.vwapPrice,
                    current_price: vwap.currentPrice,
                    distance_percent: vwap.distancePercent,
                    is_support: vwap.isSupport,
                    strength: vwap.strength,
                    price_action: vwap.priceAction,
                    confidence: vwap.confidence
                }));

                await supabase.from('anchored_vwap').insert(vwapRows);
                console.log(`[고급 전략 스케줄러] VWAP ${vwaps.length}개 저장 완료`);
            }

            // Volatility Breakout 저장
            if (breakouts.length > 0) {
                const breakoutRows = breakouts.map(breakout => ({
                    date: breakout.date,
                    market: breakout.market,
                    ticker: breakout.ticker,
                    stock_name: breakout.stockName,
                    k_value: breakout.kValue,
                    vix_level: breakout.vixLevel,
                    market_condition: breakout.marketCondition,
                    previous_day_range: breakout.previousDayRange,
                    open_price: breakout.openPrice,
                    breakout_price: breakout.breakoutPrice,
                    current_price: breakout.currentPrice,
                    target_price: breakout.targetPrice,
                    stop_loss: breakout.stopLoss,
                    confidence: breakout.confidence,
                    rationale: breakout.rationale,
                    is_active: true
                }));

                await supabase.from('volatility_breakouts').insert(breakoutRows);
                console.log(`[고급 전략 스케줄러] 돌파 신호 ${breakouts.length}개 저장 완료`);
            }

        } catch (error) {
            console.error('[고급 전략 스케줄러] Supabase 저장 오류:', error);
        }
    }

    /**
     * Telegram 알림 발송
     */
    private async sendTelegramSummary(
        timing: string,
        smcSignals: SMCAnalysis[],
        vwaps: AnchoredVWAP[],
        breakouts: VolatilityBreakout[],
        logicChains: LogicChain[]
    ): Promise<void> {
        const lines: string[] = [];
        lines.push(`🔔 ${timing} 고급 전략 분석 결과`);
        lines.push(`시장: ${this.config.marketTarget}`);
        lines.push('');

        // Oracle Logic Chains - NEW!
        if (logicChains.length > 0) {
            lines.push(`🔮 Oracle 시장 논리: ${logicChains.length}개`);
            logicChains.slice(0, 2).forEach(chain => {
                lines.push(`  🔹 [${chain.primaryKeyword}]`);
                lines.push(`    ${chain.cause} => ${chain.effect}`);
                lines.push(`    수혜: ${chain.beneficiarySector} (격차 ${chain.alphaGap}%)`);
            });
            lines.push('');
        }

        // SMC 신호
        if (smcSignals.length > 0) {
            lines.push(`📐 SMC 신호: ${smcSignals.length}개`);
            smcSignals.slice(0, 3).forEach(signal => {
                lines.push(`  ▪ ${signal.stockName} (${signal.ticker})`);
                lines.push(`    신뢰도 ${signal.confidence}%`);
                lines.push(`    ${signal.rationale}`);
            });
            lines.push('');
        }

        // Anchored VWAP
        const strongVWAPs = vwaps.filter(v => v.priceAction === 'bouncing' || v.priceAction === 'approaching');
        if (strongVWAPs.length > 0) {
            lines.push(`⚓ VWAP 주요 라인: ${strongVWAPs.length}개`);
            strongVWAPs.slice(0, 3).forEach(vwap => {
                lines.push(`  ▪ ${vwap.stockName} (${vwap.ticker})`);
                lines.push(`    ${vwap.anchorEvent} 기준 ${vwap.isSupport ? '지지' : '저항'}`);
                lines.push(`    ${vwap.priceAction === 'bouncing' ? '반등 중' : '접근 중'}`);
            });
            lines.push('');
        }

        // Volatility Breakout
        if (breakouts.length > 0) {
            lines.push(`💥 변동성 돌파: ${breakouts.length}개`);
            lines.push(`VIX: ${breakouts[0].vixLevel}`);
            breakouts.slice(0, 3).forEach(breakout => {
                lines.push(`  ▪ ${breakout.stockName} (${breakout.ticker})`);
                lines.push(`    K=${breakout.kValue} (${breakout.marketCondition})`);
            });
        }

        if (smcSignals.length === 0 && strongVWAPs.length === 0 && breakouts.length === 0 && logicChains.length === 0) {
            lines.push('특이사항 없음');
        }

        await telegramService.sendMessage(lines.join('\n'));
    }

    /**
     * 설정 업데이트
     */
    updateConfig(newConfig: Partial<SchedulerConfig>): void {
        this.config = { ...this.config, ...newConfig };
        console.log('[고급 전략 스케줄러] 설정 업데이트됨');
    }
}

// 기본 설정으로 인스턴스 생성
export const advancedStrategiesScheduler = new AdvancedStrategiesScheduler({
    enabled: true,
    marketTarget: 'KR',
    preMarketTime: '08:30', // 장시작 전
    postMarketTime: '15:40', // 장마감 후
    watchlist: [], // App.tsx에서 동적으로 설정
    notifyOnSignals: true
});
