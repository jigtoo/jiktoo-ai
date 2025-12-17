

// components/DiscoveryHubDashboard.tsx (Renamed from DiscoveryPage.tsx)
import React, { useState } from 'react';
import type { MarketTarget, ActiveSignal, InvestmentPersona, StrategyPlaybook } from '../types';
import type { useAlphaEngine } from '../hooks/useAlphaEngine';
import type { useAlphaLink } from '../hooks/useAlphaLink';
import type { useDiscovery } from '../hooks/useDiscovery';
import type { useUserWatchlist } from '../hooks/useUserWatchlist';
import type { useBFLScanner } from '../hooks/useBFLScanner';
import type { useCoinStockScanner } from '../hooks/useCoinStockScanner';
import type { useMaterialRadar } from '../hooks/useMaterialRadar';
import type { useChartPatternScreener } from '../hooks/useChartPatternScreener';

import { GlobalAnalysisStatusBar } from './GlobalAnalysisStatusBar';
import { AlphaLinkDashboard } from './AlphaLinkDashboard';
import { ConvictionScanner } from './ConvictionScanner';
import type { useAlphaCore } from '../hooks/useAlphaCore';

import { WatchlistHistory } from './WatchlistHistory';
import { RecentAnalysisHistory } from './RecentAnalysisHistory';
import { UserWatchlistDashboard } from './UserWatchlistDashboard';

// Removed imports for individual scanner dashboards as they are now separate routes
// import { BFLScannerDashboard } from './BFLScannerDashboard';
// import { CoinStockScannerDashboard } from './CoinStockScannerDashboard';
// import { MaterialRadarDashboard } from './MaterialRadarDashboard';
// import { ChartPatternScreenerDashboard } from './ChartPatternScreenerDashboard';
// Removed scanner icons as they are now used in App.tsx for navigation
// import { ClosingBellIcon, FireIcon, RadarIcon, CrosshairIcon, BrainIcon } from './icons';

// Removed ActiveScanner type and scannerLenses array as they are no longer needed here
// type ActiveScanner = 'bfl' | 'coin' | 'material' | 'pattern';

// const scannerLenses: { id: ActiveScanner; label: string; description: string; icon: React.FC<{className?: string}> }[] = [
//     { id: 'bfl', label: '종가배팅 스캐너', description: '장 막판 주도주의 힘을 분석하여 익일 갭상승을 노립니다.', icon: ClosingBellIcon },
//     { id: 'material', label: '재료 탐지 레이더', description: '뉴스가 되기 전 시장의 미세 신호를 포착하여 선취매 기회를 찾습니다.', icon: RadarIcon },
//     { id: 'coin', label: '코인주 스캐너', description: '급등 전 저가 소형주의 매집 흔적과 조기 신호를 탐색합니다.', icon: FireIcon },
//     { id: 'pattern', label: '차트 패턴 스크리너', description: '기술적 분석 대가들의 고승률 차트 패턴을 자동으로 찾아냅니다.', icon: CrosshairIcon },
// ];


interface DiscoveryPageProps {
    marketTarget: MarketTarget;
    onOpenTelegramModal: (signal?: StrategyPlaybook | null) => void;
    alphaEngine: ReturnType<typeof useAlphaEngine>;
    alphaLink: ReturnType<typeof useAlphaLink>;
    alphaCore: ReturnType<typeof useAlphaCore>;
    onExecuteSignal: (signal: ActiveSignal) => void;
    persona: InvestmentPersona;
    discovery: ReturnType<typeof useDiscovery>;
    userWatchlist: ReturnType<typeof useUserWatchlist>;
    // Scanner-specific props are no longer passed down to DiscoveryPage
    bflScanner: ReturnType<typeof useBFLScanner>; // Still needed for AlphaLink, but not rendered here directly
    coinStockScanner: ReturnType<typeof useCoinStockScanner>; // Still needed for AlphaLink, but not rendered here directly
    materialRadar: ReturnType<typeof useMaterialRadar>; // Still needed for AlphaLink, but not rendered here directly
    patternScreener: ReturnType<typeof useChartPatternScreener>; // Still needed for AlphaLink, but not rendered here directly
}

// Renamed and updated: DiscoveryPage -> DiscoveryHubDashboard
export const DiscoveryHubDashboard: React.FC<DiscoveryPageProps> = (props) => {
    const {
        marketTarget,
        alphaLink,
        alphaCore,
        discovery,
        userWatchlist,
        // Removed direct usage of scanner hooks here, but they are still needed in App.tsx for the AlphaLink component.
        // bflScanner,
        // coinStockScanner,
        // materialRadar,
        // patternScreener,
    } = props;
    // Removed activeScanner state
    // const [activeScanner, setActiveScanner] = useState<ActiveScanner>('bfl'); // Default to BFL scanner

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

            <AlphaCoreDashboard alphaCore={alphaCore} />

            <ConvictionScanner
                forceGlobalScan={alphaLink.forceGlobalScan}
                isGlobalScanning={alphaLink.isGlobalScanning}
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