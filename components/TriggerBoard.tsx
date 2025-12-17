import React from 'react';
import type { TriggerBoard as TriggerBoardType } from '../types';
import { NewsIcon, ChartIcon, FlowIcon, BrainIcon } from './icons';

interface TriggerBoardProps {
    board: TriggerBoardType;
}

const TriggerIndicator: React.FC<{ label: string; isOn: boolean; icon: React.ReactNode }> = ({ label, isOn, icon }) => {
    const onColor = 'bg-green-500 shadow-[0_0_10px_2px_rgba(52,211,153,0.5)]';
    const offColor = 'bg-red-500 shadow-[0_0_10px_2px_rgba(239,68,68,0.5)]';
    
    return (
        <div className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg">
            <div className="flex items-center gap-3">
                {icon}
                <span className="font-semibold text-gray-200">{label}</span>
            </div>
            <div className="flex items-center gap-2">
                <span className={`w-4 h-4 rounded-full border-2 border-gray-900 transition-all ${isOn ? onColor : offColor}`}></span>
                <span className={`font-bold text-sm ${isOn ? 'text-green-300' : 'text-red-300'}`}>{isOn ? '켜짐' : '꺼짐'}</span>
            </div>
        </div>
    );
};


export const TriggerBoard: React.FC<TriggerBoardProps> = ({ board }) => {
    return (
        <div className="bg-gray-800/70 border border-gray-700 rounded-xl shadow-lg h-full">
            <header className="p-4 bg-gray-900/50 rounded-t-xl text-center">
                <h3 className="text-xl font-bold text-gray-100">트리거 보드 (Trigger Board)</h3>
            </header>
            <div className="p-4 space-y-3">
                <TriggerIndicator label="뉴스 & 재료" isOn={board.news === '켜짐'} icon={<NewsIcon className="h-6 w-6 text-sky-400" />} />
                <TriggerIndicator label="기술적 분석" isOn={board.technical === '켜짐'} icon={<ChartIcon className="h-6 w-6 text-teal-400" />} />
                <TriggerIndicator label="수급" isOn={board.supply === '켜짐'} icon={<FlowIcon className="h-6 w-6 text-cyan-400" />} />
                <TriggerIndicator label="시장 심리" isOn={board.psychology === '켜짐'} icon={<BrainIcon className="h-6 w-6 text-purple-400" />} />
            </div>
        </div>
    );
};