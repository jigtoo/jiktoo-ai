import React, { useState, useEffect } from 'react';
import type { StrategyPlaybook } from '../types';
import { CloseIcon, BellIcon, CheckCircleIcon, XCircleIcon } from './icons';
import { LoadingSpinner } from './LoadingSpinner';
import { supabase } from '../services/supabaseClient';

interface TelegramSubscriptionModalProps {
    isOpen: boolean;
    onClose: () => void;
    signal: StrategyPlaybook | null;
}

const sendTelegramRequest = async (payload: { type: 'test' | 'subscribe'; chat_id: string }) => {
    if (!supabase) {
        throw new Error("데이터베이스 클라이언트를 사용할 수 없습니다.");
    }

    // The new, clean function is named 'telegram-service'
    const { data, error } = await supabase.functions.invoke("telegram-service", {
        body: payload,
    });

    if (error) {
        // This catches network errors or function-level errors (e.g., 5xx)
        throw new Error(error.message || '알림 서비스 연결에 실패했습니다.');
    }

    // This catches application-level errors returned in the function's JSON body (e.g., 4xx)
    if (data && data.error) {
        throw new Error(data.error);
    }

    return data;
};


export const TelegramSubscriptionModal: React.FC<TelegramSubscriptionModalProps> = ({ isOpen, onClose, signal }) => {
    const [telegramId, setTelegramId] = useState('');
    const [status, setStatus] = useState<'idle' | 'subscribing' | 'subscribed' | 'error'>('idle');
    const [error, setError] = useState('');

    const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
    const [testError, setTestError] = useState('');


    useEffect(() => {
        if (isOpen) {
            setTelegramId('');
            setStatus('idle');
            setError('');
            setTestStatus('idle');
            setTestError('');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const isGlobalSubscription = signal === null;
    const stockName = signal?.stockName;

    const handleTestNotification = async () => {
        if (!telegramId.trim()) {
            setTestError('테스트를 위해 Chat ID를 먼저 입력해주세요.');
            setTestStatus('error');
            return;
        }
        setTestStatus('testing');
        setTestError('');
        try {
            await sendTelegramRequest({ type: 'test', chat_id: telegramId.trim() });
            setTestStatus('success');
        } catch (err) {
            setTestError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
            setTestStatus('error');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!telegramId.trim()) {
            setError('텔레그램 Chat ID를 입력해주세요.');
            return;
        }
        setError('');
        setStatus('subscribing');

        try {
            await sendTelegramRequest({ type: 'subscribe', chat_id: telegramId.trim() });
            setStatus('subscribed');
        } catch (err) {
            setError(err instanceof Error ? err.message : '서버와 통신 중 오류가 발생했습니다.');
            setStatus('error');
        }
    };

    const renderTestStatus = () => {
        switch (testStatus) {
            case 'testing':
                return <p className="text-xs text-yellow-300 mt-2">테스트 메시지를 보내는 중...</p>;
            case 'success':
                return <p className="text-xs text-green-400 mt-2">✅ 테스트 메시지 전송 성공! 텔레그램을 확인해주세요.</p>;
            case 'error':
                return <p className="text-xs text-red-400 mt-2">❌ 테스트 실패: {testError}</p>;
            default:
                return null;
        }
    };

    const renderContent = () => {
        switch (status) {
            case 'subscribing':
                return (
                    <div className="text-center py-10">
                        <LoadingSpinner message="구독 정보를 처리 중입니다..." />
                    </div>
                );
            case 'subscribed':
                return (
                    <div className="text-center py-10">
                        <CheckCircleIcon className="h-16 w-16 text-green-400 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-white">구독 완료!</h3>
                        <p className="mt-2 text-gray-300 px-4">
                            환영 메시지가 텔레그램으로 전송되었습니다.
                            {isGlobalSubscription ? (
                                " 이제부터 알파 엔진이 포착하는 한국 및 미국 시장의 모든 핵심 신호가 전송됩니다."
                            ) : (
                                <>
                                    {" "}이제부터 <strong className="text-cyan-300">{stockName}</strong>의 핵심 신호가 전송됩니다.
                                </>
                            )}
                        </p>
                        <button onClick={onClose} className="mt-6 px-6 py-2 bg-gray-600 text-white font-bold rounded-lg hover:bg-gray-500">
                            닫기
                        </button>
                    </div>
                );
            case 'error':
                return (
                    <div className="text-center py-10 px-4">
                        <p className="text-red-400 mb-4">{error}</p>
                        <button onClick={() => setStatus('idle')} className="mt-4 px-6 py-2 bg-gray-600 text-white font-bold rounded-lg hover:bg-gray-500">
                            다시 시도
                        </button>
                    </div>
                );
            case 'idle':
            default:
                return (
                    <form onSubmit={handleSubmit} className="p-6 space-y-4">
                        <p className="text-sm text-gray-400">
                            {isGlobalSubscription ? (
                                "알파 엔진이 포착하는 **한국 및 미국 시장의 모든 핵심 신호** 발생 시 텔레그램으로 실시간 알림을 받으려면, 텔레그램 ID를 입력하고 구독 버튼을 누르세요."
                            ) : (
                                <>
                                    <strong className="text-cyan-300">{stockName}</strong> 종목의 매수/매도 트리거 신호 발생 시 텔레그램으로 실시간 알림을 받으려면, 텔레그램 ID를 입력하고 구독 버튼을 누르세요.
                                </>
                            )}
                        </p>
                        <div>
                            <label htmlFor="telegramId" className="block text-sm font-medium text-gray-300 mb-1">텔레그램 Chat ID</label>
                            <input
                                id="telegramId"
                                type="text"
                                value={telegramId}
                                onChange={(e) => setTelegramId(e.target.value)}
                                className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 text-white"
                                placeholder="숫자로 된 Chat ID"
                                required
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                💡 팁: 텔레그램에서 <code className="bg-gray-700 p-1 rounded-sm">@userinfobot</code>을 검색하여 'start'를 누르면 자신의 Chat ID를 쉽게 확인할 수 있습니다.
                            </p>
                            {renderTestStatus()}
                        </div>
                        <div className="pt-2 flex justify-end items-center gap-2">
                            <button
                                type="button"
                                onClick={handleTestNotification}
                                className="px-4 py-2 bg-gray-600 text-white font-bold rounded-lg transition-colors disabled:opacity-50 text-sm"
                                disabled={!telegramId.trim() || testStatus === 'testing'}
                            >
                                테스트 알림 발송
                            </button>
                            <button
                                type="submit"
                                className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold rounded-lg transition-colors disabled:opacity-50"
                                disabled={!telegramId.trim()}
                            >
                                구독하기
                            </button>
                        </div>
                    </form>
                );
        }
    };


    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
            <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-md m-4" onClick={e => e.stopPropagation()}>
                <header className="p-4 flex justify-between items-center border-b border-gray-700">
                    <div className="flex items-center gap-3">
                        <BellIcon className="h-6 w-6 text-cyan-400" />
                        <h2 className="text-xl font-bold text-white">
                            {isGlobalSubscription ? '전체 신호 알림 구독' : '개별 종목 알림 구독'}
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-600">
                        <CloseIcon className="h-6 w-6" />
                    </button>
                </header>
                {renderContent()}
            </div>
        </div>
    );
};