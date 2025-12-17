// services/utils/rateLimiter.ts

export class RateLimiter {
    private queue: Array<() => Promise<void>> = [];
    private isProcessing = false;
    private delay: number;

    constructor(requestsPerSecond: number) {
        this.delay = 1000 / requestsPerSecond;
    }

    async execute<T>(task: () => Promise<T>): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            this.queue.push(async () => {
                try {
                    const result = await task();
                    resolve(result);
                } catch (error) {
                    reject(error);
                }
            });
            this.processQueue();
        });
    }

    private async processQueue() {
        if (this.isProcessing) return;
        this.isProcessing = true;

        while (this.queue.length > 0) {
            const task = this.queue.shift();
            if (task) {
                await task();
                await new Promise(resolve => setTimeout(resolve, this.delay));
            }
        }

        this.isProcessing = false;
    }
}

// Global instance for KIS API (limit to 20 requests/sec)
export const kisRateLimiter = new RateLimiter(20);
