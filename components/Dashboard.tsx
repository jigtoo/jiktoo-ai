

// components/Dashboard.tsx
import React from 'react';
import { MarketHealthIndicator } from './MarketHealthIndicator';
import type { DashboardStock, MarketHealth, AnomalyItem, AnalysisResult, MarketTarget, WatchlistHistoryItem, DailyOnePick, ChiefAnalystBriefing, InstitutionalFlowAnalysis, WhaleRadarData, AlphaEngineSignal, InvestmentPersona, ActiveSignal } from '../types';
import { WelcomeGuide } from './WelcomeGuide';
import { WatchlistHistory } from './WatchlistHistory';
import { CompletedAnalysisBubble } from './CompletedAnalysisBubble';
import { InstitutionalFlowAnalyzer } from './InstitutionalFlowAnalyzer';
import { WhaleTrackerRadar } from './WhaleTrackerRadar';
import { getMarketSessionState } from '../services/utils/dateUtils';


interface DashboardProps {
  marketHealth: MarketHealth | null;
  isMarketHealthLoading: boolean;
  marketHealthError: string | null;
  onRefreshMarketHealth: () => void;
  
  onSelectStock: (ticker: string, rationale: string, stockName: string) => void;

  watchlistHistory: WatchlistHistoryItem[];
  onRemoveFromWatchlist: (ticker: string) => void;
  onViewWatchlistSnapshot: (analysis: AnalysisResult) => void;

  marketTarget: MarketTarget;

  completedAnalysis: { result: AnalysisResult; stockName: string; ticker: string; } | null;
  onViewCompletedAnalysis: () => void;
  onDismissCompletedAnalysis: () => void;

  institutionalFlow: InstitutionalFlowAnalysis | null;
  isInstitutionalFlowLoading: boolean;
  institutionalFlowError: string | null;
  onFetchInstitutionalFlow: () => void;
  institutionalFlowYesterday: InstitutionalFlowAnalysis | null;
  isInstitutionalFlowYesterdayLoading: boolean;
  institutionalFlowYesterdayError: string | null;
  onFetchInstitutionalFlowYesterday: () => void;

  whaleRadarData: WhaleRadarData[] | null;
  isWhaleRadarLoading: boolean;
  whaleRadarError: string | null;
  onFetchWhaleRadarData: () => void;

  proxyStatus: 'connecting' | 'connected' | 'error' | 'disabled';
}

export const Dashboard: React.FC<DashboardProps> = (props) => {
  const { 
    marketHealth, isMarketHealthLoading, marketHealthError, onRefreshMarketHealth,
    onSelectStock,
    watchlistHistory, onRemoveFromWatchlist, onViewWatchlistSnapshot,
    marketTarget,
    completedAnalysis, onViewCompletedAnalysis, onDismissCompletedAnalysis,
    institutionalFlow, isInstitutionalFlowLoading, institutionalFlowError, onFetchInstitutionalFlow,
    institutionalFlowYesterday, isInstitutionalFlowYesterdayLoading, institutionalFlowYesterdayError, onFetchInstitutionalFlowYesterday,
    whaleRadarData, isWhaleRadarLoading, whaleRadarError, onFetchWhaleRadarData,
    proxyStatus,
  } = props;

  const hasLoadedOnce = marketHealth;
  const sessionState = getMarketSessionState(marketTarget);

  return (
    <div className="animate-fade-in space-y-8">
      
      {!hasLoadedOnce && !isMarketHealthLoading && <WelcomeGuide marketTarget={marketTarget} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 flex flex-col gap-8">
            <MarketHealthIndicator 
              title="시장 현황"
              health={marketHealth} 
              isLoading={isMarketHealthLoading} 
              error={marketHealthError} 
              onRefresh={onRefreshMarketHealth}
              marketTarget={marketTarget}
              sessionLabel={sessionState.label}
            />
        </div>

        <div className="lg:col-span-2 flex flex-col gap-8">
           {marketTarget === 'KR' && (
            <>
                <InstitutionalFlowAnalyzer
                    data={institutionalFlow}
                    isLoading={isInstitutionalFlowLoading}
                    error={institutionalFlowError}
                    onRefresh={onFetchInstitutionalFlow}
                    dataYesterday={institutionalFlowYesterday}
                    isYesterdayLoading={isInstitutionalFlowYesterdayLoading}
                    yesterdayError={institutionalFlowYesterdayError}
                    onFetchYesterday={onFetchInstitutionalFlowYesterday}
                    proxyStatus={proxyStatus}
                />
                <WhaleTrackerRadar
                    data={whaleRadarData}
                    isLoading={isWhaleRadarLoading}
                    error={whaleRadarError}
                    marketTarget={marketTarget}
                    proxyStatus={proxyStatus}
                    onRefresh={onFetchWhaleRadarData}
                />
            </>
           )}
        </div>
      </div>
      
       <WatchlistHistory 
            history={watchlistHistory} 
            onRemove={onRemoveFromWatchlist} 
            onSelectStock={onSelectStock} 
            onViewSnapshot={onViewWatchlistSnapshot} 
            marketTarget={marketTarget}
        />
        
        {completedAnalysis && (
            <CompletedAnalysisBubble 
                stockName={completedAnalysis.stockName}
                onView={onViewCompletedAnalysis}
                onClose={onDismissCompletedAnalysis}
            />
        )}
    </div>
  );
};