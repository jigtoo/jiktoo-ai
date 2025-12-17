import React from 'react';
import { AlertIcon, CloseIcon } from './icons';

interface ErrorDisplayProps {
    title?: string;
    message: string;
    onRetry?: () => void;
    onClose?: () => void;
    className?: string;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
    title = "이런, 문제가 발생했어요.",
    message,
    onRetry,
    onClose,
    className
}) => {
    return (
        <div className={`relative bg-red-900/20 border border-red-700/40 text-red-200 px-4 py-5 rounded-lg text-center animate-fade-in ${className}`}>
            {onClose && (
                <button onClick={onClose} className="absolute top-2 right-2 p-1 text-red-300 hover:text-white rounded-full transition-colors">
                    <CloseIcon className="h-5 w-5" />
                </button>
            )}
            <div className="flex justify-center mb-3">
                <AlertIcon className="h-12 w-12 text-yellow-400" />
            </div>
            <h3 className="font-bold text-lg mb-1">{title}</h3>
            <p className="text-sm text-yellow-300/80 mb-4 max-w-md mx-auto">{message}</p>
            {onRetry && (
                 <button 
                    onClick={() => onRetry()} 
                    className="flex items-center justify-center mx-auto px-4 py-2 bg-yellow-600/50 text-white font-semibold rounded-lg shadow-md hover:bg-yellow-600/70 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-yellow-500 transition duration-200"
                  >
                    <span>다시 시도</span>
                  </button>
            )}
        </div>
    );
}