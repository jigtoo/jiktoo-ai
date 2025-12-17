
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FoundationIcon, RocketIcon, ClosingBellIcon,
    RadarIcon, CrosshairIcon
} from './icons';
import { MarketTarget } from '../types';

// Import Scan Dashboards
import { ValuePivotScreenerDashboard } from './ValuePivotScreenerDashboard';
import { SupplyEagleDashboard } from './SupplyEagleDashboard';
import { BFLScannerDashboard } from './BFLScannerDashboard';
import { MaterialRadarDashboard } from './MaterialRadarDashboard';
import { ChartPatternScreenerDashboard } from './ChartPatternScreenerDashboard';
// CoinStock removed per user request

interface ScannerHubProps {
    marketTarget: MarketTarget;
    valuePivotScreener: any;
    supplyEagle: any;
    bflScanner: any;
    materialRadar: any;
    patternScreener: any;
    onSelectStock: (ticker: string, rationale: string, stockName: string) => void;
}

const tabs = [
    { id: 'value', label: '가치 발굴', icon: FoundationIcon, desc: '저평가 우량주 탐색' },
    { id: 'supply', label: '수급 독수리', icon: RocketIcon, desc: '기관/외인 수급 포착' },
    { id: 'bfl', label: '종가 배팅', icon: ClosingBellIcon, desc: '확률 높은 종가 공략' },
    { id: 'material', label: '재료 탐지', icon: RadarIcon, desc: '뉴스/테마 분석' },
    { id: 'pattern', label: '차트 패턴', icon: CrosshairIcon, desc: '기술적 패턴 매칭' },
];

export const ScannerHubDashboard: React.FC<ScannerHubProps> = ({
    marketTarget,
    valuePivotScreener,
    supplyEagle,
    bflScanner,
    materialRadar,
    patternScreener,
    onSelectStock
}) => {
    const [activeTab, setActiveTab] = useState('value');

    return (
        <div className="flex flex-col h-full bg-gray-900 text-gray-100 p-6 space-y-6 overflow-hidden">

            {/* Header Area */}
            <div className="flex items-end justify-between border-b border-gray-800 pb-4">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-500">
                        스캐너 허브
                    </h1>
                    <p className="text-gray-400 mt-1 text-sm">
                        AI가 분석한 다양한 관점의 종목 발굴 도구를 통합해 제공합니다.
                    </p>
                </div>
                <div className="text-xs text-gray-500 font-mono">
                    MARKET: {marketTarget}
                </div>
            </div>

            {/* Tabs Navigation */}
            <div className="flex space-x-2 bg-gray-800/30 p-1 rounded-xl w-fit">
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`
                                relative flex items-center space-x-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                                ${isActive
                                    ? 'bg-gradient-to-br from-gray-700 to-gray-800 text-white shadow-lg ring-1 ring-white/10'
                                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                                }
                            `}
                        >
                            <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-gray-500'}`} />
                            <span>{tab.label}</span>

                            {/* Active Underline/Glow */}
                            {isActive && (
                                <motion.div
                                    layoutId="activeTabGlow"
                                    className="absolute inset-0 rounded-lg bg-blue-500/5"
                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                />
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Content Area */}
            <div className="flex-1 min-h-0 bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden relative">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.2 }}
                        className="h-full overflow-y-auto"
                    >
                        {activeTab === 'value' && (
                            <ValuePivotScreenerDashboard
                                {...valuePivotScreener}
                                onSelectStock={onSelectStock}
                            />
                        )}
                        {activeTab === 'supply' && (
                            <SupplyEagleDashboard
                                scanner={supplyEagle}
                                marketTarget={marketTarget}
                            />
                        )}
                        {activeTab === 'bfl' && (
                            <BFLScannerDashboard
                                scanner={bflScanner}
                                marketTarget={marketTarget}
                                onSelectStock={onSelectStock}
                            />
                        )}
                        {activeTab === 'material' && (
                            <MaterialRadarDashboard
                                radar={materialRadar}
                                marketTarget={marketTarget}
                            />
                        )}
                        {activeTab === 'pattern' && (
                            <ChartPatternScreenerDashboard
                                screener={patternScreener}
                            />
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
};
