// components/TradingGym.tsx
import React, { useState } from 'react';
import type { StrategyPlaybook } from '../types';
import { BrainIcon } from './icons';
import { LoadingSpinner } from './LoadingSpinner';

interface TradingGymProps {
    playbook: StrategyPlaybook;
}

export const TradingGym: React.FC<TradingGymProps> = ({ playbook }) => {
    const [simResult, setSimResult] = useState<{ pnlPercent: number; outcome: string } | null>(null);
    const [isSimulating, setIsSimulating] = useState(false);

    const handleRunSimulation = () => {
        setIsSimulating(true);
        setSimResult(null);
        // Simulate a network call and random outcome
        setTimeout(() => {
            // Simulate a result based on AI confidence score and some randomness
            const baseSuccessRate = playbook.aiConfidence / 100;
            const randomFactor = (Math.random() - 0.4); // -0.4 to 0.6
            const isSuccess = baseSuccessRate + randomFactor > 0.5;

            // Simulate PNL based on success/failure
            const pnlPercent = isSuccess
                ? (Math.random() * 15 + 5) // Success: +5% to +20%
                : (Math.random() * -10 - 2); // Failure: -2% to -12%
            
            const outcome = isSuccess
                ? `성공: AI 추천 전략에 따라 진입했다면 약 +${pnlPercent.toFixed(1)}%의 수익을 기록했을 것입니다.`
                : `실패: AI 추천 전략에도 불구하고 시장 상황 변화로 약 ${pnlPercent.toFixed(1)}%의 손실을 기록했을 것입니다.`;

            setSimResult({ pnlPercent, outcome });
            setIsSimulating(false);
        }, 1500);
    };

    return (
        <div className="bg-gray-800/70 border border-gray-700 rounded-xl shadow-lg">
            <header className="p-4 bg-gray-900/50 rounded-t-xl text-center">
                <h3 className="text-xl font-bold text-gray-100">AI 트레이딩 짐 (Trading Gym)</h3>
                <p className="text-sm text-gray-400">분석을 행동으로, 경험을 지혜로 바꾸는 훈련 공간입니다.</p>
            </header>
            
            <div className="p-4 text-center">
                <h4 className="text-lg font-bold text-gray-200">"{playbook.strategyName}" 전략 시뮬레이션</h4>
                <p className="text-sm text-gray-400 mt-2 mb-4">AI가 추천한 플레이북에 따라 현재 시점에 진입했다고 가정하고, 미래의 예상 결과를 시뮬레이션합니다.</p>
                <button
                    onClick={handleRunSimulation}
                    disabled={isSimulating}
                    className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold rounded-lg shadow-lg hover:from-purple-700 hover:to-blue-700 transition-transform transform hover:scale-105 disabled:opacity-50"
                >
                    {isSimulating ? '시뮬레이션 중...' : '1주일 후 결과 가상 매매'}
                </button>
                {isSimulating && <div className="mt-4"><LoadingSpinner /></div>}
                {simResult && (
                    <div className={`mt-4 p-4 rounded-lg border ${simResult.pnlPercent > 0 ? 'bg-green-900/30 border-green-700' : 'bg-red-900/30 border-red-700'}`}>
                        <p className="font-bold text-lg">{simResult.outcome}</p>
                    </div>
                )}
            </div>
        </div>
    );
};