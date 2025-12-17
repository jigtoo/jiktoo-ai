// components/OptimizationDashboard.tsx
import React, { useEffect, useState } from 'react';
import { strategyOptimizationService, OptimizationProposal } from '../services/StrategyOptimizationService';

export const OptimizationDashboard: React.FC = () => {
    const [proposals, setProposals] = useState<OptimizationProposal[]>([]);
    const [loading, setLoading] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);

    useEffect(() => {
        loadProposals();
    }, []);

    const loadProposals = async () => {
        setLoading(true);
        try {
            const data = await strategyOptimizationService.getAllProposals();
            setProposals(data);
        } catch (err) {
            console.error('[OptimizationDashboard] Failed to load proposals:', err);
        } finally {
            setLoading(false);
        }
    };

    const runAnalysis = async () => {
        setAnalyzing(true);
        try {
            const newProposals = await strategyOptimizationService.analyzeAndPropose();
            if (newProposals.length > 0) {
                alert(`✅ ${newProposals.length}개의 최적화 제안이 생성되었습니다!`);
                await loadProposals();
            } else {
                alert('⚠️ 분석할 데이터가 부족하거나 최적화 제안이 없습니다.');
            }
        } catch (err) {
            console.error('[OptimizationDashboard] Analysis failed:', err);
            alert('❌ 분석 중 오류가 발생했습니다.');
        } finally {
            setAnalyzing(false);
        }
    };

    const approveProposal = async (id: string) => {
        if (!confirm('이 최적화 제안을 승인하시겠습니까?')) return;

        const success = await strategyOptimizationService.approveProposal(id);
        if (success) {
            alert('✅ 제안이 승인되었습니다!');
            await loadProposals();
        } else {
            alert('❌ 승인 중 오류가 발생했습니다.');
        }
    };

    const rejectProposal = async (id: string) => {
        if (!confirm('이 최적화 제안을 거부하시겠습니까?')) return;

        const success = await strategyOptimizationService.rejectProposal(id);
        if (success) {
            alert('✅ 제안이 거부되었습니다.');
            await loadProposals();
        } else {
            alert('❌ 거부 중 오류가 발생했습니다.');
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'PROPOSED':
                return <span className="px-2 py-1 bg-yellow-600 text-white text-xs rounded">제안됨</span>;
            case 'APPROVED':
                return <span className="px-2 py-1 bg-green-600 text-white text-xs rounded">승인됨</span>;
            case 'REJECTED':
                return <span className="px-2 py-1 bg-red-600 text-white text-xs rounded">거부됨</span>;
            case 'ACTIVE':
                return <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded">활성화</span>;
            default:
                return <span className="px-2 py-1 bg-gray-600 text-white text-xs rounded">{status}</span>;
        }
    };

    const getTargetName = (target: string) => {
        switch (target) {
            case 'SNIPER_TRIGGER_VOLUME':
                return '거래량 임계값';
            case 'SNIPER_TRIGGER_VOLATILITY':
                return '변동성 임계값';
            case 'POSITION_SIZE':
                return '포지션 크기';
            case 'TAKE_PROFIT':
                return '익절 포인트';
            case 'STOP_LOSS':
                return '손절 포인트';
            default:
                return target;
        }
    };

    if (loading) {
        return (
            <div className="bg-gray-900 text-white p-6 rounded-xl border border-gray-700">
                <div className="text-center">로딩 중...</div>
            </div>
        );
    }

    return (
        <div className="bg-gray-900 text-white p-6 rounded-xl border border-gray-700">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">
                        🤖 AI 전략 최적화
                    </h2>
                    <p className="text-xs text-gray-400 mt-1">Gemini가 과거 데이터를 분석하여 최적 파라미터를 제안합니다</p>
                </div>
                <button
                    onClick={runAnalysis}
                    disabled={analyzing}
                    className={`px-4 py-2 rounded-lg font-semibold transition-all ${analyzing
                            ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                            : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white'
                        }`}
                >
                    {analyzing ? '분석 중...' : '🔍 새 분석 실행'}
                </button>
            </div>

            {/* Proposals List */}
            {proposals.length === 0 ? (
                <div className="bg-gray-800 p-8 rounded-lg text-center">
                    <p className="text-gray-400 mb-4">아직 최적화 제안이 없습니다.</p>
                    <p className="text-sm text-gray-500">
                        "새 분석 실행" 버튼을 클릭하여 AI 분석을 시작하세요.
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {proposals.map((proposal) => (
                        <div
                            key={proposal.id}
                            className="bg-gray-800 p-4 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors"
                        >
                            {/* Proposal Header */}
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h3 className="text-lg font-bold text-white">
                                        {getTargetName(proposal.optimizationTarget)}
                                    </h3>
                                    <p className="text-xs text-gray-400 mt-1">
                                        분석 거래 수: {proposal.analyzedTrades}건
                                    </p>
                                </div>
                                {getStatusBadge(proposal.status)}
                            </div>

                            {/* Performance Improvement */}
                            <div className="grid grid-cols-3 gap-3 mb-3">
                                <div className="bg-gray-900 p-3 rounded">
                                    <div className="text-xs text-gray-400">이전 승률</div>
                                    <div className="text-lg font-mono text-white">
                                        {proposal.winRateBefore.toFixed(1)}%
                                    </div>
                                </div>
                                <div className="bg-gray-900 p-3 rounded">
                                    <div className="text-xs text-gray-400">예상 승률</div>
                                    <div className="text-lg font-mono text-green-400">
                                        {proposal.winRateAfter.toFixed(1)}%
                                    </div>
                                </div>
                                <div className="bg-gray-900 p-3 rounded">
                                    <div className="text-xs text-gray-400">개선</div>
                                    <div className="text-lg font-mono text-yellow-400">
                                        +{proposal.performanceImprovement.toFixed(1)}%
                                    </div>
                                </div>
                            </div>

                            {/* Parameter Changes */}
                            <div className="bg-gray-900 p-3 rounded mb-3">
                                <div className="text-xs text-gray-400 mb-2">파라미터 변경</div>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div>
                                        <span className="text-gray-500">이전: </span>
                                        <span className="text-white font-mono">
                                            {JSON.stringify(proposal.previousParams)}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">제안: </span>
                                        <span className="text-green-400 font-mono">
                                            {JSON.stringify(proposal.newParams)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Reasoning */}
                            <div className="bg-gray-900 p-3 rounded mb-3">
                                <div className="text-xs text-gray-400 mb-2">AI 분석 근거</div>
                                <p className="text-sm text-gray-300 leading-relaxed">
                                    {proposal.reasoning}
                                </p>
                            </div>

                            {/* Actions */}
                            {proposal.status === 'PROPOSED' && proposal.id && (
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => approveProposal(proposal.id!)}
                                        className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-white font-semibold transition-colors"
                                    >
                                        ✅ 승인
                                    </button>
                                    <button
                                        onClick={() => rejectProposal(proposal.id!)}
                                        className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-white font-semibold transition-colors"
                                    >
                                        ❌ 거부
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
