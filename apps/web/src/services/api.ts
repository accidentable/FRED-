import { ChatMessage, FredSeriesData, FredSeriesInfo } from '@fred/shared';
import type { PortfolioHolding } from '@/stores/portfolioStore';
import { supabase } from '@/services/supabase';

const API_BASE = '/api';

// ─── Auth Helper ─────────────────────────────────────────────────────

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ─── Response Types ──────────────────────────────────────────────────

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
  indicators?: FredSeriesInfo[];
  keywords?: string[];
  count?: number;
}

export interface PortfolioRecord {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  holdings?: HoldingRecord[];
}

export interface HoldingRecord {
  id: string;
  portfolio_id: string;
  ticker: string;
  shares: number;
  avg_cost?: number;
  currency: string;
  note?: string;
}

// ─── API Client ──────────────────────────────────────────────────────

export const api = {
  // ── Chat ──────────────────────────────────────────────────────────

  async sendMessage(
    message: string,
    sessionId?: string,
    locale: string = 'ko',
    context?: { indicators?: string[]; stocks?: string[] },
  ): Promise<ChatResponse> {
    const res = await fetch(`${API_BASE}/chat/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
      body: JSON.stringify({ message, sessionId, locale, context }),
    });
    if (!res.ok) throw new Error(`[${res.status}] ${await res.text().catch(() => '')}`);
    return res.json();
  },

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
      headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
      body: JSON.stringify({ message, sessionId, locale, portfolio: portfolio ?? [] }),
      signal,
    });
    if (!res.ok) throw new Error(`[${res.status}] ${await res.text().catch(() => '')}`);

    const reader = res.body?.getReader();
    if (!reader) throw new Error('No readable stream');

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
            try { onEvent?.(JSON.parse(line.slice(6))); } catch { /* skip */ }
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      throw err;
    }
  },

  // ── FRED / Stocks ──────────────────────────────────────────────────

  async getFredData(seriesId: string): Promise<FredSeriesData> {
    const res = await fetch(`${API_BASE}/fred/series/${seriesId}`);
    if (!res.ok) throw new Error(`Failed to fetch FRED data: ${seriesId}`);
    return res.json();
  },

  async getIndicators(): Promise<{ categories: Record<string, FredSeriesInfo[]>; all: FredSeriesInfo[] }> {
    const res = await fetch(`${API_BASE}/fred/indicators`);
    if (!res.ok) throw new Error('Failed to fetch indicators');
    return res.json();
  },

  async searchSeries(query: string): Promise<FredSeriesInfo[]> {
    const res = await fetch(`${API_BASE}/fred/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error('Failed to search series');
    const data = await res.json();
    return data.results ?? data;
  },

  async searchStocks(query: string): Promise<Array<{
    ticker: string; name: string; price?: number; change?: number; changePercent?: number;
  }>> {
    const res = await fetch(`${API_BASE}/stocks/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error('Failed to search stocks');
    return res.json();
  },

  async getStockData(ticker: string): Promise<Record<string, unknown>> {
    const res = await fetch(`${API_BASE}/stocks/${ticker}`);
    if (!res.ok) throw new Error(`Failed to fetch stock data: ${ticker}`);
    return res.json();
  },

  // ── Portfolio ──────────────────────────────────────────────────────

  portfolio: {
    async list(): Promise<PortfolioRecord[]> {
      const res = await fetch(`${API_BASE}/portfolio/`, {
        headers: await authHeaders(),
      });
      if (!res.ok) throw new Error(`Failed to list portfolios: ${res.status}`);
      return res.json();
    },

    async create(name = '내 포트폴리오'): Promise<PortfolioRecord> {
      const res = await fetch(`${API_BASE}/portfolio/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error(`Failed to create portfolio: ${res.status}`);
      return res.json();
    },

    async get(portfolioId: string): Promise<PortfolioRecord> {
      const res = await fetch(`${API_BASE}/portfolio/${portfolioId}`, {
        headers: await authHeaders(),
      });
      if (!res.ok) throw new Error(`Failed to get portfolio: ${res.status}`);
      return res.json();
    },

    async upsertHolding(
      portfolioId: string,
      ticker: string,
      shares: number,
      avgCost?: number,
    ): Promise<HoldingRecord> {
      const res = await fetch(`${API_BASE}/portfolio/${portfolioId}/holdings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
        body: JSON.stringify({ ticker, shares, avg_cost: avgCost }),
      });
      if (!res.ok) throw new Error(`Failed to upsert holding: ${res.status}`);
      return res.json();
    },

    async deleteHolding(portfolioId: string, holdingId: string): Promise<void> {
      const res = await fetch(`${API_BASE}/portfolio/${portfolioId}/holdings/${holdingId}`, {
        method: 'DELETE',
        headers: await authHeaders(),
      });
      if (!res.ok) throw new Error(`Failed to delete holding: ${res.status}`);
    },
  },
};
