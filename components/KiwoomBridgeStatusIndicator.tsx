// components/KiwoomBridgeStatusIndicator.tsx
import React from 'react';
import { KIWOOM_BRIDGE_URL } from '../config'; // Import Bridge URL

type BridgeStatus = 'connecting' | 'connected' | 'error' | 'disabled';

interface KiwoomBridgeStatusIndicatorProps {
    status: BridgeStatus;
    error?: string | null;
    label?: string;
}

const StatusIcon: React.FC<{ status: BridgeStatus }> = ({ status }) => {
    switch (status) {
        case 'connecting':
            return <div className="h-3 w-3 bg-yellow-500 rounded-full animate-pulse"></div>;
        case 'connected':
            return <div className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </div>;
        case 'error':
            return <div className="h-3 w-3 bg-red-500 rounded-full"></div>;
        default:
            return null;
    }
}


export const KiwoomBridgeStatusIndicator: React.FC<KiwoomBridgeStatusIndicatorProps> = ({ status, error, label }) => {
    if (status === 'disabled') {
        return null;
    }

    const labelText = label || '키움 브릿지';

    const statusConfig: { [key in Exclude<BridgeStatus, 'disabled'>]: { text: string; textColor: string } } = {
        connecting: {
            text: `${labelText} 연결 중...`,
            textColor: 'text-yellow-300',
        },
        connected: {
            text: `${labelText} 연결됨`,
            textColor: 'text-green-300',
        },
        error: {
            text: `${labelText} 연결 실패`,
            textColor: 'text-red-300',
        },
    };

    const config = statusConfig[status];

    return (
        <div className="relative group flex items-center gap-2 p-2 bg-gray-800/50 rounded-lg">
            <StatusIcon status={status} />
            <span className={`text-xs font-semibold ${config.textColor}`}>{config.text}</span>
            {status === 'error' && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-gray-900 text-white text-xs rounded-lg p-3 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-lg pointer-events-none before:content-[''] before:absolute before:left-1/2 before:top-full before:-translate-x-1/2 before:border-4 before:border-transparent before:border-t-gray-900">
                    <p className="font-bold mb-1 text-red-400">연결 오류</p>
                    <p>{error || "알 수 없는 오류"}</p>
                    <p className="mt-2 pt-2 border-t border-gray-700 text-gray-400">
                        로컬 PC의 키움 브릿지 서버(uvicorn)가 실행 중인지, <br />
                        **HTTP 포 ({KIWOOM_BRIDGE_URL})** 로 연결할 수 있는지 확인하세요.
                    </p>
                </div>
            )}
        </div>
    );
};