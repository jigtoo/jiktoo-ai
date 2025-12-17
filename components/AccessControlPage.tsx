
import React from 'react';
import { supabase } from '../services/supabaseClient';

interface AccessControlPageProps {
    email: string;
}

export const AccessControlPage: React.FC<AccessControlPageProps> = ({ email }) => {
    const handleLogout = async () => {
        await supabase.auth.signOut();
        window.location.reload();
    };

    return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
            <div className="max-w-md w-full bg-gray-800 rounded-xl shadow-2xl p-8 border border-gray-700 text-center">
                <div className="mb-6">
                    <div className="h-20 w-20 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="h-10 w-10 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">접속 승인 대기 중</h2>
                    <p className="text-gray-400 text-sm">
                        현재 계정은 관리자의 승인을 기다리고 있습니다.
                    </p>
                </div>

                <div className="bg-gray-700/50 rounded-lg p-4 mb-6">
                    <p className="text-xs text-gray-500 mb-1">YOUR ID</p>
                    <p className="text-white font-mono">{email}</p>
                </div>

                <div className="space-y-3">
                    <button
                        onClick={() => window.location.reload()}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-lg transition-colors"
                    >
                        승인 상태 확인 (새로고침)
                    </button>

                    <button
                        onClick={handleLogout}
                        className="w-full bg-transparent border border-gray-600 hover:border-gray-500 text-gray-400 hover:text-white py-3 px-4 rounded-lg transition-colors"
                    >
                        로그아웃
                    </button>
                </div>

                <div className="mt-8 text-xs text-gray-500">
                    <p>관리자에게 승인을 요청해주세요.</p>
                </div>
            </div>
        </div>
    );
};
