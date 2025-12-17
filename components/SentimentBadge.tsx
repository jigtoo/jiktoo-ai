// components/SentimentBadge.tsx
import React from 'react';

interface SentimentBadgeProps {
    score: number; // -1 (매우 부정) to +1 (매우 긍정)
    size?: 'sm' | 'md' | 'lg';
    showLabel?: boolean;
}

export const SentimentBadge: React.FC<SentimentBadgeProps> = ({
    score,
    size = 'md',
    showLabel = true
}) => {
    const getSentiment = (): { label: string; color: string; bgColor: string; icon: string } => {
        if (score >= 0.5) {
            return {
                label: '매우 긍정',
                color: 'text-green-400',
                bgColor: 'bg-green-500/20 border-green-500/50',
                icon: '🔥'
            };
        }
        if (score >= 0.15) {
            return {
                label: '긍정',
                color: 'text-emerald-400',
                bgColor: 'bg-emerald-500/20 border-emerald-500/50',
                icon: '📈'
            };
        }
        if (score > -0.15) {
            return {
                label: '중립',
                color: 'text-gray-400',
                bgColor: 'bg-gray-500/20 border-gray-500/50',
                icon: '➖'
            };
        }
        if (score > -0.5) {
            return {
                label: '부정',
                color: 'text-orange-400',
                bgColor: 'bg-orange-500/20 border-orange-500/50',
                icon: '📉'
            };
        }
        return {
            label: '매우 부정',
            color: 'text-red-400',
            bgColor: 'bg-red-500/20 border-red-500/50',
            icon: '❄️'
        };
    };

    const sentiment = getSentiment();

    const sizeClasses = {
        sm: 'text-xs px-2 py-0.5',
        md: 'text-sm px-3 py-1',
        lg: 'text-base px-4 py-2'
    };

    const iconSizes = {
        sm: 'text-xs',
        md: 'text-sm',
        lg: 'text-lg'
    };

    return (
        <div className={`inline-flex items-center gap-1.5 rounded-full border ${sentiment.bgColor} ${sizeClasses[size]}`}>
            <span className={iconSizes[size]}>{sentiment.icon}</span>
            {showLabel && (
                <span className={`font-semibold ${sentiment.color}`}>
                    {sentiment.label}
                </span>
            )}
            <span className={`text-xs ${sentiment.color} opacity-70`}>
                ({score > 0 ? '+' : ''}{score.toFixed(2)})
            </span>
        </div>
    );
};
