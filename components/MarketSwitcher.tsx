
import React from 'react';
import type { MarketTarget } from '../types';
import { SouthKoreaFlagIcon, UsaFlagIcon } from './icons';

interface MarketSwitcherProps {
    currentMarket: MarketTarget;
    onMarketChange: (newMarket: MarketTarget) => void;
    disabled?: boolean;
}

export const MarketSwitcher: React.FC<MarketSwitcherProps> = ({ currentMarket, onMarketChange, disabled }) => {
    
    const baseStyle = "flex items-center gap-2 px-3 py-2 text-sm font-bold transition-colors duration-200";
    
    const krActiveStyle = "text-white bg-cyan-600/50 shadow-inner";
    const usActiveStyle = "text-white bg-gradient-to-r from-orange-500 to-yellow-500 shadow-inner";

    const inactiveStyle = "text-gray-400 bg-gray-800/50 hover:bg-gray-700/50";

    return (
        <div className={`flex p-1 bg-gray-900/50 rounded-lg ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <button
                onClick={() => onMarketChange('KR')}
                className={`${baseStyle} rounded-l-md ${currentMarket === 'KR' ? krActiveStyle : inactiveStyle}`}
                aria-pressed={currentMarket === 'KR'}
                disabled={disabled}
            >
                <SouthKoreaFlagIcon className="h-4 w-6 rounded-sm" />
                <span>대한민국</span>
            </button>
            <button
                onClick={() => onMarketChange('US')}
                className={`${baseStyle} rounded-r-md ${currentMarket === 'US' ? usActiveStyle : inactiveStyle}`}
                aria-pressed={currentMarket === 'US'}
                disabled={disabled}
            >
                <UsaFlagIcon className="h-4 w-6 rounded-sm" />
                <span>미국</span>
            </button>
        </div>
    );
};