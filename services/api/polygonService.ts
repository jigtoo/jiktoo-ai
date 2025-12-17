// services/api/polygonService.ts
import { IS_POLYGON_ENABLED, API_GATEWAY_URL } from '../../config';

export async function _polygonApiRequest<T>(endpoint: string): Promise<T> {
    if (!IS_POLYGON_ENABLED) {
        throw new Error("Polygon.io service is not enabled.");
    }

    const url = `${API_GATEWAY_URL}?service=polygon&endpoint=${encodeURIComponent(endpoint)}`;
    
    const response = await fetch(url);
    if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(`Polygon.io proxy request failed (${endpoint}): ${errorBody.error || 'Unknown Error'}`);
    }

    const data = await response.json();
    if (data.status === 'ERROR' || data.error) {
        throw new Error(`Polygon.io proxy error: ${data.error || data.message || 'Unknown error'}`);
    }
    return data as T;
}
