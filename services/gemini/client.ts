
// services/gemini/client.ts
import { GoogleGenAI, type GenerateContentResponse } from "@google/genai";
import { IS_GEMINI_ENABLED, GEMINI_API_KEY } from '../../config';

// FIX: Per @google/genai guidelines, use process.env.API_KEY directly for initialization.
// This also resolves the TypeScript error for `import.meta.env`.
export const ai = IS_GEMINI_ENABLED && GEMINI_API_KEY
    ? new GoogleGenAI({ apiKey: GEMINI_API_KEY })
    : null;

export const AI_DISABLED_ERROR_MESSAGE = "AI 기능을 사용할 수 없습니다. Gemini API 키가 설정되지 않았습니다. 프로젝트 루트의 .env 파일에 API_KEY를 설정했는지 확인해주세요.";

/**
 * Gemini API의 일시적인 서버 오류(500 등)에 대응하기 위한 재시도 로직을 포함한 `generateContent` 래퍼 함수입니다.
 * Rate Limiter를 통해 429 에러를 방지합니다.
 * @param options `ai.models.generateContent`에 전달할 옵션 객체
 * @param retries 재시도 횟수 (기본값: 2)
 * @param delay 초기 재시도 딜레이 (ms, 기본값: 1000)
 * @param priority 요청 우선순위 ('high' | 'normal' | 'low')
 * @returns GenerateContentResponse
 */
export async function generateContentWithRetry(
    options: any, // The type is complex, using 'any' for simplicity
    retries = 2,
    delay = 1000,
    priority: 'high' | 'normal' | 'low' = 'normal'
): Promise<GenerateContentResponse> {
    if (!ai) {
        throw new Error(AI_DISABLED_ERROR_MESSAGE);
    }

    // Import rate limiter dynamically to avoid circular dependencies
    const { geminiRateLimiter } = await import('../RateLimiterService');

    // Use rate limiter to queue the request
    return geminiRateLimiter.enqueue(async () => {
        for (let i = 0; i <= retries; i++) {
            try {
                // Validate options before making the call
                if (!options || typeof options !== 'object') {
                    throw new Error(`Invalid Gemini API options: ${JSON.stringify(options)}`);
                }

                // Force model override to gemini-2.0-flash-001 (Stable 2.0 Flash)
                if (!options.model || options.model === 'gemini-1.5-flash' || options.model === 'gemini-1.5-flash-001') {
                    options.model = 'gemini-2.0-flash-001';
                }

                const response = await ai.models.generateContent(options);

                // Validate response structure
                if (!response || typeof response !== 'object') {
                    throw new Error(`Invalid Gemini API response structure: ${typeof response}`);
                }

                // Log Token Usage
                if (response.usageMetadata) {
                    // Import dynamically to avoid circular dependency issues if any, though unlikely here
                    const { tokenUsageService } = await import('../TokenUsageService');
                    tokenUsageService.logUsage(
                        options.model || 'gemini-2.0-flash-001',
                        response.usageMetadata.promptTokenCount || 0,
                        response.usageMetadata.candidatesTokenCount || 0
                    );
                }

                return response;
            } catch (error: any) {
                const errorMessage = (error?.message || error?.toString?.() || String(error)).toLowerCase();
                const isRetryable = errorMessage.includes('internal') ||
                    errorMessage.includes('500') ||
                    errorMessage.includes('server error') ||
                    errorMessage.includes('service unavailable') ||
                    errorMessage.includes('503') ||
                    errorMessage.includes('429') ||
                    errorMessage.includes('quota');

                if (isRetryable && i < retries) {
                    console.warn(`[Gemini Retry] Attempt ${i + 1} failed with a retryable error. Retrying in ${delay}ms...`, error);
                    await new Promise(res => setTimeout(res, delay));
                    delay *= 2; // Exponential backoff
                } else {
                    console.error(`[Gemini Final Error] All attempts failed for Gemini API call.`, error);
                    console.error(`[Gemini Debug] Options:`, JSON.stringify(options, null, 2).substring(0, 500));
                    throw error; // Re-throw the last error
                }
            }
        }
        // This code is unreachable due to the throw in the catch block, but satisfies TypeScript
        throw new Error("Gemini API call failed after all retries.");
    }, priority, retries);
}


export async function callGemini(prompt: string): Promise<string> {
    const response = await generateContentWithRetry({
        model: "gemini-2.0-flash-001",
        contents: prompt
    });
    return response.text || '';
}
