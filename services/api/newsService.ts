// services/api/newsService.ts
import { IS_NEWS_API_ENABLED, IS_NAVER_PROXY_ENABLED, API_GATEWAY_URL } from '../../config';

export async function _fetchNewsApi(query: string): Promise<{ title: string; url: string; description: string; publishedAt: string }[]> {
    if (!IS_NEWS_API_ENABLED) {
        console.warn("[Data Strategy] NewsAPI.org service is not enabled. Skipping news fetch.");
        return [];
    }

    const apiUrl = `${API_GATEWAY_URL}?service=newsapi&q=${encodeURIComponent(query)}`;

    try {
        const response = await fetch(apiUrl);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: `HTTP status ${response.status}` }));
            throw new Error(errorData.error || `NewsAPI.org proxy request failed`);
        }

        const data = await response.json();
        if (data.articles && Array.isArray(data.articles)) {
            return data.articles.map((article: any) => ({
                title: article.title,
                url: article.url,
                description: article.description,
                publishedAt: article.publishedAt,
            }));
        }
        return [];
    } catch (error) {
        console.error('[Data Strategy] Failed to fetch news from NewsAPI.org via Gateway:', error);
        throw error;
    }
}

export async function _fetchNaverNews(query: string): Promise<{ title: string; link: string; description: string; pubDate: string }[]> {
    if (!IS_NAVER_PROXY_ENABLED) {
        console.warn("[Data Strategy] Naver API service is not enabled. Skipping news fetch.");
        return [];
    }

    const apiUrl = `${API_GATEWAY_URL}?service=naver&q=${encodeURIComponent(query)}`;

    try {
        const response = await fetch(apiUrl);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: `HTTP status ${response.status}` }));
            let detailedError = errorData.error || `Naver News API proxy request failed`;
            if (response.status >= 500) {
                detailedError += ". Supabase Edge Function에 문제가 발생했거나 Supabase 프로젝트 설정의 'Secrets'에 NAVER API 키가 올바르게 설정되었는지 확인해주세요.";
            }
            throw new Error(detailedError);
        }

        const data = await response.json();
        if (data.items && Array.isArray(data.items)) {
            const cleanText = (html: string) => html ? html.replace(/<[^>]*>?/gm, '') : '';
            return data.items.map((item: any) => ({
                title: cleanText(item.title),
                link: item.link,
                description: cleanText(item.description),
                pubDate: item.pubDate,
            }));
        }
        return [];
    } catch (error) {
        console.error('[Data Strategy] Failed to fetch news from Naver API via Gateway:', error);
        throw error;
    }
}