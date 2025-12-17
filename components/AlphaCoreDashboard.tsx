// copy-of-sepa-ai/components/AlphaCoreDashboard.tsx
import React from 'react';
import { generateMockBriefing } from '../services/gemini/marketLogicService';
import type { useAlphaCore } from '../hooks/useAlphaCore';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorDisplay } from './ErrorDisplay';
import { BrainIcon, RefreshIcon } from './icons';

interface AlphaCoreDashboardProps {
    alphaCore: ReturnType<typeof useAlphaCore>;
}

export const AlphaCoreDashboard: React.FC<AlphaCoreDashboardProps> = ({ alphaCore }) => {
    const { result, isLoading, error, runScan } = alphaCore;

    const handleTestBriefing = async () => {
        if (confirm('한국(KR) 및 미국(US) 모닝 브리핑 테스트 메시지를 텔레그램으로 발송하시겠습니까?')) {
            await generateMockBriefing('KR');
            setTimeout(() => generateMockBriefing('US'), 2000); // 2초 후 미국 발송
            alert('발송 요청 완료! 텔레그램을 확인하세요.');
        }
    };

    const renderContent = () => {
        if (isLoading) {
            return <LoadingSpinner message="알파 코어 연산 중... 5-Factor 분석... MDA 가중치 적용..." showWittyMessages={false} />;
        }

        if (error) {
            return <ErrorDisplay title="알파 코어 연산 실패" message={error} onRetry={runScan} />;
        }

        if (result) {
            const { final_pick, pr_route, alpha_decay_flag } = result;

            // Convert score to actionable signal
            const score = final_pick.scores.adjusted_score;
            let signal: string;
            let signalColor: string;
            let signalBg: string;
            let signalIcon: string;

            if (score >= 70) {
                signal = 'BUY';
                signalColor = 'text-green-400';
                signalBg = 'bg-green-500/20 border-green-500';
                signalIcon = '📈';
            } else if (score >= 40) {
                signal = 'HOLD';
                signalColor = 'text-yellow-400';
                signalBg = 'bg-yellow-500/20 border-yellow-500';
                signalIcon = '⏸️';
            } else {
                signal = 'SELL';
                signalColor = 'text-red-400';
                signalBg = 'bg-red-500/20 border-red-500';
                signalIcon = '📉';
            }

            const rationaleTags = [];
            if (final_pick.scores.M >= 20) rationaleTags.push('모멘텀(M) 최대');
            if (alpha_decay_flag) rationaleTags.push('알파 붕괴 상태 적용');

            const translatePrStep = (step: string): string => {
                // This is a simple replacement, a more robust i18n solution could be used for a real app.
                return step
                    .replace("No candidates found with score_cut", "점수 커트라인")
                    .replace("No candidates found.", "후보 없음.")
                    .replace("Fallback attempt", "폴백 시도")
                    .replace("Lowered score_cut to", "커트라인 하향 조정:")
                    .replace("Board/Cap switch not applicable with provided universe.", "시장/시총 전환 불가.")
                    .replace("ETF replacement failed due to missing momentum data.", "ETF 대체 실패 (모멘텀 데이터 부족).")
                    .replace("Final fallback: Selected the highest-scoring stock from the universe as no candidates met the criteria and all PR steps were exhausted.", "최종 폴백: 기준 충족 후보가 없어 유니버스 내 최고 점수 종목 선택.");
            };

            return (
                <div className="bg-gray-800/70 border border-cyan-500 rounded-xl shadow-2xl p-6 animate-fade-in">
                    <h3 className="text-center text-xl font-bold text-white mb-2">{final_pick.name} ({final_pick.ticker})</h3>
                    <div className="text-center mb-4">
                        <p className="text-sm text-gray-400 mb-2">투자 신호 (Investment Signal)</p>
                        <div className={`inline-flex items-center justify-center px-8 py-4 rounded-xl border-4 ${signalBg}`}>
                            <span className="text-3xl mr-2">{signalIcon}</span>
                            <span className={`text-4xl font-black ${signalColor}`}>{signal}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">신뢰도: {score.toFixed(1)}점</p>

                        {/* Clear explanation of Alpha Core's purpose */}
                        <div className="mt-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg text-left">
                            <p className="text-xs text-blue-300 font-semibold mb-1">📘 알파 코어란?</p>
                            <p className="text-xs text-gray-300 leading-relaxed">
                                5-Factor 퀀트 분석 기반 <strong>중장기 투자 신호</strong>입니다.
                                스나이퍼 트리거(단기 모멘텀)와 다른 관점에서 분석하므로 신호가 다를 수 있습니다.
                                <br />
                                <span className="text-blue-200">• 중장기 관점: 수일~수주 보유</span><br />
                                <span className="text-blue-200">• 퀀트 기반: 모멘텀, 밸류, 퀄리티 등 5가지 팩터</span>
                            </p>
                        </div>
                    </div>

                    {rationaleTags.length > 0 && (
                        <div className="flex flex-wrap gap-2 justify-center mb-4">
                            {rationaleTags.map(tag => (
                                <span key={tag} className="px-2 py-1 text-xs font-semibold bg-gray-700 text-gray-300 rounded-md">{tag}</span>
                            ))}
                        </div>
                    )}

                    {pr_route.used && (
                        <div className="p-3 bg-gray-900/50 rounded-md text-xs text-gray-400 mb-4">
                            <p className="font-bold text-gray-300">PR 루틴 (대체 후보 선정 과정):</p>
                            <p>{pr_route.steps.map(translatePrStep).join(' → ')}</p>
                        </div>
                    )}

                    <button onClick={runScan} className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-white font-semibold rounded-lg shadow-md hover:bg-gray-500 transition-colors">
                        <RefreshIcon />
                        재연산
                    </button>
                </div>
            );
        }

        // Initial state
        return (
            <button
                onClick={runScan}
                className="w-full h-full flex items-center justify-center gap-4 px-8 py-10 bg-gradient-to-br from-gray-800 to-gray-900 text-white font-bold text-2xl rounded-xl shadow-lg border border-gray-700 hover:border-cyan-500 transition-all transform hover:scale-105"
            >
                <BrainIcon className="h-10 w-10 text-cyan-400" />
                <span>[ 알파 코어 가동 ]</span>
            </button>
        );
    };

    return (
        <div className="mb-12">
            <header className="text-center mb-6">
                <h2 className="text-3xl font-bold text-gray-100">알파 코어 (Alpha Core)</h2>
                <p className="text-gray-400 max-w-2xl mx-auto mt-1">
                    모든 분석 모듈을 총동원하여 '오늘의 단 하나의 최종 결론'을 도출합니다.
                </p>
                {/* Added mock briefing button */}
                <button
                    onClick={handleTestBriefing}
                    className="mt-4 px-3 py-1 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-full transition-colors"
                >
                    🔔 모닝브리핑 테스트
                </button>
            </header>
            <div className="max-w-md mx-auto min-h-[200px] flex flex-col justify-center">
                {renderContent()}
            </div>
        </div>
    );
};
