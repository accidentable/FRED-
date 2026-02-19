import { ChatMessage, FredSeriesData, FredSeriesInfo } from '@fred/shared';
import type { PortfolioHolding } from '@/stores/portfolioStore';

const API_BASE = '/api';

// ─── Response Types ─────────────────────────────────────────────────

export interface ChatResponse {
  message: ChatMessage;
  sessionId?: string;
  logs: string[];
  data_objects: FredSeriesInfo[];
  chart_data: FredSeriesData | null;
}

export interface SSEEvent {
  type: 'token' | 'tool_call' | 'tool_result' | 'done' | 'error' | 'fred_search_results';
  content?: string;
  tool?: string;
  input?: Record<string, unknown>;
  result?: string;
  sessionId?: string;
  logs?: string[];
  message?: string;
  // fred_search_results fields
  indicators?: FredSeriesInfo[];
  keywords?: string[];
  count?: number;
}

// ─── API Client ─────────────────────────────────────────────────────

export const api = {
  /** Send a chat message (non-streaming) */
  async sendMessage(
    message: string,
    sessionId?: string,
    locale: string = 'ko',
    context?: { indicators?: string[]; stocks?: string[] },
  ): Promise<ChatResponse> {
    const res = await fetch(`${API_BASE}/chat/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, sessionId, locale, context }),
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => 'Unknown error');
      throw new Error(`[${res.status}] ${errorText}`);
    }

    return res.json();
  },

  /** Send a chat message via SSE stream */
  async sendMessageStream(
    message: string,
    sessionId?: string,
    locale: string = 'ko',
    onEvent?: (event: SSEEvent) => void,
    portfolio?: PortfolioHolding[],
    signal?: AbortSignal,
  ): Promise<void> {
    const res = await fetch(`${API_BASE}/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, sessionId, locale, portfolio: portfolio ?? [] }),
      signal,
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => 'Unknown error');
      throw new Error(`[${res.status}] ${errorText}`);
    }

    const reader = res.body?.getReader();
    if (!reader) throw new Error('No readable stream');

    // Cancel reader if aborted
    signal?.addEventListener('abort', () => { reader.cancel(); });

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event: SSEEvent = JSON.parse(line.slice(6));
              onEvent?.(event);
            } catch {
              // skip malformed events
            }
          }
        }
      }
    } catch (err) {
      // AbortError is expected when user clicks stop — ignore it
      if (err instanceof Error && err.name === 'AbortError') return;
      throw err;
    }
  },

  /** Fetch FRED series data for chart display */
  async getFredData(seriesId: string): Promise<FredSeriesData> {
    const res = await fetch(`${API_BASE}/fred/series/${seriesId}`);
    if (!res.ok) throw new Error(`Failed to fetch FRED data: ${seriesId}`);
    return res.json();
  },

  /** Get all available indicators grouped by category */
  async getIndicators(): Promise<{ categories: Record<string, FredSeriesInfo[]>; all: FredSeriesInfo[] }> {
    const res = await fetch(`${API_BASE}/fred/indicators`);
    if (!res.ok) throw new Error('Failed to fetch indicators');
    return res.json();
  },

  /** Search FRED series by query */
  async searchSeries(query: string): Promise<FredSeriesInfo[]> {
    const res = await fetch(`${API_BASE}/fred/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error('Failed to search series');
    const data = await res.json();
    return data.results ?? data;
  },

  /** Search stock tickers */
  async searchStocks(query: string): Promise<Array<{
    ticker: string; name: string; price?: number; change?: number; changePercent?: number;
  }>> {
    const res = await fetch(`${API_BASE}/stocks/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error('Failed to search stocks');
    return res.json();
  },

  /** Get stock data by ticker */
  async getStockData(ticker: string): Promise<Record<string, unknown>> {
    const res = await fetch(`${API_BASE}/stocks/${ticker}`);
    if (!res.ok) throw new Error(`Failed to fetch stock data: ${ticker}`);
    return res.json();
  },
};
