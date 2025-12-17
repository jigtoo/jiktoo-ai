// copy-of-sepa-ai/components/ConvictionScanner.tsx
import React from 'react';
import { LoadingSpinner } from './LoadingSpinner';
import { HandshakeIcon, RefreshIcon, BrainIcon } from './icons';

interface ConvictionScannerProps {
    forceGlobalScan: () => void;
    isGlobalScanning: boolean;
}

export const ConvictionScanner: React.FC<ConvictionScannerProps> = ({ forceGlobalScan, isGlobalScanning }) => {
    return (
        <div className="p-6 bg-gray-800/50 border border-gray-700 rounded-xl shadow-lg text-center mb-8">
            <div className="inline-block bg-gray-700 p-3 rounded-full mb-3">
                <HandshakeIcon className="h-10 w-10 text-cyan-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-100">컨빅션 스캐너 (전략가 호출)</h2>
            <p className="text-gray-400 max-w-2xl mx-auto mt-2">
                AI '전략가'에게 명령하여, 현재 사용 가능한 모든 정보(관심종목, 개별 스캐너 신호 등)를 총동원하여 시장 전체를 다시 분석하고, 완전히 새로운 최신 플레이북을 생성합니다.
            </p>

            <button
                onClick={forceGlobalScan}
                disabled={isGlobalScanning}
                className="mt-6 flex items-center justify-center gap-2 mx-auto px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-lg rounded-lg shadow-lg hover:from-cyan-600 hover:to-blue-700 transition-transform transform hover:scale-105 disabled:opacity-50"
            >
                <RefreshIcon className={`h-6 w-6 ${isGlobalScanning ? 'animate-spin' : ''}`} />
                <span>전체 신호 강제 재분석</span>
            </button>

            {isGlobalScanning && (
                <div className="mt-4">
                    <LoadingSpinner message="모든 데이터 소스를 기반으로 시장을 다시 스캔하고 있습니다..." />
                </div>
            )}
        </div>
    );
};