// components/StrategyStudio.tsx

import React, { useState } from 'react';
import { StrategyLabDashboard } from './StrategyLabDashboard';
import { StrategyLibraryDashboard } from './StrategyLibraryDashboard';
import { StrategyPresetsLibrary } from './StrategyPresetsLibrary';
import { useAITrader } from '../hooks/useAITrader';
import { useStrategyLibrary } from '../hooks/useStrategyLibrary';
import { useStrategyLab } from '../hooks/useStrategyLab';
import type { MarketTarget, MarketHealth } from '../types';
import { AITradingLabIcon, StoreIcon, BookOpenIcon } from './icons';

interface StrategyStudioProps {
    marketTarget: MarketTarget;
    marketStatus?: MarketHealth['status'];
}

export const StrategyStudio: React.FC<StrategyStudioProps> = ({ marketTarget, marketStatus }) => {
    const [activeTab, setActiveTab] = useState<'BUILDER' | 'LIBRARY' | 'MARKET'>('BUILDER');

    // Builder Hook State (Lifted or utilized here)
    const strategyLab = useStrategyLab();

    // Library Hook State
    const strategyLibrary = useStrategyLibrary(marketTarget);
    const aiTraderData = useAITrader(marketTarget);

    const handlePresetSelect = (preset: any) => {
        strategyLab.setLogicV2(preset.logic);
        strategyLab.setStrategyText(preset.description);
        setActiveTab('BUILDER');
    };

    const handleEditStrategy = (strategy: any) => {
        // Load existing strategy into builder
        if (strategy.logic_v2) {
            strategyLab.setLogicV2(strategy.logic_v2);
            strategyLab.setStrategyText(strategy.description);
            setActiveTab('BUILDER');
        } else {
            alert('이 전략은 V1(구버전) 로직이라 빌더에서 수정할 수 없습니다.');
        }
    };

    return (
        <div className="w-full h-full flex flex-col bg-slate-900 text-white overflow-hidden">
            {/* Unified Header & Navigation */}
            <header className="flex-none p-6 pb-0 flex flex-col sm:flex-row justify-between items-center gap-4 border-b border-slate-800 bg-slate-900/95 backdrop-blur z-10">
                <div className="mb-4 sm:mb-0">
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-400 flex items-center gap-2">
                        <AITradingLabIcon className="text-cyan-400 h-8 w-8" />
                        Strategy Studio
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">
                        전략 설계, 검증, 그리고 자동매매 관리까지 한 곳에서.
                    </p>
                </div>

                <div className="flex bg-slate-800/80 p-1 rounded-lg">
                    <button
                        onClick={() => setActiveTab('BUILDER')}
                        className={`px-4 py-2 rounded-md font-bold text-sm flex items-center gap-2 transition-all ${activeTab === 'BUILDER' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-700'
                            }`}
                    >
                        🛠️ 빌더 (Builder)
                    </button>
                    <button
                        onClick={() => setActiveTab('LIBRARY')}
                        className={`px-4 py-2 rounded-md font-bold text-sm flex items-center gap-2 transition-all ${activeTab === 'LIBRARY' ? 'bg-cyan-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-700'
                            }`}
                    >
                        📚 라이브러리 (My)
                    </button>
                    <button
                        onClick={() => setActiveTab('MARKET')}
                        className={`px-4 py-2 rounded-md font-bold text-sm flex items-center gap-2 transition-all ${activeTab === 'MARKET' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-700'
                            }`}
                    >
                        🛒 마켓 (Market)
                    </button>
                </div>
            </header>

            {/* Content Area */}
            <main className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-slate-700">
                {activeTab === 'BUILDER' && (
                    <div className="animate-fade-in">
                        {/* We reuse StrategyLabDashboard's layout directly or restructure it. 
                            For now, passing the hook state into it is tricky because StrategyLabDashboard calls useStrategyLab internally.
                            Ideally, we refactor StrategyLabDashboard to accept props OR just render it and handle 'Presets' tab internally by HIDING it.
                        */}
                        <StrategyLabDashboard
                            {...strategyLab}
                            forceBuilderView={true} // New Prop to hide internal nav
                        />
                    </div>
                )}

                {activeTab === 'LIBRARY' && (
                    <div className="animate-fade-in">
                        <StrategyLibraryDashboard
                            {...strategyLibrary}
                            marketTarget={marketTarget}
                            marketStatus={marketStatus}
                            aiTraderData={aiTraderData}
                            onEdit={handleEditStrategy} // Additional prop we might need to add
                        />
                    </div>
                )}

                {activeTab === 'MARKET' && (
                    <div className="animate-fade-in">
                        <div className="mb-6 bg-purple-900/20 border border-purple-500/30 p-4 rounded-xl flex items-center gap-4">
                            <div className="text-3xl">🏆</div>
                            <div>
                                <h3 className="text-lg font-bold text-purple-200">명예의 전당 (Hall of Fame)</h3>
                                <p className="text-sm text-purple-300/70">
                                    역사적으로 검증된 전설적인 투자가들의 전략과 직투 AI가 추천하는 고승률 패턴입니다.
                                </p>
                            </div>
                        </div>
                        <StrategyPresetsLibrary onSelect={handlePresetSelect} />
                    </div>
                )}
            </main>
        </div>
    );
};
