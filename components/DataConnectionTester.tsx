// components/DataConnectionTester.tsx
import React, { useState } from 'react';
import { CloseIcon, CheckCircleIcon, XCircleIcon } from './icons';
import { KIS_PROXY_URL, IS_KIS_PROXY_ENABLED, API_GATEWAY_URL } from '../config';
import { LoadingSpinner } from './LoadingSpinner';

interface DataConnectionTesterProps {
    isOpen: boolean;
    onClose: () => void;
}

type TestStatus = 'idle' | 'loading' | 'success' | 'error';

const TestSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="p-4 bg-gray-900/50 rounded-lg">
        <h4 className="font-bold text-gray-200 mb-3">{title}</h4>
        {children}
    </div>
);

const TestResult: React.FC<{
    status: TestStatus;
    result: string | null;
    onRun: () => void;
    isRunning: boolean;
    label: string;
}> = ({ status, result, onRun, isRunning, label }) => {
    const config = {
        idle: { icon: null, color: '' },
        loading: { icon: <LoadingSpinner />, color: 'text-yellow-300' },
        success: { icon: <CheckCircleIcon className="h-6 w-6 text-green-400" />, color: 'text-green-300' },
        error: { icon: <XCircleIcon className="h-6 w-6 text-red-400" />, color: 'text-red-300' },
    };
    const current = config[status];

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center">{current.icon}</div>
                <div className="flex-grow">
                    <div className="text-sm font-semibold text-gray-300">{label}</div>
                    <div className={`text-xs ${current.color}`}>{result || '...'}</div>
                </div>
                <button
                    onClick={onRun}
                    disabled={isRunning}
                    className="px-3 py-1 bg-cyan-600 text-white font-semibold rounded-lg hover:bg-cyan-500 disabled:opacity-50 text-xs"
                >
                    테스트
                </button>
            </div>
        </div>
    );
};

