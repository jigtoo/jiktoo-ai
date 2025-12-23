
/**
 * Sanitizes a string potentially containing JSON to ensure it can be parsed.
 * Removes markdown code blocks and finds the JSON array/object.
 */
export function sanitizeJsonString(text: string): string {
    if (!text) return '{}';

    try {
        // 1. Try to parse immediately (fast path)
        JSON.parse(text);
        return text;
    } catch (e) {
        // Continue to sanitization
    }

    // 2. [Improved] Extract from Markdown code block if present
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
        return codeBlockMatch[1].trim();
    }

    // 3. [Robust] Stack-based extraction (to handle trailing text with brackets)
    const firstOpenBrace = text.indexOf('{');
    const firstOpenBracket = text.indexOf('[');

    let startIdx = -1;
    let endChar = '';

    // Determine start character (whichever comes first)
    if (firstOpenBrace !== -1 && (firstOpenBracket === -1 || firstOpenBrace < firstOpenBracket)) {
        startIdx = firstOpenBrace;
        endChar = '}';
    } else if (firstOpenBracket !== -1) {
        startIdx = firstOpenBracket;
        endChar = ']';
    }

    if (startIdx !== -1) {
        let balance = 0;
        const startChar = text[startIdx];

        for (let i = startIdx; i < text.length; i++) {
            if (text[i] === startChar) {
                balance++;
            } else if (text[i] === endChar) {
                balance--;
                if (balance === 0) {
                    return text.substring(startIdx, i + 1);
                }
            }
        }
        // If we get here, brackets weren't balanced (truncated output?). 
        // Try regex fallback as a last resort or just return what we deemed started.
    }

    // 4. Fallback: Greedy Regex (Legacy)
    const match = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (match) {
        return match[0];
    }

    return text.trim();
}
