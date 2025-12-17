


import React, { useState, useEffect } from 'react';

interface LoadingSpinnerProps {
    progress?: number; // 0 to 100
    message?: string;
    showWittyMessages?: boolean;
    // FIX: Add optional className to allow custom styling from parent components.
    className?: string;
}

const wittyMessages = [
  "워렌 버핏에게 조언을 구하는 중...",
  "차트에서 황금 비율을 찾는 중...",
  "미래를 예측하는 중... (농담입니다)",
  "기관 투자자의 비밀 노트를 훔쳐보는 중...",
  "AI가 커피 한 잔 하고 있습니다...",
  "데이터를 맛있게 요리하는 중...",
  "시장의 숨은 보석을 탐색하고 있습니다...",
];


export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ progress, message, showWittyMessages, className }) => {
    const [wittyMessage, setWittyMessage] = useState(wittyMessages[0]);

    useEffect(() => {
        if (!showWittyMessages) return;

        // Set initial random message
        setWittyMessage(wittyMessages[Math.floor(Math.random() * wittyMessages.length)]);

        const interval = setInterval(() => {
            setWittyMessage(wittyMessages[Math.floor(Math.random() * wittyMessages.length)]);
        }, 3500);

        return () => clearInterval(interval);
    }, [showWittyMessages]);

    const displayMessage = showWittyMessages ? wittyMessage : message;

    // Determinate spinner with progress
    if (typeof progress === 'number') {
        const radius = 20;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - (progress / 100) * circumference;

        return (
            <div className={`flex flex-col items-center justify-center gap-4 text-center px-4 ${className || ''}`} role="progressbar" aria-valuenow={progress}>
                <div className="relative w-12 h-12 flex items-center justify-center">
                    <svg className="w-full h-full" viewBox="0 0 48 48">
                        <circle
                            className="text-gray-600"
                            strokeWidth="4"
                            stroke="currentColor"
                            fill="transparent"
                            r={radius}
                            cx="24"
                            cy="24"
                        />
                        <circle
                            className="text-cyan-400"
                            strokeWidth="4"
                            strokeDasharray={circumference}
                            strokeDashoffset={offset}
                            strokeLinecap="round"
                            stroke="currentColor"
                            fill="transparent"
                            r={radius}
                            cx="24"
                            cy="24"
                            style={{
                                transform: 'rotate(-90deg)',
                                transformOrigin: '50% 50%',
                                transition: 'stroke-dashoffset 0.3s ease'
                            }}
                        />
                    </svg>
                    <span className="absolute text-xs font-bold text-cyan-300">
                        {Math.round(progress)}%
                    </span>
                </div>
                {displayMessage && <p className="w-full text-sm text-gray-400 break-words">{displayMessage}</p>}
            </div>
        );
    }

    // Indeterminate spinner
    return (
        <div className={`flex flex-col items-center justify-center gap-4 text-center px-4 ${className || ''}`}>
            <svg className="animate-spin h-12 w-12 text-cyan-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {displayMessage && <p className="w-full text-sm text-gray-400 break-words">{displayMessage}</p>}
        </div>
    );
};