import React, { useEffect, useState } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
    id: string;
    type: ToastType;
    message: string;
    duration?: number;
}

interface ToastNotificationProps {
    toasts: ToastMessage[];
    removeToast: (id: string) => void;
}

export const ToastNotification: React.FC<ToastNotificationProps> = ({ toasts, removeToast }) => {
    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
            {toasts.map((toast) => (
                <ToastItem key={toast.id} toast={toast} removeToast={removeToast} />
            ))}
        </div>
    );
};

const ToastItem: React.FC<{ toast: ToastMessage; removeToast: (id: string) => void }> = ({ toast, removeToast }) => {
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsExiting(true);
            setTimeout(() => removeToast(toast.id), 300); // Wait for animation
        }, toast.duration || 3000);

        return () => clearTimeout(timer);
    }, [toast, removeToast]);

    const baseStyles = "px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium transition-all duration-300 transform translate-x-0";
    const exitStyles = "opacity-0 translate-x-full";

    const typeStyles = {
        success: "bg-green-600 border border-green-500",
        error: "bg-red-600 border border-red-500",
        info: "bg-blue-600 border border-blue-500",
        warning: "bg-yellow-600 border border-yellow-500 text-black",
    };

    return (
        <div className={`${baseStyles} ${typeStyles[toast.type]} ${isExiting ? exitStyles : ''} flex items-center gap-2 min-w-[300px]`}>
            <span>
                {toast.type === 'success' && '✅'}
                {toast.type === 'error' && '❌'}
                {toast.type === 'info' && 'ℹ️'}
                {toast.type === 'warning' && '⚠️'}
            </span>
            <span className="flex-1">{toast.message}</span>
            <button onClick={() => { setIsExiting(true); setTimeout(() => removeToast(toast.id), 300); }} className="ml-2 opacity-70 hover:opacity-100">
                ✕
            </button>
        </div>
    );
};
