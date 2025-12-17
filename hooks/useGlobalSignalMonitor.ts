
// copy-of-sepa-ai/hooks/useGlobalSignalMonitor.ts
import { useEffect, useRef } from 'react';
import { supabase } from '../services/supabaseClient';
import { fetchActiveSignals } from '../services/gemini/alphaEngineService';
import { TELEGRAM_SERVICE_URL, SUPABASE_ANON_KEY, KIWOOM_BRIDGE_URL } from '../config'; // Updated import
import type { StrategyPlaybook, Signal, ActiveSignal, MarketTarget } from '../types';
import { getMarketSessionState } from '../services/utils/dateUtils';

// Helper to check for active signal type
function isActionableSignal(signal: Signal): signal is ActiveSignal {
    return 'signalType' in signal && (signal.signalType === 'BUY' || signal.signalType === 'SELL');
}

// This hook is a fire-and-forget background monitor. It has no UI dependencies.
export const useGlobalSignalMonitor = () => {
    const notifiedSignalIds = useRef<Map<string, number>>(new Map());
    const isRunning = useRef(false);

    useEffect(() => {
        const monitor = async () => {
            if (isRunning.current) {
                console.log('[GlobalMonitor] Previous check still running. Skipping.');
                return;
            }
            isRunning.current = true;

            try {
                if (!supabase) {
                    console.warn('[GlobalMonitor] Supabase not available, cannot monitor signals.');
                    return;
                }

                // [NEW] Smart Error Handling: Check Kiwoom Bridge health first.
                // We don't block completely, but we log a warning if health check fails.
                try {
                    // Health check 비활성화 - WebSocket이 이미 작동 중
                    // const bridgeHealth = await fetch(`${KIWOOM_BRIDGE_URL}/health`, { 
                    //     signal: AbortSignal.timeout(3000), // 3s timeout
                    //     headers: { 'Private-Network-Access': 'true' }
                    // });
                    // if (!bridgeHealth.ok) {
                    //     console.warn('[GlobalMonitor] Bridge health check returned non-OK status:', bridgeHealth.status);
                    // }
                    console.log('[GlobalMonitor] Health check bypassed - using WebSocket connection status');
                } catch (bridgeError: any) {
                    console.warn(`[GlobalMonitor] Error: ${bridgeError.message}`);
                    // 에러가 있어도 계속 진행
                }

                const marketsToMonitor: MarketTarget[] = ['KR', 'US'];
                const allNewNotifications: any[] = [];

                for (const market of marketsToMonitor) {
                    const session = getMarketSessionState(market);
                    if (session.state !== 'REGULAR') {
                        continue; // Skip check for this market if not open
                    }

                    const { data: playbookData, error: playbookError } = await supabase
                        .from('alpha_engine_playbooks')
                        .select('*')
                        .eq('market', market)
                        .order('created_at', { ascending: false })
                        .limit(1);

                    if (playbookError || !playbookData || playbookData.length === 0 || !(playbookData[0] as any).playbook) {
                        continue;
                    }

                    const playbook = (playbookData[0] as any).playbook as StrategyPlaybook[];
                    if (playbook.length === 0) {
                        continue;
                    }

                    const signals = await fetchActiveSignals(playbook, market, 'Balanced');
                    const activeBuySignals = signals.filter((s): s is ActiveSignal => isActionableSignal(s) && s.signalType === 'BUY');

                    const now = Date.now();
                    for (const signal of activeBuySignals) {
                        const signalId = `${signal.ticker}-${signal.signalType}`;
                        if (!notifiedSignalIds.current.has(signalId)) {
                            const associatedPlaybook = playbook.find(p => p.ticker === signal.ticker);
                            const telegramPayload = {
                                stockName: signal.stockName,
                                ticker: signal.ticker,
                                detectedPattern: associatedPlaybook?.strategyName || '패턴 분석',
                                patternTimeframe: associatedPlaybook?.strategyType === 'DayTrade' ? 'Intraday' : 'Daily',
                                aiCommentary: signal.tradingPlan.planRationale,
                                triggerSignal: `> ${signal.tradingPlan.entryPrice}`,
                                invalidationCondition: `< ${signal.tradingPlan.stopLoss}`,
                                keyLevels: { target: signal.tradingPlan.targets[0] }
                            };
                            allNewNotifications.push(telegramPayload);
                            notifiedSignalIds.current.set(signalId, now);
                        }
                    }
                }

                // Cleanup old entries from the notified map to prevent memory leaks
                const now = Date.now();
                for (const [id, timestamp] of notifiedSignalIds.current.entries()) {
                    if (now - timestamp > 24 * 60 * 60 * 1000) { // older than 24 hours
                        notifiedSignalIds.current.delete(id);
                    }
                }

                // Send notifications if there are new ones
                if (allNewNotifications.length > 0) {
                    console.log(`[GlobalMonitor] Sending ${allNewNotifications.length} notifications.`);
                    try {
                        await fetch(TELEGRAM_SERVICE_URL, {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                                'Content-Type': 'application/json',
                                'apikey': SUPABASE_ANON_KEY,
                            },
                            body: JSON.stringify({ type: 'notify', signals: allNewNotifications }),
                        });
                    } catch (e) {
                        console.error('[GlobalMonitor] Error sending Telegram notifications:', e);
                    }
                }

            } catch (err) {
                console.error('[GlobalMonitor] Error during signal check:', err);
            } finally {
                isRunning.current = false;
            }
        };

        // Run once on start, then set interval
        setTimeout(monitor, 5000); // Initial delay
        const intervalId = setInterval(monitor, 60 * 1000); // Check every 60 seconds

        return () => {
            clearInterval(intervalId);
        };
    }, []);

    // This hook has no return value; it's purely for side effects.
};
