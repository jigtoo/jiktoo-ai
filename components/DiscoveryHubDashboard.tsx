
// components/DiscoveryHubDashboard.tsx (Renamed from DiscoveryPage.tsx)
import React from 'react';
import type { MarketTarget, ActiveSignal, InvestmentPersona, StrategyPlaybook } from '../types';
import type { useAlphaEngine } from '../hooks/useAlphaEngine';
import type { useAlphaLink } from '../hooks/useAlphaLink';
import type { useDiscovery } from '../hooks/useDiscovery';
import type { useUserWatchlist } from '../hooks/useUserWatchlist';
// Removed specific scanner hooks as they are no longer embedded.
import type { useBFLScanner } from '../hooks/useBFLScanner';
import type { useCoinStockScanner } from '../hooks/useCoinStockScanner';
import type { useMaterialRadar } from '../hooks/useMaterialRadar';
import type { useChartPatternScreener } from '../hooks/useChartPatternScreener';
import type { useAIQuantScreener } from '../hooks/useAIQuantScreener';

import { GlobalAnalysisStatusBar } from './GlobalAnalysisStatusBar';
import { AlphaLinkDashboard } from './AlphaLinkDashboard';
import { ConvictionScanner } from './ConvictionScanner';
import type { useAlphaCore } from '../hooks/useAlphaCore';

import { WatchlistHistory } from './WatchlistHistory';
import { RecentAnalysisHistory } from './RecentAnalysisHistory';
import { UserWatchlistDashboard } from './UserWatchlistDashboard';
import { MacroIndicatorPanel } from './MacroIndicatorPanel';

import { AIQuantScreener } from './AIQuantScreener';

// Renamed and updated: DiscoveryPage -> DiscoveryHubDashboard

interface DiscoveryHubDashboardProps {
    marketTarget: MarketTarget;
    alphaLink: any; // Type accurately if possible, e.g. ReturnType<typeof useAlphaLink>
    alphaCore: any;
    discovery: any;
    userWatchlist: any;
    aiQuantScreener: ReturnType<typeof useAIQuantScreener>;
}

export const DiscoveryHubDashboard: React.FC<DiscoveryHubDashboardProps> = (props) => {
    const {
        marketTarget,
        alphaLink,
        alphaCore,
        discovery,
        userWatchlist,
        aiQuantScreener,
    } = props;
    // activeScanner state removed

    if (!alphaLink || !alphaCore || !discovery || !userWatchlist) {
        console.error('[DiscoveryHubDashboard] Missing critical props:', { alphaLink, alphaCore, discovery, userWatchlist });
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-red-400">
                <h2 className="text-2xl font-bold mb-4">시스템 오류 발생</h2>
                <p>필수 데이터 모듈을 불러오지 못했습니다.</p>
                <p className="text-sm text-gray-500 mt-2">개발자 콘솔을 확인해주세요.</p>
            </div>
        );
    }

    const {
        watchlistHistory,
        analysisHistory,
        removeFromWatchlistHistory,
        handleViewAnalysisFromHistory,
        handleSearch,
        analysisStatus,
        analysisError,
        analyzingStockName,
        analysisProgress,
        handleCancelAnalysis,
    } = discovery;

    const handleSelectStock = (ticker: string, rationale: string, stockName: string) => {
        handleSearch(ticker, stockName);
    };

    return (
        <div className="space-y-12">
            <GlobalAnalysisStatusBar
                status={analysisStatus}
                stockName={analyzingStockName}
                progress={analysisProgress}
                error={analysisError}
                onSearch={handleSearch}
                onCancel={handleCancelAnalysis}
                marketTarget={marketTarget}
            />

            <MacroIndicatorPanel />

            <ConvictionScanner
                forceGlobalScan={alphaLink.forceGlobalScan}
                isGlobalScanning={alphaLink.isGlobalScanning}
            />

            {/* AI Quant Screener Section - Includes Genome Hunter */}
            <AIQuantScreener
                marketTarget={marketTarget}
                results={aiQuantScreener.results}
                isLoading={aiQuantScreener.isLoading}
                error={aiQuantScreener.error}
                handleScan={aiQuantScreener.handleScan}
                activeRecipe={aiQuantScreener.activeRecipe}
            />

            <AlphaLinkDashboard
                alphaLink={alphaLink}
                onSelectStock={handleSelectStock}
            />

            <UserWatchlistDashboard
                {...userWatchlist}
                marketTarget={marketTarget}
            />

            {/* The entire "개별 스캐너 렌즈" section is removed from here */}
            {/* It will now be handled by separate routes in App.tsx */}
            {/*
            <div className="space-y-6">
                <header className="text-center">
                    <h2 className="text-2xl font-bold text-gray-100">개별 스캐너 렌즈</h2>
                    <p className="text-gray-400 mt-1">다양한 관점으로 시장을 탐색하여 새로운 기회를 발견하세요.</p>
                </header>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {scannerLenses.map(({ id, label, description, icon: Icon }) => {
                        const isActive = activeScanner === id;
                        return (
                             <button
                                key={id}
                                onClick={() => setActiveScanner(id)}
                                className={`p-4 rounded-xl text-left transition-all duration-300 transform hover:-translate-y-1 ${isActive ? 'bg-gray-700 border-2 border-cyan-500 shadow-lg' : 'bg-gray-800 border border-gray-700 hover:border-gray-600'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${isActive ? 'bg-cyan-500/20' : 'bg-gray-700/50'}`}>
                                        <Icon className={`h-6 w-6 ${isActive ? 'text-cyan-400' : 'text-gray-400'}`} />
                                    </div>
                                    <h3 className={`font-bold ${isActive ? 'text-white' : 'text-gray-300'}`}>{label}</h3>
                                </div>
                                <p className="text-xs text-gray-400 mt-2">{description}</p>
                            </button>
                        );
                    })}
                </div>

                <div className="mt-6 p-4 bg-gray-800/50 rounded-xl border-2 border-cyan-500/50">
                    {activeScanner === 'bfl' && (
                        <BFLScannerDashboard scanner={bflScanner} marketTarget={marketTarget} onSelectStock={handleSelectStock} isEmbedded />
                    )}
                    {activeScanner === 'material' && (
                        <MaterialRadarDashboard radar={materialRadar} marketTarget={marketTarget} isEmbedded />
                    )}
                    {activeScanner === 'coin' && (
                        <CoinStockScannerDashboard scanner={coinStockScanner} marketTarget={marketTarget} isEmbedded />
                    )}
                    {activeScanner === 'pattern' && (
                        <ChartPatternScreenerDashboard screener={patternScreener} isEmbedded />
                    )}
                </div>
            </div>
            */}

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
