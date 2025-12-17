// components/TelegramNotificationSettings.tsx
import React, { useState, useEffect } from 'react';

// Simple localStorage based settings
const STORAGE_KEY = 'telegram_notifications_enabled';

export const TelegramNotificationSettings: React.FC = () => {
    const [enabled, setEnabled] = useState<boolean>(false);

    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        setEnabled(stored === 'true');
    }, []);

    const toggle = () => {
        const newVal = !enabled;
        setEnabled(newVal);
        localStorage.setItem(STORAGE_KEY, String(newVal));
    };

    return (
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-600 mb-6">
            <h3 className="text-sm font-semibold text-gray-300 mb-2">Telegram 알림 설정</h3>
            <button
                onClick={toggle}
                className={`px-3 py-1 rounded ${enabled ? 'bg-green-600 hover:bg-green-500' : 'bg-gray-700 hover:bg-gray-600'} text-xs font-medium`}
            >
                {enabled ? '🔔 알림 켜짐' : '🔕 알림 꺼짐'}
            </button>
        </div>
    );
};
