// config.ts

// [ !! 중요 !! ]
// Supabase 연결 정보입니다. .env 파일에서 로드됩니다.
const getEnv = (key: string, nodeKey?: string) => {
    try {
        // @ts-ignore
        if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
            // @ts-ignore
            return import.meta.env[key];
        }
    } catch (e) { }

    try {
        if (typeof process !== 'undefined' && process.env) {
            return process.env[nodeKey || key];
        }
    } catch (e) { }

    return undefined;
};

const SUPABASE_URL = getEnv('VITE_SUPABASE_URL', 'SUPABASE_URL') || '';
const SUPABASE_ANON_KEY = getEnv('VITE_SUPABASE_ANON_KEY', 'SUPABASE_ANON_KEY') || '';

// [ !! 신규 !! ]
// 텔레그램 알림을 위한 새롭고 안정적인 함수 URL입니다.
const TELEGRAM_SERVICE_URL = `${SUPABASE_URL}/functions/v1/telegram-service`;

// [ !! 텔레그램 봇 설정 !! ]
// .env 파일에서 로드됩니다.
const TELEGRAM_BOT_TOKEN = getEnv('VITE_TELEGRAM_BOT_TOKEN', 'TELEGRAM_BOT_TOKEN') || '';
const TELEGRAM_CHAT_ID = getEnv('VITE_TELEGRAM_CHAT_ID', 'TELEGRAM_CHAT_ID') || '';


// --- 이하 코드는 자동으로 설정됩니다 ---

// [ !! 신규 !! ]
// Alpha Engine의 Gemini API 호출 전략을 설정합니다.
// 'gemini': 항상 Gemini API를 호출합니다. (기존 방식)
// 'hybrid': 필요할 때만 호출합니다. (debounce, 캐시 기반)
// 'db': 절대로 호출하지 않고, 데이터베이스/캐시만 사용합니다.
const ALPHA_SOURCE: 'gemini' | 'hybrid' | 'db' = 'hybrid';
const ALPHA_DEBOUNCE_MINUTES = 15; // 'hybrid' 모드에서 최소 호출 간격 (분)

// [α-Link Phase 1] 실시간 알파엔진 플래그 및 상수
export const USE_REALTIME_ALPHA = true;   // Alpha-Link 시스템 활성화
export const REALTIME_DEBOUNCE_MS = 1000;  // 1 초 병합
export const REALTIME_WINDOW_MS = 60000;  // 60 초 윈도

// [β-Link Phase 3] 피드백 및 학습 루프 플래그
export const USE_BETA_LINK = false; // 기본 OFF

// [γ-Link Phase 4] 메모리 및 진화 계층 플래그
export const USE_EVOLUTION_LAYER = false; // 기본 OFF

const API_GATEWAY_URL = SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/api-gateway` : '';

// --- KIWOOM BRIDGE CONFIGURATION ---
export const KIWOOM_BRIDGE_URL = "http://127.0.0.1:8001"; // New Kiwoom Bridge URL
export const IS_KIWOOM_BRIDGE_ENABLED = false; // Enable Kiwoom Bridge


// [KIS Proxy Configuration] - Local proxy server for Korea Investment & Securities API
const KIS_PROXY_URL = 'http://127.0.0.1:8080'; // kis-proxy server running locally
const KIS_WS_PROXY_URL = 'ws://127.0.0.1:8082'; // kis-proxy WebSocket server for real-time data
const IS_KIS_PROXY_ENABLED = true; // KIS Proxy is enabled for stable real-time data


// AI 기능은 실행 환경에 'API_KEY'가 설정되어 있을 때만 활성화됩니다.
export const GEMINI_API_KEY = getEnv('VITE_GEMINI_API_KEY', 'GEMINI_API_KEY') || '';
const IS_GEMINI_ENABLED = !!GEMINI_API_KEY;
const IS_SUPABASE_ENABLED = !!SUPABASE_URL && !!SUPABASE_ANON_KEY && !SUPABASE_URL.includes('<');


// All other flags now depend on the single gateway
const IS_POLYGON_ENABLED = IS_SUPABASE_ENABLED;
const IS_NEWS_API_ENABLED = IS_SUPABASE_ENABLED;
const IS_NAVER_PROXY_ENABLED = IS_SUPABASE_ENABLED;
const IS_FMP_ENABLED = IS_SUPABASE_ENABLED;
const IS_FRED_ENABLED = IS_SUPABASE_ENABLED;
const IS_MARKETAUX_ENABLED = IS_SUPABASE_ENABLED;





export {
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    TELEGRAM_SERVICE_URL,
    TELEGRAM_BOT_TOKEN,
    TELEGRAM_CHAT_ID,
    ALPHA_SOURCE,
    ALPHA_DEBOUNCE_MINUTES,
    API_GATEWAY_URL,
    KIS_PROXY_URL,
    KIS_WS_PROXY_URL, // NOTE: I need to define this variable before exporting. I missed defining it in the block above properly.
    IS_GEMINI_ENABLED,
    IS_POLYGON_ENABLED,
    IS_NEWS_API_ENABLED,
    IS_SUPABASE_ENABLED,
    IS_KIS_PROXY_ENABLED,
    IS_NAVER_PROXY_ENABLED,
    IS_FMP_ENABLED,
    IS_FRED_ENABLED,
    IS_MARKETAUX_ENABLED,
};