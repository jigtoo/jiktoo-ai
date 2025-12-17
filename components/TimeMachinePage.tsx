
import React, { useState, useEffect } from 'react';
import { PlayIcon, RefreshIcon, BeakerIcon, LightbulbIcon } from './icons';
import { MarketTarget, StrategyGenome } from '../types';
import { timeMachineService, SimResult, DEFAULT_GENOME } from '../services/TimeMachineService';
import { supabase } from '../services/supabaseClient';
import { evolutionScheduler } from '../services/EvolutionScheduler';

const StrategyArchive = () => {
    const [strategies, setStrategies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchStrats = async () => {
        setLoading(true);
        if (!supabase) return;
        const { data } = await supabase
            .from('strategies')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);
        if (data) setStrategies(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchStrats();
    }, []);

    if (loading && strategies.length === 0) return <div className="text-gray-500 text-sm">Loading archive...</div>;

    return (
        <div className="mt-8 bg-gray-900/30 p-6 rounded-2xl border border-gray-800">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                📂 전략 보관함 (Strategy Archive)
                <span className="text-xs font-normal text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">{strategies.length}</span>
                <button onClick={fetchStrats} className="ml-auto text-gray-500 hover:text-white p-1 hover:bg-gray-800 rounded transition-colors" title="새로고침">
                    <RefreshIcon className={`w-4 h-4 ${loading ? 'animate-spin text-blue-400' : ''}`} />
                </button>
            </h3>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-400">
                    <thead className="text-xs text-gray-500 uppercase bg-gray-800/50">
                        <tr>
                            <th className="px-4 py-3 rounded-l-lg">Name</th>
                            <th className="px-4 py-3">Market</th>
                            <th className="px-4 py-3">Created</th>
                            <th className="px-4 py-3 text-right">Return</th>
                            <th className="px-4 py-3 text-right">MDD</th>
                            <th className="px-4 py-3 rounded-r-lg text-center">Active</th>
                        </tr>
                    </thead>
                    <tbody>
                        {strategies.length === 0 ? (
                            <tr><td colSpan={6} className="text-center py-4">No strategies archived yet.</td></tr>
                        ) : strategies.map((s, i) => {
                            // Support legacy key 'performance_metric' (singular) vs new 'performance_metrics' (plural)
                            const metrics = s.performance_metrics || s.performance_metric || {};
                            const ret = metrics.return ?? metrics.finalReturn; // Handle different return keys if any
                            const mdd = metrics.mdd ?? metrics.maxDrawdown;

                            return (
                                <tr key={s.id} className="border-b border-gray-800 hover:bg-gray-800/30 transition-colors">
                                    <td className="px-4 py-3 font-medium text-white">
                                        {s.name}
                                        {i === 0 && <span className="ml-2 text-[10px] bg-blue-900 text-blue-300 px-1 rounded">NEW</span>}
                                    </td>
                                    <td className="px-4 py-3">{s.market}</td>
                                    <td className="px-4 py-3 text-gray-500">{new Date(s.created_at).toLocaleDateString()}</td>
                                    <td className={`px-4 py-3 text-right font-mono ${ret > 0 ? 'text-green-400' : ret < 0 ? 'text-red-400' : 'text-gray-600'}`}>
                                        {ret !== undefined ? `${Number(ret).toFixed(1)}%` : <span className="text-gray-700 text-xs">N/A</span>}
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono text-gray-400">
                                        {mdd !== undefined ? `${Number(mdd).toFixed(1)}%` : <span className="text-gray-700 text-xs">N/A</span>}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {s.is_active ?
                                            <span className="text-xs bg-green-900/60 text-green-400 border border-green-700/50 px-2 py-0.5 rounded shadow-[0_0_10px_rgba(74,222,128,0.2)]">
                                                ● Active
                                            </span>
                                            : <span className="text-xs text-gray-700">Archived</span>
                                        }
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};


interface TimeMachinePageProps {
    marketTarget: MarketTarget;
}

export const TimeMachinePage: React.FC<TimeMachinePageProps> = ({ marketTarget }) => {
    const [config, setConfig] = useState({
        asset: marketTarget === 'KR' ? 'KOSPI' : 'QQQ',
        period: 3, // years
        mode: 'Technical' as 'Technical' | 'Multi-Factor' | 'Self-Improving'
    });

    // New State for 2.0
    const [isBlindMode, setIsBlindMode] = useState(false);
    const [genome, setGenome] = useState<StrategyGenome>(DEFAULT_GENOME);
    const [showAdvanced, setShowAdvanced] = useState(false);

    const [status, setStatus] = useState<'IDLE' | 'RUNNING' | 'FINISHED'>('IDLE');
    const [progress, setProgress] = useState(0);
    const [currentDate, setCurrentDate] = useState('2022-01-01');
    const [result, setResult] = useState<SimResult | null>(null);

    // Auto-switch asset based on global market target
    useEffect(() => {
        if (!isBlindMode) {
            setConfig(prev => ({ ...prev, asset: marketTarget === 'KR' ? 'KOSPI' : 'QQQ' }));
        }
    }, [marketTarget, isBlindMode]);

    const startSimulation = async () => {
        setStatus('RUNNING');
        setProgress(0);
        setResult(null);

        try {
            // Prepare config
            const simConfig = {
                ...config,
                period: isBlindMode ? -1 : config.period, // -1 for Random
                asset: isBlindMode ? 'RANDOM' : config.asset,
                genome: genome
            };

            // Simulate "Thinking" time for better UX (Math is too fast)
            // 800ms for data fetch visuals, then process
            await new Promise(r => setTimeout(r, 800));

            const simResult = await timeMachineService.runSimulation(simConfig, (prog, date) => {
                setProgress(prog);
                setCurrentDate(date);
            });

            setResult(simResult);
            // Small delay to ensure state update before finish
            setTimeout(() => setStatus('FINISHED'), 200);
        } catch (error: any) {
            console.error("Simulation failed:", error);
            setStatus('IDLE');
            alert(`시뮬레이션 중 오류가 발생했습니다: ${error.message}`);
        }
    };

    const handleApplyEvolution = async () => {
        if (!result) return;
        const confirm = window.confirm(
            "이 통찰을 바탕으로 현재의 직투 전략 파라미터를 수정하시겠습니까?\n\n이 작업은 현재 활성화된 전략을 이 시뮬레이션의 'Genome'으로 교체합니다."
        );
        if (confirm) {
            // In a real scenario, we would PARSE the insight text to apply specific changes,
            // OR we just assume the 'genome' in state is what user wants to save (if they manually tweaked it).
            // For now, let's save the current 'genome' as the new active strategy.

            const success = await timeMachineService.saveEvolvedStrategy(
                genome,
                { return: result.finalReturn, mdd: result.mdd },
                `Evolution ${new Date().toISOString().slice(0, 10)}`
            );

            if (success) {
                alert("✅ 전략이 성공적으로 진화했습니다!\n\n이제 스크리너(Hunter)가 이 새로운 유전자를 사용하여 종목을 발굴합니다.");
                // Force refresh strategy archive by cycling status or using a specific prop
                setStatus('IDLE');
            } else {
                alert("❌ 전략 저장 실패. DB 연결을 확인하세요.");
            }
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <header className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-500">
                        블라인드 타임머신 (Blind Time-Machine)
                    </h1>
                    <p className="text-gray-400 mt-2">
                        과거의 시점으로 돌아가 직투 엔진을 훈련시키는 시공간 제어실입니다.
                        <br />
                        <span className="text-xs text-yellow-500/80">
                            * 전략 유전자(Genome)를 직접 조작하고 테스트할 수 있습니다.
                        </span>
                    </p>
                </div>
                <div className="flex gap-4">
                    <div className="px-4 py-2 bg-gray-800 rounded-lg border border-gray-700">
                        <span className="text-xs text-gray-500 block">Jiktoo Experience</span>
                        <span className="text-xl font-bold text-cyan-400">Level 4</span>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* 1. Control Panel */}
                <div className="bg-gray-900/50 p-6 rounded-2xl border border-gray-800 backdrop-blur-sm lg:col-span-1 flex flex-col gap-6">

                    {/* Mode Toggle */}
                    <div>
                        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <BeakerIcon className="w-5 h-5 text-purple-400" />
                            실험 모드
                        </h2>

                        <div className="flex bg-gray-800 p-1 rounded-lg mb-4">
                            <button
                                onClick={() => setIsBlindMode(false)}
                                className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${!isBlindMode ? 'bg-gray-700 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                                지정 모드
                            </button>
                            <button
                                onClick={() => setIsBlindMode(true)}
                                className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${isBlindMode ? 'bg-indigo-600 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                                🎲 블라인드 (Random)
                            </button>
                        </div>

                        {!isBlindMode ? (
                            <div className="space-y-4 animate-fade-in-up">
                                <div>
                                    <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Target Asset</label>
                                    <input
                                        type="text"
                                        value={config.asset}
                                        onChange={e => setConfig({ ...config, asset: e.target.value.toUpperCase() })}
                                        className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg p-3 font-mono uppercase"
                                        placeholder="e.g. 005930"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Period (Years)</label>
                                    <select
                                        value={config.period}
                                        onChange={e => setConfig({ ...config, period: Number(e.target.value) })}
                                        className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg p-3"
                                    >
                                        <option value={1}>1 Year (Recent)</option>
                                        <option value={3}>3 Years (Cycle)</option>
                                        <option value={5}>5 Years (Long)</option>
                                        <option value={10}>10 Years (Max)</option>
                                    </select>
                                </div>
                            </div>
                        ) : (
                            <div className="p-4 bg-indigo-900/20 border border-indigo-500/30 rounded-lg animate-fade-in-up">
                                <p className="text-indigo-300 font-bold text-sm mb-1">🎲 완전 무작위 훈련</p>
                                <p className="text-xs text-gray-400">
                                    종목과 기간(6개월~5년)이 랜덤으로 결정됩니다. 편견 없는 순수 실력을 검증하세요.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Advanced Strategy Settings */}
                    <div className="border-t border-gray-800 pt-4">
                        <button
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className="w-full flex justify-between items-center text-gray-400 hover:text-white text-sm font-semibold"
                        >
                            <span>🧬 Strategy Genome (고급)</span>
                            <span>{showAdvanced ? '▲' : '▼'}</span>
                        </button>

                        {showAdvanced && (
                            <div className="mt-4 grid grid-cols-2 gap-3 animate-fade-in-up p-2 bg-black/20 rounded-lg border border-gray-700/50">
                                {/* Trend */}
                                <div className="col-span-2 text-[10px] text-gray-500 uppercase font-bold mt-1">Trend (Moving Avg)</div>
                                <div className="flex flex-col">
                                    <label className="text-xs text-gray-400">MA Short</label>
                                    <input type="number" value={genome.maShort} onChange={e => setGenome({ ...genome, maShort: +e.target.value })} className="bg-gray-800 text-white p-1 rounded text-right text-xs" />
                                </div>
                                <div className="flex flex-col">
                                    <label className="text-xs text-gray-400">MA Long</label>
                                    <input type="number" value={genome.maLong} onChange={e => setGenome({ ...genome, maLong: +e.target.value })} className="bg-gray-800 text-white p-1 rounded text-right text-xs" />
                                </div>

                                {/* Momentum */}
                                <div className="col-span-2 text-[10px] text-gray-500 uppercase font-bold mt-2">Momentum (RSI)</div>
                                <div className="flex flex-col">
                                    <label className="text-xs text-gray-400">Buy &lt;</label>
                                    <input type="number" value={genome.rsiBuy} onChange={e => setGenome({ ...genome, rsiBuy: +e.target.value })} className="bg-gray-800 text-green-400 p-1 rounded text-right text-xs" />
                                </div>
                                <div className="flex flex-col">
                                    <label className="text-xs text-gray-400">Sell &gt;</label>
                                    <input type="number" value={genome.rsiSell} onChange={e => setGenome({ ...genome, rsiSell: +e.target.value })} className="bg-gray-800 text-red-400 p-1 rounded text-right text-xs" />
                                </div>

                                {/* Risk */}
                                <div className="col-span-2 text-[10px] text-gray-500 uppercase font-bold mt-2">Risk Management</div>
                                <div className="flex flex-col">
                                    <label className="text-xs text-gray-400">Stop Loss</label>
                                    <input type="number" step="0.01" value={genome.stopLoss} onChange={e => setGenome({ ...genome, stopLoss: +e.target.value })} className="bg-gray-800 text-red-400 p-1 rounded text-right text-xs" />
                                </div>
                                <div className="flex flex-col">
                                    <label className="text-xs text-gray-400">Take Profit</label>
                                    <input type="number" step="0.01" value={genome.takeProfit} onChange={e => setGenome({ ...genome, takeProfit: +e.target.value })} className="bg-gray-800 text-green-400 p-1 rounded text-right text-xs" />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="mt-auto">
                        <button
                            onClick={startSimulation}
                            disabled={status === 'RUNNING'}
                            className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95 ${status === 'RUNNING'
                                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                                : 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-500 hover:to-blue-500 shadow-cyan-900/20'
                                }`}
                        >
                            {status === 'RUNNING' ? (
                                <>
                                    <RefreshIcon className="w-5 h-5 animate-spin" />
                                    훈련 진행 중...
                                </>
                            ) : (
                                <>
                                    <PlayIcon className="w-5 h-5" />
                                    {isBlindMode ? "블라인드 훈련 시작" : "시뮬레이션 시작"}
                                </>
                            )}
                        </button>
                    </div>

                    {status === 'RUNNING' && (
                        <div>
                            <div className="flex justify-between text-xs text-gray-400 mb-1">
                                <span>Processing: {currentDate}</span>
                                <span>{progress}%</span>
                            </div>
                            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-cyan-500 transition-all duration-300 ease-out"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* 2. Results & Chart Area */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                    {/* Main Chart Card */}
                    <div className="bg-gray-900/50 p-6 rounded-2xl border border-gray-800 backdrop-blur-sm flex-1 min-h-[400px] flex flex-col relative overflow-hidden">
                        {isBlindMode && status !== 'FINISHED' && (
                            <div className="absolute top-4 right-4 z-10 bg-black/50 px-3 py-1 rounded border border-gray-700 text-xs text-gray-400">
                                🕵️ Hidden Asset Mode
                            </div>
                        )}

                        <h2 className="text-lg font-bold text-white mb-4 flex justify-between items-center z-10">
                            <span className="flex items-center gap-2">
                                {status === 'FINISHED' && result?.assetName ? (
                                    <>
                                        <span className="text-lime-400">{result.assetName}</span>
                                        <span className="text-sm text-gray-500">
                                            ({result.periodStart} ~ {result.periodEnd})
                                        </span>
                                    </>
                                ) : (
                                    'Equity Curve'
                                )}
                            </span>
                            <div className="flex items-center gap-3">
                                {status === 'FINISHED' && result && (
                                    <span className={result.finalReturn >= 0 ? "text-green-400 text-xl font-bold" : "text-red-400 text-xl font-bold"}>
                                        {result.finalReturn > 0 ? '+' : ''}{result.finalReturn}%
                                    </span>
                                )}
                            </div>
                        </h2>

                        <div className="relative flex-1 w-full bg-gray-900/30 rounded-lg border border-gray-800 border-dashed flex items-center justify-center overflow-hidden">
                            {status === 'IDLE' ? (
                                <div className="text-gray-600 text-center">
                                    <p className="mb-2 text-4xl">🔭</p>
                                    <p>훈련을 시작하여 직투의 실력을 검증하세요.</p>
                                </div>
                            ) : status === 'RUNNING' ? (
                                <div className="text-cyan-500 animate-pulse text-center">
                                    <p className="text-2xl font-bold mb-2">Analyzing...</p>
                                    <p className="text-sm opacity-70">Computing Identicators & Simulating Trades</p>
                                </div>
                            ) : (
                                // Simple Result Visualization
                                <div className="w-full h-full p-4 flex flex-col">
                                    <div className="flex items-end justify-between h-full gap-1 opacity-80">
                                        {/* Simple distribution of trades or equity curve (Simulated) */}
                                        {/* In real implementatio, integrate Recharts here */}
                                        <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm">
                                            [Chart visualization would appear here]
                                            <br />
                                            <br />
                                            Trades: {result?.logs.length} / MDD: {result?.mdd ?? 0}%
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 3. Logs & Insight */}
                    {status === 'FINISHED' && result && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in-up">
                            {/* Trade Logs */}
                            <div className="bg-gray-900/50 p-6 rounded-2xl border border-gray-800 max-h-[400px] flex flex-col">
                                <h3 className="text-lg font-bold text-white mb-4">📜 매매 일지 ({result.logs.length})</h3>
                                <div className="overflow-y-auto pr-2 custom-scrollbar flex-1 space-y-3">
                                    {result.logs.length === 0 ? (
                                        <p className="text-gray-500 text-center py-10">매매 없음 (조건 불만족)</p>
                                    ) : (
                                        result.logs.map((log, idx) => (
                                            <div key={idx} className="p-3 bg-gray-800 rounded-lg flex flex-col gap-1 border border-gray-700/50 text-sm">
                                                <div className="flex justify-between items-center">
                                                    <span className={`font-bold ${log.action === 'BUY' ? 'text-green-400' : 'text-red-400'}`}>
                                                        {log.action}
                                                    </span>
                                                    <span className="text-gray-500">{log.date}</span>
                                                </div>
                                                <div className="text-gray-300">
                                                    {log.reason}
                                                </div>
                                                {log.profit !== undefined && (
                                                    <div className={`text-right font-bold ${log.profit > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                        {log.profit > 0 ? '+' : ''}{log.profit}%
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Insight */}
                            <div className="bg-gradient-to-br from-indigo-900/40 to-purple-900/40 p-6 rounded-2xl border border-indigo-500/30">
                                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                    <LightbulbIcon className="w-5 h-5 text-yellow-400" />
                                    AI Insight & Evolution
                                </h3>

                                <div className="bg-black/30 p-4 rounded-xl border border-indigo-500/20 mb-4 max-h-[250px] overflow-y-auto custom-scrollbar">
                                    <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                                        {result.insight}
                                    </p>
                                </div>

                                <button
                                    onClick={handleApplyEvolution}
                                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold transition-all shadow-lg shadow-indigo-900/50"
                                >
                                    🧬 Apply Evolution (Update Genome)
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            {/* Strategy Archive Section */}
            <StrategyArchive key={status} />
        </div>
    );
};
