// components/StrategyPlaybookDetailView.tsx
import React from 'react';
import type { StrategyPlaybook } from '../types';
import { ChevronLeftIcon, CheckCircleIcon, XCircleIcon, SparklesIcon, BrainIcon } from './icons';
import { TradingGym } from './TradingGym';

const strategyExplanations = {
    'VCP (변동성 축소 패턴)': {
        explanation: "강한 상승 추세 중인 종목이 여러 차례 조정을 거치며, 각 조정의 폭과 거래량이 점차 줄어드는 패턴입니다. 이는 매도 압력이 소진되고 에너지가 응축되고 있음을 의미하며, 마지막 수축 지점의 저항선을 돌파할 때 폭발적인 상승이 나올 확률이 높습니다.",
        pros: "손절 라인이 명확하고(마지막 수축 지점 하단), 손익비가 매우 좋은 고확률 돌파 전략입니다.",
        cons: "패턴이 완성되기까지 수 주에서 수개월이 걸릴 수 있으며, 약세장에서는 돌파 실패 확률이 높습니다."
    },
    'Cup and Handle (컵앤핸들)': {
        explanation: "주가가 U자형의 완만한 바닥('컵')을 만든 후, 이전 고점 부근에서 짧고 얕은 조정('손잡이')을 거치는 패턴입니다. 충분한 매물 소화 과정을 거쳤기 때문에, 손잡이 상단을 돌파할 때 새로운 상승 추세가 시작될 가능성이 높습니다.",
        pros: "역사적으로 검증된 가장 신뢰도 높은 상승 지속형 패턴 중 하나로, 평균 상승률이 높고 실패율이 낮습니다.",
        cons: "패턴 완성에 수개월이 걸릴 수 있으며, 손잡이 조정이 너무 깊거나 짧으면 실패할 수 있습니다. 돌파 후 단기적으로 가격이 되돌아오는(throwback) 경우가 잦습니다."
    }
};

interface StrategyPlaybookDetailViewProps {
    playbook: StrategyPlaybook;
    onBack: () => void;
}

export const StrategyPlaybookDetailView: React.FC<StrategyPlaybookDetailViewProps> = ({ playbook, onBack }) => {
    const strategyInfo = strategyExplanations[playbook.strategyName];

    return (
        <div className="space-y-8 animate-fade-in">
            <header className="flex items-center gap-4">
                <button onClick={onBack} className="p-2 bg-gray-700 rounded-full hover:bg-gray-600">
                    <ChevronLeftIcon className="h-6 w-6" />
                </button>
                <div>
                    <h2 className="text-3xl font-bold text-white">{playbook.stockName}</h2>
                    <p className="text-lg font-semibold text-cyan-300">{playbook.strategyName} 분석</p>
                </div>
            </header>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Strategy Info */}
                <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700 space-y-4">
                     <div>
                        <h3 className="flex items-center gap-2 text-xl font-bold text-gray-200 mb-2"><SparklesIcon />전략 해설</h3>
                        <p className="text-sm text-gray-300">{strategyInfo.explanation}</p>
                    </div>
                    <div>
                        <h4 className="font-semibold text-green-400">장점</h4>
                        <p className="text-sm text-gray-400">{strategyInfo.pros}</p>
                    </div>
                     <div>
                        <h4 className="font-semibold text-red-400">단점</h4>
                        <p className="text-sm text-gray-400">{strategyInfo.cons}</p>
                    </div>
                </div>

                {/* AI Checklist */}
                <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                    <h3 className="flex items-center gap-2 text-xl font-bold text-gray-200 mb-3"><BrainIcon />AI 분석 체크리스트</h3>
                    <div className="space-y-3">
                        {playbook.analysisChecklist.map((item, index) => (
                            <div key={index} className="flex items-start gap-3 p-2 bg-gray-900/50 rounded-md">
                                <div className="flex-shrink-0 mt-0.5">
                                    {item.isMet ? <CheckCircleIcon className="h-5 w-5 text-green-400" /> : <XCircleIcon className="h-5 w-5 text-red-400" />}
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-200">{item.criterion}</p>
                                    <p className="text-xs text-gray-400">{item.details}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <TradingGym playbook={playbook} />

        </div>
    );
};
