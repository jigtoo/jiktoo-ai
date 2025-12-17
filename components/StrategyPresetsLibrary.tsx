// components/StrategyPresetsLibrary.tsx

import React from 'react';
import { STRATEGY_PRESETS, StrategyPreset } from '../services/strategy/StrategyPresets';

interface StrategyPresetsLibraryProps {
    onSelect: (preset: StrategyPreset) => void;
}

export const StrategyPresetsLibrary: React.FC<StrategyPresetsLibraryProps> = ({ onSelect }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-fade-in">
            {STRATEGY_PRESETS.map((preset) => (
                <div
                    key={preset.id}
                    draggable={true}
                    onDragStart={(e) => {
                        e.dataTransfer.setData('application/json', JSON.stringify(preset.logic));
                        e.dataTransfer.setData('text/plain', preset.description);
                        e.dataTransfer.effectAllowed = 'copy';
                    }}
                    className="bg-slate-800 rounded-xl border border-slate-700 p-6 hover:border-purple-500 hover:shadow-purple-500/20 transition-all cursor-grab active:cursor-grabbing group select-none"
                    onClick={() => onSelect(preset)}
                >
                    <div className="flex justify-between items-start mb-3">
                        <div className="bg-purple-900/50 text-purple-300 text-xs px-2 py-1 rounded border border-purple-700/50 font-mono">
                            {preset.author}
                        </div>
                        <span className="text-2xl group-hover:scale-110 transition-transform">🏆</span>
                    </div>

                    <h3 className="text-lg font-bold text-white mb-2 group-hover:text-purple-300 transition-colors">
                        {preset.name}
                    </h3>

                    <p className="text-slate-400 text-sm mb-4 line-clamp-3 h-16">
                        {preset.description}
                    </p>

                    <button className="w-full py-2 bg-slate-700 hover:bg-purple-600 rounded-lg text-sm font-bold text-white transition-colors">
                        템플릿 적용하기
                    </button>
                </div>
            ))}

            {/* Call to Action Card */}
            <div className="bg-slate-800/50 rounded-xl border border-dashed border-slate-600 p-6 flex flex-col items-center justify-center text-center">
                <div className="text-3xl mb-2">🕵️</div>
                <h3 className="text-slate-300 font-bold mb-1">새로운 전략 제보</h3>
                <p className="text-slate-500 text-xs">
                    유명한 전략이나 승률 높은 조건식을 알고 계신가요?<br />
                    커뮤니티에 제보해주시면 직투가 심의 후<br />
                    '명예의 전당'에 추가해드립니다.
                </p>
            </div>
        </div>
    );
};
