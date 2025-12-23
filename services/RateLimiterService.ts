// services/RateLimiterService.ts
/**
 * Token Bucket Rate Limiter for Gemini API
 * Prevents 429 (Too Many Requests) errors
 */

interface QueuedRequest {
    id: string;
    priority: 'high' | 'normal' | 'low';
    execute: () => Promise<any>;
    resolve: (value: any) => void;
    reject: (error: any) => void;
    retries: number;
    maxRetries: number;
}

class RateLimiterService {
    private tokens: number;
    private readonly maxTokens: number = 1500; // RPM limit (with safety margin)
    private readonly refillRate: number = 25; // tokens per second (1500/60)
    private queue: QueuedRequest[] = [];
    private isProcessing: boolean = false;
    private lastRefill: number = Date.now();

    constructor() {
        this.tokens = this.maxTokens;
        this.startRefillTimer();
    }

    /**
     * Start token refill timer
     */
    private startRefillTimer(): void {
        setInterval(() => {
            const now = Date.now();
            const elapsed = (now - this.lastRefill) / 1000; // seconds
            const tokensToAdd = Math.floor(elapsed * this.refillRate);

            if (tokensToAdd > 0) {
                this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
                this.lastRefill = now;
            }

            // Process queue if tokens available
            if (this.tokens > 0 && this.queue.length > 0 && !this.isProcessing) {
                this.processQueue();
            }
        }, 1000); // Check every second
    }

    /**
     * Enqueue a request with priority
     */
    async enqueue<T>(
        execute: () => Promise<T>,
        priority: 'high' | 'normal' | 'low' = 'normal',
        maxRetries: number = 3
    ): Promise<T> {
        return new Promise((resolve, reject) => {
            const request: QueuedRequest = {
                id: `${Date.now()}-${Math.random()}`,
                priority,
                execute,
                resolve,
                reject,
                retries: 0,
                maxRetries
            };

            // Insert based on priority
            if (priority === 'high') {
                this.queue.unshift(request);
            } else if (priority === 'low') {
                this.queue.push(request);
            } else {
                // Insert normal priority in middle
                const lowPriorityIndex = this.queue.findIndex(r => r.priority === 'low');
                if (lowPriorityIndex === -1) {
                    this.queue.push(request);
                } else {
                    this.queue.splice(lowPriorityIndex, 0, request);
                }
            }

            // Start processing if not already running
            if (!this.isProcessing) {
                this.processQueue();
            }
        });
    }

    /**
     * Process queued requests
     */
    private async processQueue(): Promise<void> {
        if (this.isProcessing || this.queue.length === 0) {
            return;
        }

        this.isProcessing = true;

        try {
            // Dispatch loop: Fire requests as long as we have tokens
            while (this.queue.length > 0 && this.tokens > 0) {
                const request = this.queue.shift();
                if (!request) break;

                this.tokens--;

                // Execute asynchronously (Fire and Forget from the queue's perspective)
                // This prevents Head-of-Line blocking if one request hangs
                this.executeRequest(request);

                // Small yield to prevent event loop starvation if queue is huge
                if (this.queue.length % 10 === 0) {
                    await new Promise(resolve => setTimeout(resolve, 0));
                }
            }
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Execute a single request with retries
     */
    private async executeRequest(request: QueuedRequest): Promise<void> {
        try {
            const result = await request.execute();
            request.resolve(result);
        } catch (error: any) {
            // Handle 429 errors with exponential backoff
            if (error.message?.includes('429') || error.message?.includes('quota')) {
                request.retries++;

                if (request.retries < request.maxRetries) {
                    const backoffMs = Math.min(5000 * Math.pow(2, request.retries), 60000);
                    console.warn(`[RateLimiter] 429 error, retrying in ${backoffMs}ms (attempt ${request.retries}/${request.maxRetries})`);

                    setTimeout(() => {
                        // Re-queue: We must be careful not to double count retries in a way that loops forever
                        // But here we push back to queue. 
                        // Note: Re-queuing means it needs another token. This is acceptable for 429s.
                        this.queue.unshift(request);
                        this.processQueue(); // Trigger queue check
                    }, backoffMs);
                } else {
                    console.error(`[RateLimiter] Max retries exceeded for request ${request.id}`);
                    request.reject(error);
                }
            } else {
                request.reject(error);
            }
        }
    }

    /**
     * Check if we can make a request immediately
     */
    canMakeRequest(): boolean {
        return this.tokens > 0;
    }

    /**
     * Get remaining tokens
     */
    getRemainingTokens(): number {
        return this.tokens;
    }

    /**
     * Get queue length
     */
    getQueueLength(): number {
        return this.queue.length;
    }

    /**
     * Get stats
     */
    getStats(): { tokens: number; maxTokens: number; queueLength: number } {
        return {
            tokens: this.tokens,
            maxTokens: this.maxTokens,
            queueLength: this.queue.length
        };
    }
}

// Singleton instance
export const geminiRateLimiter = new RateLimiterService();
