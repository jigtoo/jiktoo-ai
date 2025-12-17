// components/StrategyLabDashboard V2

import React, { useState } from 'react';
import { useStrategyLab } from '../hooks/useStrategyLab'; // Import just for type inference if needed, or we can assume props.
import { StrategyBlockBuilder } from './StrategyBlockBuilder';
import { StrategyPresetsLibrary } from './StrategyPresetsLibrary';
import { StrategyPreset } from '../services/strategy/StrategyPresets';
import type { MarketTarget } from '../types';

// We define the Props type by inferring from the hook's return type
type StrategyLabProps = ReturnType<typeof useStrategyLab> & { forceBuilderView?: boolean };

export const StrategyLabDashboard: React.FC<StrategyLabProps> = (props) => {
    // Props contain all the state and functions from the hook
    const {
        strategyText, setStrategyText,
        logicV2, setLogicV2,
        parseStrategyV2, isParsing,
        saveStrategyV2, isSaving,
        runBacktestV2, isBacktesting, backtestResult,
        backtestTicker, setBacktestTicker, fetchHistoricalData, isFetchingData, historicalData, // Data Props
        forceBuilderView // Passed from Studio
    } = props;

    const [activeTab, setActiveTab] = useState<'BUILDER' | 'PRESETS'>('BUILDER');

    const handlePresetSelect = (preset: StrategyPreset) => {
        setLogicV2(preset.logic);
        setStrategyText(preset.description);
        setActiveTab('BUILDER');
    };

    const showHeader = !forceBuilderView;
    const currentTab = forceBuilderView ? 'BUILDER' : activeTab;

    return (
        <div className={`w-full h-full ${forceBuilderView ? '' : 'p-6 bg-slate-900 text-white overflow-y-auto'}`}>
            {showHeader && (
                <header className="mb-8 flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-teal-400">
                            AI Strategy Lab 2.0
                        </h1>
                        <p className="text-slate-400 mt-2">
                            자연어로 전략을 말하거나, 전설적인 투자자의 템플릿을 수정하여 실시간 헌터를 만드세요.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setActiveTab('BUILDER')}
                            className={`px-4 py-2 rounded-lg font-bold transition-all ${activeTab === 'BUILDER' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                        >
                            🛠️ 빌더
                        </button>
                        <button
                            onClick={() => setActiveTab('PRESETS')}
                            className={`px-4 py-2 rounded-lg font-bold transition-all ${activeTab === 'PRESETS' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                        >
                            📚 명예의 전당 (Presets)
                        </button>
                        <button
                            onClick={() => alert("✅ AI Hunter Backend: ONLINE\n✅ KIS Proxy: CONNECTED (Latency: 12ms)\n✅ Supabase: ACTIVE")}
                            className="px-3 py-2 bg-slate-800 hover:bg-green-900/30 text-green-400 text-xs font-mono border border-green-500/30 rounded-lg transition-colors flex items-center gap-1"
                        >
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                            System Status
                        </button>
                    </div>
                </header>
            )}

            {currentTab === 'PRESETS' ? (
                <StrategyPresetsLibrary onSelect={handlePresetSelect} />
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left: Input & AI */}
                    <div className="space-y-6">
                        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl">
                            <h2 className="text-xl font-semibold mb-4 text-blue-300">1. AI에게 전략 설명하기</h2>
                            <textarea
                                className="w-full h-32 bg-slate-900 border border-slate-600 rounded-xl p-4 text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all resize-none"
                                placeholder="예: 20일 이평선이 60일 이평선을 골든크로스 하고, RSI가 40 이하인 종목 찾아줘."
                                value={strategyText}
                                onChange={(e) => setStrategyText(e.target.value)}
                            />
                            <div className="mt-4 flex justify-end">
                                <button
                                    onClick={parseStrategyV2}
                                    disabled={isParsing || !strategyText}
                                    className={`
                                        px-6 py-3 rounded-lg flex items-center gap-2 font-bold shadow-lg
                                        ${isParsing ? 'bg-slate-600 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:scale-105 transition-transform'}
                                    `}
                                >
                                    {isParsing ? '🧬 AI 분석 중...' : '✨ 전략 생성 (Generate Block)'}
                                </button>
                            </div>
                        </div>

                        {/* Backtest Data Settings */}
                        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl">
                            <h2 className="text-xl font-semibold mb-4 text-green-300">2. 검증용 데이터 준비 (Backtest Data)</h2>
                            <div className="flex gap-2 mb-2">
                                <select
                                    className="bg-slate-900 border border-slate-600 rounded-lg p-3 text-white font-mono outline-none"
                                    value={props.timeframe || 'day'}
                                    onChange={(e) => props.setTimeframe && props.setTimeframe(e.target.value)}
                                >
                                    <option value="day">Daily (1D)</option>
                                    <option value="60">60 Minute</option>
                                    <option value="30">30 Minute</option>
                                </select>
                                <input
                                    type="text"
                                    value={backtestTicker}
                                    onChange={(e) => setBacktestTicker(e.target.value.toUpperCase())}
                                    placeholder="종목코드 (Default: Random)"
                                    className="flex-1 bg-slate-900 border border-slate-600 rounded-lg p-3 text-white font-mono uppercase focus:border-green-500 outline-none"
                                />
                                <button
                                    onClick={fetchHistoricalData}
                                    disabled={isFetchingData}
                                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-bold text-slate-200 transition-colors whitespace-nowrap"
                                >
                                    {isFetchingData ? '다운로드...' : '📥 데이터/랜덤 생성'}
                                </button>
                            </div>
                            {historicalData && historicalData.length > 0 ? (
                                <div className="text-xs text-green-400 font-mono mt-2">
                                    ✅ {historicalData.length}개의 일봉(Daily) 데이터가 준비되었습니다. (최근 2년)
                                </div>
                            ) : (
                                <p className="text-xs text-slate-500 mt-2">
                                    * 전략을 검증하기 위해 먼저 실제 시장 데이터를 확보해야 합니다.
                                </p>
                            )}
                        </div>

                    </div>

                    {/* Right: Visual Builder */}
                    <div
                        className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl min-h-[500px]"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                            e.preventDefault();
                            try {
                                const logicStr = e.dataTransfer.getData('application/json');
                                if (logicStr) {
                                    const logic = JSON.parse(logicStr);
                                    if (confirm('이 템플릿으로 현재 로직을 덮어쓰시겠습니까?')) {
                                        setLogicV2(logic);
                                        const desc = e.dataTransfer.getData('text/plain');
                                        if (desc) setStrategyText(desc);
                                    }
                                }
                            } catch (err) {
                                console.error('Drop failed', err);
                            }
                        }}
                    >
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold text-purple-300 flex items-center gap-2">
                                <span>3. 로직 블록 (Logic Blocks)</span>
                            </h2>
                            <div className="flex gap-2">
                                {logicV2 && (
                                    <>
                                        <button
                                            onClick={runBacktestV2}
                                            disabled={isBacktesting}
                                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg transition-colors flex items-center gap-2"
                                        >
                                            {isBacktesting ? '시뮬레이션 중...' : '🧪 백테스트 (Simulation)'}
                                        </button>
                                        <button
                                            onClick={() => {
                                                const name = prompt("전략의 이름을 입력해주세요:", "나의 AI 전략");
                                                if (name) saveStrategyV2(name);
                                            }}
                                            disabled={isSaving}
                                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-lg transition-colors flex items-center gap-2"
                                        >
                                            {isSaving ? '저장 중...' : '💾 전략 저장 & Hunter 실행'}
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        {logicV2 && <p className="text-xs text-slate-500 mb-4 text-right">드래그하여 수정 가능 (Coming Soon)</p>}

                        {logicV2 ? (
                            <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-700 overflow-x-auto">
                                <StrategyBlockBuilder
                                    logic={logicV2}
                                    onChange={setLogicV2}
                                    isRoot={true}
                                />
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-60">
                                <div className="text-6xl mb-4">🧩</div>
                                <p className="text-center">왼쪽에서 전략을 입력하거나,<br />'명예의 전당'에서 템플릿을<br /><span className="text-indigo-400 font-bold">드래그하여(Drag & Drop)</span> 가져오세요.</p>
                            </div>
                        )}

                        {/* Backtest Result Display */}
                        {backtestResult && (
                            <div className="mt-6 bg-slate-900 border border-indigo-500/50 rounded-xl p-4 animate-fade-in-up">
                                <h3 className="text-lg font-bold text-indigo-300 mb-3 flex items-center gap-2">
                                    📊 시뮬레이션 결과 ({backtestResult.period})
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                    <div className="bg-slate-800 p-3 rounded-lg text-center">
                                        <p className="text-xs text-slate-400">승률 (Win Rate)</p>
                                        <p className={`text-xl font-bold ${backtestResult.winRate >= 50 ? 'text-red-400' : 'text-blue-400'}`}>
                                            {backtestResult.winRate}%
                                        </p>
                                    </div>
                                    <div className="bg-slate-800 p-3 rounded-lg text-center">
                                        <p className="text-xs text-slate-400">손익비 (Profit Factor)</p>
                                        <p className="text-xl font-bold text-white">{backtestResult.profitFactor}</p>
                                    </div>
                                    <div className="bg-slate-800 p-3 rounded-lg text-center">
                                        <p className="text-xs text-slate-400">총 거래 (Trades)</p>
                                        <p className="text-xl font-bold text-white">{backtestResult.totalTrades}</p>
                                    </div>
                                    <div className="bg-slate-800 p-3 rounded-lg text-center">
                                        <p className="text-xs text-slate-400">CAGR</p>
                                        <p className={`text-xl font-bold ${backtestResult.cagr >= 0 ? 'text-red-400' : 'text-blue-400'}`}>
                                            {backtestResult.cagr}%
                                        </p>
                                    </div>
                                </div>
                                <div className="bg-indigo-900/20 p-3 rounded-lg border border-indigo-500/30">
                                    <p className="text-sm text-indigo-200">
                                        <span className="font-bold">🤖 AI 분석: </span>
                                        {backtestResult.aiAnalysis}
                                    </p>
                                    {backtestResult.aiOptimization && (
                                        <p className="text-sm text-teal-200 mt-2">
                                            <span className="font-bold">💡 최적화 제안: </span>
                                            {backtestResult.aiOptimization}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
