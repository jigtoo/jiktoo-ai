import React, { useState, useMemo } from 'react';
import type { PriceStrategyMapEntry } from '../types';
import { StopLossIcon, TargetIcon, ValueIcon } from './icons';

interface StrategyMapViewProps {
    strategyMap: PriceStrategyMapEntry[];
    currentPrice: number;
    currency: string;
}

const parsePrice = (priceStr: string): number | null => {
    if (!priceStr || typeof priceStr !== 'string') return null;
    const cleaned = priceStr.replace(/,/g, '').match(/[\d.]+/);
    if (!cleaned) return null;
    const num = parseFloat(cleaned[0]);
    return isNaN(num) ? null : num;
}

export const StrategyMapView: React.FC<StrategyMapViewProps> = ({ strategyMap, currentPrice, currency }) => {
    
    const [activeIndex, setActiveIndex] = useState<number>(() => {
        const pivotIndex = strategyMap.findIndex(z => z.zone.includes('피벗') || z.zone.includes('코어'));
        return pivotIndex > -1 ? pivotIndex : Math.floor(strategyMap.length / 2);
    });

    const { overallMin, overallMax, zonesWithBounds } = useMemo(() => {
        const parsedZones = strategyMap.map(zone => {
            const parts = zone.priceRange.split('~').map(s => s.trim());
            const min = parsePrice(parts[0]);
            let max = parts.length > 1 ? parsePrice(parts[1]) : null;
            if (min !== null && max === null && (parts[1] === '' || parts.length === 1)) {
                 // Open-ended range like "200,000원 ~"
                max = Infinity;
            }
            return { ...zone, min, max };
        });

        const zonesWithInferredBounds = parsedZones.map((zone, index) => {
             let { min, max } = zone;
            if (min === null && index > 0) {
                min = parsedZones[index - 1].max;
            }
            if (max === null && index < parsedZones.length - 1) {
                max = parsedZones[index + 1].min;
            }
            return { ...zone, min, max };
        });

        let minBound = zonesWithInferredBounds[0]?.min;
        let maxBound = zonesWithInferredBounds[zonesWithInferredBounds.length - 1]?.max;

        if(minBound === null || !isFinite(minBound)){
             minBound = currentPrice * 0.7;
        }

        if(maxBound === null || !isFinite(maxBound)){
            const lastFiniteMax = [...zonesWithInferredBounds].reverse().find(z => z.max !== null && isFinite(z.max));
            maxBound = lastFiniteMax?.max ? lastFiniteMax.max * 1.3 : currentPrice * 1.3;
        }

        return { overallMin: minBound, overallMax: maxBound, zonesWithBounds: zonesWithInferredBounds };
    }, [strategyMap, currentPrice]);

    const totalRange = overallMax - overallMin;

    const getPositionPercent = (price: number) => {
        if (totalRange <= 0) return 50;
        const relativePosition = (price - overallMin) / totalRange;
        return Math.max(0, Math.min(100, relativePosition * 100));
    };

    const currentPricePosition = getPositionPercent(currentPrice);

    const zoneColors = [
        'border-purple-500/80 bg-purple-900/50',
        'border-indigo-500/80 bg-indigo-900/50',
        'border-cyan-500/80 bg-cyan-900/50',
        'border-green-500/80 bg-green-900/50',
        'border-teal-500/80 bg-teal-900/50',
        'border-orange-500/80 bg-orange-900/50',
    ];
    
    const activeZone = zonesWithBounds[activeIndex];

    return (
        <div className="flex flex-col md:flex-row gap-6 p-2 md:p-4 bg-gray-900/50 rounded-lg">
            {/* Bar */}
            <div className="relative w-full md:w-48 flex-shrink-0 h-96 md:h-[450px]">
                {zonesWithBounds.map((zone, index) => {
                    const zoneMin = zone.min ?? (index > 0 ? zonesWithBounds[index-1].max ?? overallMin : overallMin);
                    let zoneMax = zone.max ?? (index < zonesWithBounds.length -1 ? zonesWithBounds[index+1].min ?? overallMax : overallMax);
                    
                    if (!isFinite(zoneMax)) {
                        zoneMax = overallMax;
                    }

                    const bottom = getPositionPercent(zoneMin);
                    const top = 100 - getPositionPercent(zoneMax);
                    const height = 100 - bottom - top;

                    return (
                        <div
                            key={index}
                            onClick={() => setActiveIndex(index)}
                            className={`absolute w-full p-2 flex flex-col justify-center text-center cursor-pointer border-2 transition-all duration-300 ${activeIndex === index ? 'border-white shadow-lg scale-105 z-10' : zoneColors[index % zoneColors.length]}`}
                            style={{ bottom: `${bottom}%`, height: `${height}%` }}
                        >
                            <p className="font-bold text-sm text-white">{zone.zone}</p>
                            <p className="text-xs font-mono text-gray-400">{zone.priceRange}</p>
                        </div>
                    );
                })}
                {/* Current Price Indicator */}
                 <div className="absolute w-full flex items-center z-20" style={{ bottom: `calc(${currentPricePosition}% - 8px)` }}>
                    <div className="h-px bg-yellow-300 w-full"></div>
                    <div className="absolute left-full ml-2 px-2 py-0.5 bg-yellow-300 text-black text-xs font-bold rounded">
                        현재가
                    </div>
                </div>
            </div>

            {/* Details */}
            <div className="flex-grow bg-gray-800/50 rounded-lg p-4">
                {activeZone ? (
                    <div className="space-y-4 animate-fade-in">
                        <h3 className="text-2xl font-bold text-white">{activeZone.zone} 전략</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="bg-gray-700/50 p-3 rounded-lg"><h4 className="flex items-center gap-2 text-sm text-gray-400"><ValueIcon/>전략 비중</h4><p className="text-lg font-bold text-cyan-300">{activeZone.strategyWeight}</p></div>
                            <div className="bg-gray-700/50 p-3 rounded-lg"><h4 className="flex items-center gap-2 text-sm text-gray-400"><StopLossIcon/>손절 기준</h4><p className="text-lg font-bold text-red-300">{activeZone.stopLossCriteria}</p></div>
                            <div className="bg-gray-700/50 p-3 rounded-lg"><h4 className="flex items-center gap-2 text-sm text-gray-400"><TargetIcon/>1차 목표</h4><p className="text-lg font-bold text-green-300">{activeZone.firstTarget}</p></div>
                            <div className="bg-gray-700/50 p-3 rounded-lg"><h4 className="flex items-center gap-2 text-sm text-gray-400"><TargetIcon/>2차 목표</h4><p className="text-lg font-bold text-green-300">{activeZone.secondTarget || 'N/A'}</p></div>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                        <p>전략을 보려면 왼쪽 막대에서 구간을 선택하세요.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
