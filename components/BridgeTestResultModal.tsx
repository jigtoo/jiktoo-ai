import React from 'react';
import type { KiwoomTRResponse } from '../types';
import { CloseIcon, CheckCircleIcon, XCircleIcon } from './icons';
import { LoadingSpinner } from './LoadingSpinner';

interface BridgeTestResultModalProps {
    isOpen: boolean;
    onClose: () => void;
    isLoading: boolean;
    result: KiwoomTRResponse | null;
    error: string | null;
}

export const BridgeTestResultModal: React.FC<BridgeTestResultModalProps> = ({ isOpen, onClose, isLoading, result, error }) => {
    if (!isOpen) return null;

    const renderContent = () => {
        if (isLoading) {
            return <LoadingSpinner message="브리지 서버와 통신 중..." />;
        }
        if (error) {
            return (
                <div className="text-center">
                    <XCircleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-red-300">연결 실패</h3>
                    <p className="mt-2 text-sm text-gray-300 bg-gray-900/50 p-3 rounded-md">{error}</p>
                </div>
            );
        }
        if (result) {
            return (
                <div className="text-center">
                    <CheckCircleIcon className="h-12 w-12 text-green-400 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-green-300">연결 성공!</h3>
                    <p className="mt-2 text-sm text-gray-400">브리지 서버로부터 데이터를 성공적으로 수신했습니다.</p>
                    <div className="mt-4 text-left bg-gray-900/50 p-3 rounded-md max-h-60 overflow-y-auto">
                        <pre className="text-xs text-gray-200 whitespace-pre-wrap">
                            {JSON.stringify(result, null, 2)}
                        </pre>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
            <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-lg m-4" onClick={e => e.stopPropagation()}>
                <header className="p-4 flex justify-between items-center border-b border-gray-700">
                    <h2 className="text-xl font-bold text-white">브리지 서버 연결 테스트 결과</h2>
                    <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-600">
                        <CloseIcon className="h-6 w-6" />
                    </button>
                </header>
                <div className="p-6">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};
