
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

    // 2. Remove Markdown code blocks first
    let cleaned = text.replace(/```json\n?|```/g, '');

    // 3. Extract JSON using Regex (Finding the largest outer {} or [])
    // This regex looks for the first { or [ and captures everything valid-looking until the end
    // But a better way is to simply find the FIRST [ ... ] or { ... } block.
    // We use a simple loop or regex. Let's use a regex that matches { ... } or [ ... ] across lines.
    const match = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);

    if (match) {
        cleaned = match[0];
    } else {
        // Fallback: simple trim if no brackets found (likely garbage)
        cleaned = cleaned.trim();
    }

    return cleaned;
}
