
// services/gemini/client.ts
// services/gemini/client.ts
import { GoogleGenerativeAI } from "@google/generative-ai";
import { IS_GEMINI_ENABLED, GEMINI_API_KEY } from '../../config';
import { tokenUsageService } from '../TokenUsageService';

// FIX: Per @google/genai guidelines, use process.env.API_KEY directly for initialization.
// This also resolves the TypeScript error for `import.meta.env`.
console.log("Initializing Gemini Client. Key present?", !!GEMINI_API_KEY, "Length:", GEMINI_API_KEY?.length);
export const ai = IS_GEMINI_ENABLED && GEMINI_API_KEY
    ? new GoogleGenerativeAI(GEMINI_API_KEY)
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
    options: any,
    retries = 2,
    delay = 1000,
    priority: 'high' | 'normal' | 'low' = 'normal'
): Promise<any> { // Return any to avoid strict type mismatch with old SDK
    if (!ai) {
        throw new Error(AI_DISABLED_ERROR_MESSAGE);
    }

    const { geminiRateLimiter } = await import('../RateLimiterService');

    return geminiRateLimiter.enqueue(async () => {
        for (let i = 0; i <= retries; i++) {
            try {
                // Legacy SDK: Get model instance first
                let modelName = options.model || 'gemini-2.0-flash-001'; // Default to 2.0 Flash as 1.5-flash alias seems flaky
                if (modelName === 'gemini-2.0-flash-001') {
                    // Fallback if 2.0 not supported in old SDK env, but usually it works if API supports it
                }

                // Pass generation config if present
                // IMPORTANT: tools must not be inside generationConfig
                const rawConfig = options.generationConfig || options.config || {};
                const { tools: configTools, ...genConfig } = rawConfig;
                const tools = options.tools || configTools;

                const model = ai.getGenerativeModel({
                    model: modelName,
                    generationConfig: genConfig,
                    tools: tools,
                });

                // Construct single request object for modern SDK compliance
                const request: any = {
                    contents: [],
                };

                // Handle contents (string or parts array)
                if (typeof options.contents === 'string') {
                    request.contents = [{ role: 'user', parts: [{ text: options.contents }] }];
                } else if (Array.isArray(options.contents)) {
                    request.contents = options.contents;
                } else if (options.contents) {
                    request.contents = [options.contents];
                }

                // Attach tools and config at top level
                if (tools && Array.isArray(tools) && tools.length > 0) {
                    request.tools = tools;
                }

                if (Object.keys(genConfig).length > 0) {
                    request.generationConfig = genConfig;
                }

                // Debug log to trace what we are actually sending to the model
                console.log(`[Gemini Request] Model: ${modelName}, Tools: ${!!request.tools}, ConfigKeys: ${Object.keys(genConfig).join(',')}`);

                // [Fix] Add timeout to prevent infinite loading
                const timeoutMs = 60000;
                const generatePromise = model.generateContent(request);

                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error(`Gemini Request Timed Out after ${timeoutMs / 1000}s`)), timeoutMs)
                );

                const result: any = await Promise.race([generatePromise, timeoutPromise]);

                const response = await result.response;
                const text = response.text();

                // shim to match expected structure somewhat
                return {
                    text: text, // Direct access for convenience (ScannerTools.ts uses this)
                    candidates: [{
                        content: { parts: [{ text: text }] }
                    }],
                    usageMetadata: response.usageMetadata,
                    response: { // For compatibility with older code expecting response.response.text()
                        text: () => text
                    }
                };

            } catch (error: any) {
                const errorMessage = (error?.message || error?.toString?.() || String(error)).toLowerCase();
                const isRetryable = errorMessage.includes('internal') ||
                    errorMessage.includes('500') ||
                    errorMessage.includes('server error') ||
                    errorMessage.includes('503') ||
                    errorMessage.includes('429') ||
                    errorMessage.includes('quota') ||
                    errorMessage.includes('connection') ||
                    errorMessage.includes('network') ||
                    errorMessage.includes('fetch') ||
                    errorMessage.includes('timeout') ||
                    errorMessage.includes('econnreset') ||
                    errorMessage.includes('enotfound');

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

    // Extract text from the shimmed response structure
    const text = response?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!text) {
        console.error('[callGemini] Empty response received from Gemini API');
        throw new Error('Empty response from Gemini API');
    }

    // Log token usage for cost tracking
    if (response?.usageMetadata) {
        const metadata = response.usageMetadata;
        const inputTokens = metadata.promptTokenCount || 0;
        const outputTokens = metadata.candidatesTokenCount || 0;

        // Fire and forget - don't wait for logging
        tokenUsageService.logUsage('gemini-2.0-flash-001', inputTokens, outputTokens).catch((err: any) => {
            console.warn('[TokenUsage] Failed to log:', err);
        });
    }

    return text;
}
