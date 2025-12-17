


import React from 'react';
import { LogoIcon } from './icons';
import type { MarketTarget } from '../types';

interface WelcomeGuideProps {
    marketTarget: MarketTarget;
}

export const WelcomeGuide: React.FC<WelcomeGuideProps> = ({ marketTarget }) => {
    const borderColor = marketTarget === 'US' ? 'border-orange-500/50' : 'border-cyan-500/50';
    const textColor = marketTarget === 'US' ? 'text-orange-400' : 'text-cyan-400';

    return (
        <div className="p-6 bg-gray-800/50 border border-gray-700/50 rounded-xl text-center mb-8 animate-fade-in">
            <h2 className="text-2xl font-bold text-gray-100 mb-2">직장인 투자자님, '직투'에 오신 것을 환영합니다!</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
                AI가 당신의 소중한 시간을 아껴주는 든든한 투자 동반자가 되어 드립니다.
            </p>
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className={`bg-gray-700/50 p-4 rounded-lg border ${borderColor} shadow-lg`}>
                    <p className={`font-bold text-lg ${textColor} mb-1`}>1단계: 시장 온도 체크</p>
                    <p className="font-semibold text-gray-200">'시장 현황 분석' 버튼을 눌러</p>
                    <p className="text-gray-400 mt-1">지금이 투자하기 좋은 때인지 AI의 브리핑을 받으세요.</p>
                </div>
                <div className={`bg-gray-700/50 p-4 rounded-lg border ${borderColor} shadow-lg`}>
                    <p className={`font-bold text-lg ${textColor} mb-1`}>2단계: 유망주 탐색</p>
                    <p className="font-semibold text-gray-200">'AI 추천 종목' 또는 'AI 유망주 포착'의</p>
                    <p className="text-gray-400 mt-1">스캔 버튼으로 오늘 주목할 종목을 찾아보세요.</p>
                </div>
            </div>
        </div>
    );
};