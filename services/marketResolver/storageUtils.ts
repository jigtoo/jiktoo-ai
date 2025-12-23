
let isNode = false;
try {
    isNode = typeof process !== 'undefined' && process.versions != null && process.versions.node != null;
} catch (e) {
    isNode = false;
}

const CACHE_FILE_NAME = 'market_cache.json';
const LOCAL_STORAGE_KEY = 'market_cache';

async function getFilePath() {
    if (!isNode) return null;
    const { fileURLToPath } = await import('url');
    const { dirname, resolve } = await import('path');
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    return resolve(__dirname, CACHE_FILE_NAME);
}

export async function loadCache(): Promise<Record<string, string>> {
    if (isNode) {
        try {
            const fs = await import('fs');
            const filePath = await getFilePath();
            if (filePath && fs.existsSync(filePath)) {
                const data = fs.readFileSync(filePath, 'utf-8');
                return JSON.parse(data);
            }
        } catch (e) {
            console.error('[Storage] Node load failed:', e);
        }
        return {};
    } else {
        try {
            const data = localStorage.getItem(LOCAL_STORAGE_KEY);
            return data ? JSON.parse(data) : {};
        } catch (e) {
            console.error('[Storage] Browser load failed:', e);
            return {};
        }
    }
}

export async function saveCache(cache: Record<string, string>): Promise<void> {
    if (isNode) {
        try {
            const fs = await import('fs');
            const filePath = await getFilePath();
            if (filePath) {
                fs.writeFileSync(filePath, JSON.stringify(cache, null, 2));
            }
        } catch (e) {
            console.error('[Storage] Node save failed:', e);
        }
    } else {
        try {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cache));
        } catch (e) {
            console.error('[Storage] Browser save failed:', e);
        }
    }
}
