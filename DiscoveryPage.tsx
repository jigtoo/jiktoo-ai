// components/DiscoveryPage.tsx
import React from 'react';
import { StrategyPlaybookDashboard } from './AlphaListDashboard';
import { WatchlistHistory } from './WatchlistHistory';
import { RecentAnalysisHistory } from './RecentAnalysisHistory';
import { UserWatchlistDashboard } from './UserWatchlistDashboard';
import type { MarketTarget, ActiveSignal, InvestmentPersona, StrategyPlaybook } from '../types';
import type { useAlphaEngine } from '../hooks/useAlphaEngine';
import type { useDiscovery } from '../hooks/useDiscovery';
import type { useUserWatchlist } from '../hooks/useUserWatchlist';
import type { useDayTrader } from '../hooks/useAlphaScalper';
import { DayTraderDashboard } from './AlphaScalperDashboard';
import { DayTradeIcon } from './icons';


interface DiscoveryPageProps {
    marketTarget: MarketTarget;
    onOpenTelegramModal: (signal?: StrategyPlaybook | null) => void;
    alphaEngine: ReturnType<typeof useAlphaEngine>;
    onExecuteSignal: (signal: ActiveSignal) => void;
    persona: InvestmentPersona;
    discovery: ReturnType<typeof useDiscovery>;
    userWatchlist: ReturnType<typeof useUserWatchlist>;
    dayTrader: ReturnType<typeof useDayTrader>;
}

export const DiscoveryPage: React.FC<DiscoveryPageProps> = ({ 
    marketTarget, 
    onOpenTelegramModal, 
    alphaEngine, 
    onExecuteSignal, 
    persona, 
    discovery,
    userWatchlist,
    dayTrader,
}) => {
    const { 
        watchlistHistory, 
        analysisHistory,
        removeFromWatchlistHistory, 
        handleViewAnalysisFromHistory,
        handleSearch
    } = discovery;

    const handleSelectStock = (ticker: string, rationale: string, stockName: string) => {
        handleSearch(ticker, stockName);
    };
    
    return (
        <div className="space-y-12">
            <UserWatchlistDashboard {...userWatchlist} marketTarget={marketTarget} />
        
            <StrategyPlaybookDashboard
                {...alphaEngine}
                strategyPlaybooks={alphaEngine.strategyPlaybooks}
                marketTarget={marketTarget}
                onOpenTelegramModal={onOpenTelegramModal}
                onExecuteSignal={onExecuteSignal}
                onSelectStock={handleSelectStock}
                persona={persona}
                watchlistItems={userWatchlist.watchlistItems} // Pass watchlist items
                processingTicker={alphaEngine.processingTicker} // Pass processing ticker
            />

            <section>
                <DayTraderDashboard scanner={dayTrader} marketTarget={marketTarget} />
            </section>

            <WatchlistHistory
                history={watchlistHistory}
                onRemove={removeFromWatchlistHistory}
                onSelectStock={handleSelectStock}
                onViewSnapshot={handleViewAnalysisFromHistory}
                marketTarget={marketTarget}
            />

            <RecentAnalysisHistory
                history={analysisHistory}
                onView={handleViewAnalysisFromHistory}
                marketTarget={marketTarget}
            />
        </div>
    );
};