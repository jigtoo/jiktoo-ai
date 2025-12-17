

import React from 'react';
import { CloseIcon, LogoIcon } from './icons';

interface AppGuideProps {
    onClose: () => void;
}

export const AppGuide: React.FC<AppGuideProps> = ({ onClose }) => {
    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
            <div className="bg-gray-800 border border-cyan-500/30 rounded-xl shadow-2xl w-full max-w-2xl m-4 flex flex-col" style={{maxHeight: '90vh'}} onClick={e => e.stopPropagation()}>
                <header className="p-4 flex justify-between items-center border-b border-gray-700 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <LogoIcon className="h-6 w-6" />
                        <h2 className="text-xl font-bold text-white">직투 선언문 (Manifesto)</h2>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-600">
                        <CloseIcon className="h-6 w-6" />
                    </button>
                </header>
                
                <div className="p-6 text-gray-300 leading-relaxed space-y-4 overflow-y-auto">
                    <p className="text-2xl font-bold text-cyan-400">"시간이 무기다. 당신의 시간을 아껴주는 투자를 하라."</p>

                    <p>
                        성공적인 투자는 시장을 하루 종일 들여다보는 것이 아니라, 명확한 원칙과 전략으로 꾸준히 실행하는 데서 나옵니다.
                        하지만 바쁜 일상 속에서 직장인 투자자가 기업을 분석하고, 시장의 소음을 걸러내고, 최적의 타이밍을 잡는 것은 결코 쉽지 않은 일이었습니다.
                    </p>

                    <div className="p-4 bg-gray-900/50 rounded-lg border-l-4 border-cyan-500">
                        <p className="font-semibold text-white">
                            '직투'는 당신의 가장 소중한 자산인 '시간'을 지키기 위해 태어났습니다.
                        </p>
                    </div>

                    <p>
                        우리는 흩어진 정보를 모으고, 복잡한 데이터를 해석하고, 투자 대가의 통찰력을 학습한 AI 투자 동반자를 제공합니다. 당신은 더 이상 정보의 홍수 속에서 길을 잃을 필요가 없습니다.
                    </p>

                    <ol className="list-decimal list-inside space-y-3 pl-2">
                        <li>
                            <strong className="text-white">퇴근 후 30분, AI 브리핑:</strong> 당신이 하루의 업무를 마칠 때, AI는 시장의 모든 것을 분석해 핵심만 담은 브리핑을 준비합니다. 무엇을(What) 사야 할지에 대한 질적 분석과, 언제(When) 사야 할지에 대한 양적 분석을 한눈에 파악하세요.
                        </li>
                        <li>
                            <strong className="text-white">당신만의 투자 원칙 수립:</strong> AI는 정답을 알려주는 것이 아니라, 당신이 자신만의 투자 원칙을 세우고 지켜나갈 수 있도록 돕는 파트너입니다. 시나리오를 만들고, 대응 전략을 세우고, 감정에 휘둘리지 않는 투자를 경험하세요.
                        </li>
                    </ol>

                    <p>
                        결론적으로 '직투'는 정답을 알려주는 예측 기계가 아닙니다. 우리는 AI가 제시하는 데이터 기반의 가설과 시나리오를 통해, 당신이 시장을 더 깊이 '공부'하고, 자신만의 '이기는 원칙'을 세워나가는 과정을 돕는 최첨단 '학습 파트너'입니다. 투자의 본질은 예측이지만, 그 예측의 주인공은 AI가 아닌 바로 당신이 되어야 합니다.
                    </p>

                    <div className="pt-4 mt-4 border-t border-gray-700/50">
                        <p className="text-xl font-bold text-cyan-400">정밀한 투자의 미학: 실시간 데이터 활용법</p>
                        <p className="mt-2">
                            '직투'는 이제 실시간 시세를 활용합니다. 하지만 이는 당신을 충동적인 단타 매매로 이끌기 위함이 아닙니다.
                            우리는 실시간 데이터를 시장의 소음이 아닌, 잘 짜여진 스윙/중장기 전략을 '정밀하게' 실행하기 위한 강력한 도구로 사용합니다.
                            '직투'는 여전히 당신이 호가창의 노이즈에서 벗어나, 시장의 큰 추세와 원칙에 집중하도록 돕습니다. 이는 당신의 소중한 시간을 아끼고, 더 현명하고 차분한 투자 결정을 내리게 하는 저희의 핵심 철학입니다.
                        </p>
                    </div>
                    
                    <p className="font-bold text-lg text-center text-white pt-4">
                        '직투'는 당신의 시간을 돈보다 소중히 여깁니다.
                    </p>
                    
                     <p className="text-center pt-6 mt-6 border-t border-gray-700">
                        우리는 당신이 본업에 집중하면서도, 성공적인 투자의 길을 걸을 수 있도록 돕겠습니다.
                    </p>
                </div>
            </div>
        </div>
    );
};