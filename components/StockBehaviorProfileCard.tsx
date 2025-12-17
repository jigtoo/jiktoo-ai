import React from 'react';
import type { StockBehaviorProfile } from '../types';
import { BrainIcon, TargetIcon, SparklesIcon, PulseIcon, StrategyIcon } from './icons';

interface StockBehaviorProfileCardProps {
    profile: StockBehaviorProfile;
}

const Section: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => (
    <div className="bg-gray-900/40 p-3 rounded-lg">
        <h4 className="flex items-center gap-2 font-bold text-cyan-300 mb-2">
            {icon}
            <span>{title}</span>
        </h4>
        <div className="text-sm text-gray-300 space-y-2">
            {children}
        </div>
    </div>
);


export const StockBehaviorProfileCard: React.FC<StockBehaviorProfileCardProps> = ({ profile }) => {
    return (
        <div className="bg-gray-800/70 border border-gray-700 rounded-xl shadow-lg h-full flex flex-col">
            <header className="p-4 bg-gray-900/50 rounded-t-xl text-center">
                <h3 className="text-xl font-bold text-gray-100">AI 종목 프로파일링</h3>
                <p className="text-sm text-gray-400">종목의 고유한 기술적 '성격'과 '버릇'을 분석합니다.</p>
            </header>
            <div className="p-4 space-y-4">
                <div className="p-3 bg-gray-900/40 rounded-lg border-l-4 border-purple-500">
                    <h4 className="flex items-center gap-2 font-bold text-purple-300 mb-1">
                        <BrainIcon className="h-5 w-5" /> 프로파일 요약
                    </h4>
                    <p className="text-sm text-gray-300 italic">"{profile.profileSummary}"</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Section title="핵심 레벨" icon={<TargetIcon className="h-5 w-5"/>}>
                        <ul className="space-y-2">
                            {profile.keyLevels.map((item, index) => (
                                <li key={index}>
                                    <p className="font-semibold text-gray-200">{item.level}</p>

                                    <p className="text-xs text-gray-400 pl-2">{item.description}</p>
                                </li>
                            ))}
                        </ul>
                    </Section>
                     <Section title="주요 시그널" icon={<SparklesIcon className="h-5 w-5"/>}>
                         <ul className="space-y-2">
                            {profile.majorSignals.map((item, index) => (
                                <li key={index}>
                                    <p className="font-semibold text-gray-200">{item.signal}</p>
                                    <p className="text-xs text-gray-400 pl-2">{item.interpretation}</p>
                                </li>
                            ))}
                        </ul>
                    </Section>
                </div>

                 <Section title="변동성 프로파일" icon={<PulseIcon className="h-5 w-5"/>}>
                     <div className="flex items-center gap-4">
                        <p className="text-3xl font-bold font-mono text-cyan-300">{profile.volatility.atrPercent.toFixed(2)}%</p>
                        <p className="text-xs text-gray-400">{profile.volatility.analysis}</p>
                     </div>
                </Section>

                <Section title="AI 매매 전략 제안" icon={<StrategyIcon className="h-5 w-5"/>}>
                    <p className="text-gray-200 leading-relaxed">{profile.tradingStrategy}</p>
                </Section>
            </div>
        </div>
    );
};
