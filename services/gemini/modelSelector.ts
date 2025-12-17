// services/gemini/modelSelector.ts
/**
 * ?‘ì—… ? í˜•???°ë¼ ?ì ˆ??Gemini ëª¨ë¸??? íƒ?©ë‹ˆ??
 * - simple: ë¹ ë¥¸ ?‘ë‹µ???„ìš”??ê°„ë‹¨???‘ì—…
 * - moderate: ì¤‘ê°„ ?˜ì???ë³µì¡?? * - complex: ê¹Šì? ?¬ê³ ê°€ ?„ìš”??ë³µì¡???‘ì—…
 */

export type TaskType = 'simple' | 'moderate' | 'complex';

/**
 * ?‘ì—… ? í˜•??ë§ëŠ” ëª¨ë¸ ? íƒ
 * ? ï¸ IMPORTANT: Use stable model names that actually exist in Gemini API
 */
export function selectModelByTask(task: TaskType): string {
    const models = {
        simple: 'gemini-2.0-flash-001',      // Fast, low cost (Experimental)
        moderate: 'gemini-2.0-flash-001',    // Balanced
        complex: 'gemini-2.0-flash-001'      // Deep analysis
    };

    return models[task];
}
