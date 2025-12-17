// kiwoomBridgeService.ts - Kiwoom Bridge API Client
import { KIWOOM_BRIDGE_URL } from '../config';

interface TRRequest {
  tr_id: string;
  inputs: Record<string, string>;
  next?: number;
}

interface TRResponse {
  tr_code: string;
  prev_next: string;
  rows: any[];
  error?: string;
}

interface WebSocketMessage {
  type: string;
  ticker?: string;
  tr_id?: string;
  data?: any;
  [key: string]: any;
}

/**
 * Kiwoom Bridge API ?¥Îùº?¥Ïñ∏KRW
 * FastAPI Í∏∞Î∞ò bridge.py?Ä ?µÏã†
 */
class KiwoomBridgeService {
  private baseUrl: string;
  private ws: WebSocket | null = null;
  private wsReconnectTimer: any = null;
  private wsReconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private messageHandlers: Map<string, (data: any) => void> = new Map();
  private subscriptions: Set<string> = new Set();

  constructor() {
    this.baseUrl = KIWOOM_BRIDGE_URL;
  }

  /**
   * Health check - ?úÎ≤ÑÍ∞Ä ?¥ÏïÑ?àÎäîÏßÄ ?ïÏù∏
   */
  async healthCheck(): Promise<{ status: string; kiwoom_connected: boolean; active_websocket_clients: number }> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('[Kiwoom Bridge] Health check error:', error);
      throw error;
    }
  }

  /**
   * TR ?∞Ïù¥KRW?îÏ≤≠ (HTTP)
   */
  async requestTR(trRequest: TRRequest): Promise<TRResponse> {
    try {
      console.log(`[Kiwoom Bridge] Requesting TR: ${trRequest.tr_id}`, trRequest);

      // Ensure tr_id is at top level of payload for bridge.py compatibility
      const payload = {
        tr_id: trRequest.tr_id,
        inputs: trRequest.inputs,
        next: trRequest.next || 0,
      };

      const response = await fetch(`${this.baseUrl}/api/data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`TR request failed: ${response.status} ${response.statusText}`);
      }

      const data: TRResponse = await response.json();

      if (data.error) {
        console.error(`[Kiwoom Bridge] TR error:`, data.error);
        throw new Error(data.error);
      }

      console.log(`[Kiwoom Bridge] TR response:`, data);
      return data;

    } catch (error) {
      console.error('[Kiwoom Bridge] TR request error:', error);
      throw error;
    }
  }

  /**
   * WebSocket ?∞Í≤∞ ?úÏûë
   */
  connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        if (this.ws?.readyState === WebSocket.OPEN) {
          console.log('[Kiwoom Bridge] WebSocket already connected');
          resolve();
          return;
        }

        // Explicit WebSocket URL to match bridge.py endpoint exactly
        const wsUrl = `${this.baseUrl.replace('http', 'ws')}/realtime-data-feed`;
        console.log(`[Kiwoom Bridge] Connecting to WebSocket: ${wsUrl}`);

        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('[Kiwoom Bridge] WebSocket connected');
          this.wsReconnectAttempts = 0;

          // ?¥Ï†Ñ Íµ¨ÎèÖ ?¨Îì±Î°?
          this.subscriptions.forEach(subscription => {
            const [ticker, tr_id] = subscription.split(':');
            this.sendWebSocketMessage({
              type: 'subscribe',
              ticker,
              tr_id,
            });
          });

          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.handleWebSocketMessage(message);
          } catch (error) {
            console.error('[Kiwoom Bridge] Failed to parse WebSocket message:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('[Kiwoom Bridge] WebSocket error:', error);
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('[Kiwoom Bridge] WebSocket disconnected');
          this.ws = null;
          this.attemptReconnect();
        };

      } catch (error) {
        console.error('[Kiwoom Bridge] WebSocket connection error:', error);
        reject(error);
      }
    });
  }

  /**
   * WebSocket ?¨Ïó∞Í≤KRWúÎèÑ
   */
  private attemptReconnect() {
    if (this.wsReconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[Kiwoom Bridge] Max reconnect attempts reached');
      return;
    }

    this.wsReconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.wsReconnectAttempts), 30000);

    console.log(`[Kiwoom Bridge] Reconnecting in ${delay}ms (attempt ${this.wsReconnectAttempts}/${this.maxReconnectAttempts})`);

    this.wsReconnectTimer = setTimeout(() => {
      this.connectWebSocket().catch(err => {
        console.error('[Kiwoom Bridge] Reconnect failed:', err);
      });
    }, delay);
  }

  /**
   * WebSocket Î©îÏãúÏßÄ ?ÑÏÜ°
   */
  private sendWebSocketMessage(message: WebSocketMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('[Kiwoom Bridge] WebSocket not connected, cannot send message');
    }
  }

  /**
   * WebSocket Î©îÏãúÏßÄ Ï≤òÎ¶¨
   */
  private handleWebSocketMessage(message: WebSocketMessage) {
    const { type } = message;

    // Î©îÏãúÏßÄ ?Ä?ÖÎ≥Ñ ?∏Îì§KRW?∏Ï∂ú
    const handler = this.messageHandlers.get(type);
    if (handler) {
      handler(message);
    } else {
      console.log('[Kiwoom Bridge] Unhandled WebSocket message type:', type);
    }
  }

  /**
   * Î©îÏãúÏßÄ ?∏Îì§KRW?±Î°ù
   */
  onMessage(type: string, handler: (data: any) => void) {
    this.messageHandlers.set(type, handler);
  }

  /**
   * Î©îÏãúÏßÄ ?∏Îì§KRW?úÍ±∞
   */
  offMessage(type: string) {
    this.messageHandlers.delete(type);
  }

  /**
   * ?§ÏãúÍ∞KRW∞Ïù¥KRWÍµ¨ÎèÖ
   */
  subscribe(ticker: string, tr_id: string = 'H0STASP0') {
    const subscriptionKey = `${ticker}:${tr_id}`;

    if (this.subscriptions.has(subscriptionKey)) {
      console.log(`[Kiwoom Bridge] Already subscribed to ${subscriptionKey}`);
      return;
    }

    this.subscriptions.add(subscriptionKey);

    this.sendWebSocketMessage({
      type: 'subscribe',
      ticker,
      tr_id,
    });

    console.log(`[Kiwoom Bridge] Subscribed to ${subscriptionKey}`);
  }

  /**
   * ?§ÏãúÍ∞KRW∞Ïù¥KRWÍµ¨ÎèÖ ?¥Ï†ú
   */
  unsubscribe(ticker: string, tr_id: string = 'H0STASP0') {
    const subscriptionKey = `${ticker}:${tr_id}`;

    if (!this.subscriptions.has(subscriptionKey)) {
      console.log(`[Kiwoom Bridge] Not subscribed to ${subscriptionKey}`);
      return;
    }

    this.subscriptions.delete(subscriptionKey);

    this.sendWebSocketMessage({
      type: 'unsubscribe',
      ticker,
      tr_id,
    });

    console.log(`[Kiwoom Bridge] Unsubscribed from ${subscriptionKey}`);
  }

  /**
   * Î™®Îì† Íµ¨ÎèÖ ?¥Ï†ú
   */
  unsubscribeAll() {
    this.subscriptions.forEach(subscription => {
      const [ticker, tr_id] = subscription.split(':');
      this.sendWebSocketMessage({
        type: 'unsubscribe',
        ticker,
        tr_id,
      });
    });
    this.subscriptions.clear();
    console.log('[Kiwoom Bridge] Unsubscribed from all');
  }

  /**
   * WebSocket ?∞Í≤∞ Ï¢ÖÎ£å
   */
  disconnectWebSocket() {
    if (this.wsReconnectTimer) {
      clearTimeout(this.wsReconnectTimer);
      this.wsReconnectTimer = null;
    }

    if (this.ws) {
      this.unsubscribeAll();
      this.ws.close();
      this.ws = null;
    }

    console.log('[Kiwoom Bridge] WebSocket disconnected');
  }

  /**
   * ?∞Í≤∞ ?ÅÌÉú ?ïÏù∏
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// Singleton instance
export const kiwoomBridgeService = new KiwoomBridgeService();
export default kiwoomBridgeService;