export const DataConnectionTester: React.FC<DataConnectionTesterProps> = ({ isOpen, onClose }) => {
    // KIS Proxy Tests
    const [kisProxyHttpStatus, setKisProxyHttpStatus] = useState<TestStatus>('idle');
    const [kisProxyHttpResult, setKisProxyHttpResult] = useState<string | null>('테스트 대기 중');
    const [kisProxyWsStatus, setKisProxyWsStatus] = useState<TestStatus>('idle');
    const [kisProxyWsResult, setKisProxyWsResult] = useState<string | null>('테스트 대기 중');

    // API Gateway Tests
    const [polygonStatus, setPolygonStatus] = useState<TestStatus>('idle');
    const [polygonResult, setPolygonResult] = useState<string | null>('테스트 대기 중');
    const [naverStatus, setNaverStatus] = useState<TestStatus>('idle');
    const [naverResult, setNaverResult] = useState<string | null>('테스트 대기 중');
    const [fredStatus, setFredStatus] = useState<TestStatus>('idle');
    const [fredResult, setFredResult] = useState<string | null>('테스트 대기 중');

    const isRunningAnyTest = [
        kisProxyHttpStatus, kisProxyWsStatus, polygonStatus, naverStatus, fredStatus
    ].includes('loading');

    // KIS Proxy HTTP Test
    const testKisProxyHttp = async () => {
        setKisProxyHttpStatus('loading');
        try {
            const response = await fetch(`${KIS_PROXY_URL}/health`, {
                signal: AbortSignal.timeout(10000) // 10초로 증가
            });
            const data = await response.json();

            if (!response.ok || data.status !== 'ok') {
                throw new Error(data.message || 'Health check failed');
            }

            setKisProxyHttpStatus('success');
            setKisProxyHttpResult(`✅ HTTP 연결 성공 (${data.message || '정상 작동 중'})`);
        } catch (err: any) {
            setKisProxyHttpStatus('error');
            const isTimeout = err.name === 'TimeoutError' || err.name === 'AbortError';
            const errorMsg = isTimeout ? '시간 초과 (서버 응답 지연)' : err.message;
            setKisProxyHttpResult(`❌ HTTP 연결 실패: ${errorMsg}. kis-proxy 서버가 ${KIS_PROXY_URL}에서 실행 중인지 확인하세요.`);
        }
    };

    // KIS Proxy WebSocket Test (Port 8082)
    const testKisWebSocket = async () => {
        setKisProxyWsStatus('loading');
        try {
            const ws = new WebSocket('ws://127.0.0.1:8082');

            const timeout = setTimeout(() => {
                ws.close();
                setKisProxyWsStatus('error');
                setKisProxyWsResult('❌ WebSocket 연결 시간 초과. kis-proxy 서버를 확인하세요.');
            }, 5000);

            ws.onopen = () => {
                clearTimeout(timeout);
                ws.close();
                setKisProxyWsStatus('success');
                setKisProxyWsResult('✅ kis-proxy WebSocket 연결 성공! 실시간 데이터 수신 가능');
            };

            ws.onerror = () => {
                clearTimeout(timeout);
                setKisProxyWsStatus('error');
                setKisProxyWsResult('❌ kis-proxy WebSocket 연결 실패. kis-proxy 서버가 실행 중인지 확인하세요.');
            };
        } catch (err: any) {
            setKisProxyWsStatus('error');
            setKisProxyWsResult(`❌ WebSocket 연결 실패: ${err.message}`);
        }
    };

    // Polygon.io Test
    const testPolygon = async () => {
        setPolygonStatus('loading');
        try {
            const endpoint = '/v2/reference/locales';
            const url = `${API_GATEWAY_URL}?service=polygon&endpoint=${encodeURIComponent(endpoint)}`;
            const response = await fetch(url);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `${response.status} ${response.statusText}`);
            }

            if (data.status === 'OK' && Array.isArray(data.results)) {
                setPolygonStatus('success');
                setPolygonResult(`✅ 연결 성공! ${data.results.length}개의 지역 정보 조회`);
            } else {
                throw new Error('Unexpected data format');
            }
        } catch (err: any) {
            setPolygonStatus('error');
            setPolygonResult(`❌ 연결 실패: ${err.message}. Supabase Secrets의 POLYGON_API_KEY를 확인하세요.`);
        }
    };

    // Naver News Test
    const testNaver = async () => {
        setNaverStatus('loading');
        try {
            const url = `${API_GATEWAY_URL}?service=naver&q=${encodeURIComponent('삼성전자')}`;
            const response = await fetch(url);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `${response.status} ${response.statusText}`);
            }

            if (data.items && Array.isArray(data.items)) {
                setNaverStatus('success');
                setNaverResult(`✅ 연결 성공! ${data.items.length}개의 뉴스 기사 조회`);
            } else {
                throw new Error('Unexpected data format');
            }
        } catch (err: any) {
            setNaverStatus('error');
            setNaverResult(`❌ 연결 실패: ${err.message}. Supabase Secrets의 NAVER_CLIENT_ID/SECRET을 확인하세요.`);
        }
    };

    // FRED Test
    const testFRED = async () => {
        setFredStatus('loading');
        try {
            const url = `${API_GATEWAY_URL}?service=fred`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ series_ids: ['DFF', 'UNRATE'] })
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `${response.status} ${response.statusText}`);
            }

            if (data.DFF && data.UNRATE) {
                setFredStatus('success');
                setFredResult(`✅ 연결 성공! 금리: ${data.DFF}%, 실업률: ${data.UNRATE}%`);
            } else {
                throw new Error('Unexpected data format');
            }
        } catch (err: any) {
            setFredStatus('error');
            setFredResult(`❌ 연결 실패: ${err.message}. Supabase Secrets의 FRED_API_KEY를 확인하세요.`);
        }
    };



    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
            <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-2xl m-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <header className="sticky top-0 bg-gray-800 p-4 flex justify-between items-center border-b border-gray-700 z-10">
                    <h2 className="text-xl font-bold text-white">🔧 시스템 진단 도구</h2>
                    <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-600">
                        <CloseIcon className="h-6 w-6" />
                    </button>
                </header>

                <div className="p-6 space-y-4">
                    {IS_KIS_PROXY_ENABLED && (
                        <TestSection title="1. KIS Proxy (로컬 서버)">
                            <p className="text-xs text-gray-400 mb-3">
                                로컬에서 실행 중인 kis-proxy 서버의 HTTP 및 WebSocket 연결을 테스트합니다.
                            </p>
                            <div className="space-y-3">
                                <TestResult
                                    label="HTTP API (Port 8080)"
                                    status={kisProxyHttpStatus}
                                    result={kisProxyHttpResult}
                                    onRun={testKisProxyHttp}
                                    isRunning={isRunningAnyTest}
                                />
                                <TestResult
                                    label="KIS WebSocket (실시간 데이터)"
                                    status={kisProxyWsStatus}
                                    result={kisProxyWsResult}
                                    onRun={testKisWebSocket}
                                    isRunning={isRunningAnyTest}
                                />
                            </div>
                        </TestSection>
                    )}

                    <TestSection title="2. 클라우드 API Gateway (Supabase Edge Functions)">
                        <p className="text-xs text-gray-400 mb-3">
                            Supabase Functions의 api-gateway가 외부 API와 정상적으로 통신하는지 테스트합니다.
                        </p>
                        <div className="space-y-3">
                            <TestResult
                                label="Polygon.io (미국 주식 데이터)"
                                status={polygonStatus}
                                result={polygonResult}
                                onRun={testPolygon}
                                isRunning={isRunningAnyTest}
                            />
                            <TestResult
                                label="Naver News (뉴스 감성 분석)"
                                status={naverStatus}
                                result={naverResult}
                                onRun={testNaver}
                                isRunning={isRunningAnyTest}
                            />
                            <TestResult
                                label="FRED (거시경제 지표)"
                                status={fredStatus}
                                result={fredResult}
                                onRun={testFRED}
                                isRunning={isRunningAnyTest}
                            />
                        </div>
                    </TestSection>

                    <div className="p-4 bg-cyan-900/20 border border-cyan-700/50 rounded-lg">
                        <p className="text-xs text-cyan-300">
                            💡 <strong>팁:</strong> 모든 테스트가 성공하면 시스템이 정상적으로 작동하는 것입니다.
                            실패 시 에러 메시지를 확인하여 문제를 해결하세요.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};