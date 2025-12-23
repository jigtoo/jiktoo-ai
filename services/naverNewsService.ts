// services/naverNewsService.ts
import { KIS_PROXY_URL } from '../config';

export interface NaverNewsItem {
    title: string;
    originallink: string;
    link: string;
    description: string;
    pubDate: string;
}

export interface NaverNewsResponse {
    items: NaverNewsItem[];
    total: number;
    start: number;
    display: number;
}

/**
 * Fetch news from Naver News API
 * @param query Search query
 * @param display Number of results
 */
export async function fetchNaverNews(
    query: string,
    display: number = 10
): Promise<NaverNewsResponse> {
    try {
        const response = await fetch(
            `${KIS_PROXY_URL}/api-gateway?service=naver&q=${encodeURIComponent(query)}&display=${display}`,
            {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            }
        );

        if (!response.ok) {
            throw new Error(`Naver News API error: ${response.status}`);
        }

        const data = await response.json();
        if (!data || !Array.isArray(data.items)) {
            console.warn('[Naver News Service] Unexpected API response format:', data);
            return { items: [], total: 0, start: 0, display: 0 };
        }
        return data;
    } catch (error) {
        console.error('[Naver News Service] Error:', error);
        // Return empty structure on error to prevent crash
        return { items: [], total: 0, start: 0, display: 0 };
    }
}

/**
 * Calculate simple sentiment score based on keywords
 * (Later to be upgraded with Gemini AI)
 */
export function calculateSentimentScore(newsItems: NaverNewsItem[]): number {
    if (!newsItems || !Array.isArray(newsItems)) return 0;

    const positiveKeywords = ['상승', '호재', '급등', '성장', '증가', '개선', '돌파', '신고가'];
    const negativeKeywords = ['하락', '악재', '급락', '감소', '우려', '위험', '하향', '저가'];

    let score = 0;
    newsItems.forEach(item => {
        const text = `${item.title} ${item.description}`.toLowerCase();

        positiveKeywords.forEach(keyword => {
            if (text.includes(keyword)) score += 1;
        });

        negativeKeywords.forEach(keyword => {
            if (text.includes(keyword)) score -= 1;
        });
    });

    // Normalize to range -1 to 1
    const maxScore = newsItems.length * 2;
    return maxScore > 0 ? Math.max(-1, Math.min(1, score / maxScore)) : 0;
}
