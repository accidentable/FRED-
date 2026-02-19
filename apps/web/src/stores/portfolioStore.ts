import { create } from 'zustand';
import { api } from '@/services/api';

// ─── Types ────────────────────────────────────────────────────────────────

export interface PortfolioHolding {
  id: string;       // UUID from Supabase
  ticker: string;   // Always uppercase
  quantity: number; // shares (kept as 'quantity' for chat payload compatibility)
  avgPrice?: number;
}

interface PortfolioState {
  portfolioId: string | null;
  holdings: PortfolioHolding[];
  isSyncing: boolean;

  /** Load (or auto-create) the user's default portfolio from Supabase */
  fetchPortfolio: () => Promise<void>;

  addHolding: (ticker: string, quantity: number, avgPrice?: number) => Promise<void>;
  removeHolding: (ticker: string) => Promise<void>;
  updateQuantity: (ticker: string, quantity: number) => Promise<void>;

  /** Reset local state on logout */
  reset: () => void;
}

// ─── Store ────────────────────────────────────────────────────────────────

export const usePortfolioStore = create<PortfolioState>((set, get) => ({
  portfolioId: null,
  holdings: [],
  isSyncing: false,

  fetchPortfolio: async () => {
    set({ isSyncing: true });
    try {
      let portfolios = await api.portfolio.list();

      // Auto-create a default portfolio on first login
      if (portfolios.length === 0) {
        await api.portfolio.create('내 포트폴리오');
        portfolios = await api.portfolio.list();
      }

      const portfolio = await api.portfolio.get(portfolios[0].id);
      const holdings: PortfolioHolding[] = (portfolio.holdings ?? []).map((h) => ({
        id: h.id,
        ticker: h.ticker,
        quantity: h.shares,
        avgPrice: h.avg_cost,
      }));

      set({ portfolioId: portfolio.id, holdings, isSyncing: false });
    } catch (err) {
      console.error('[portfolio] fetch failed:', err);
      set({ isSyncing: false });
    }
  },

  addHolding: async (ticker, quantity, avgPrice) => {
    const { portfolioId } = get();
    if (!portfolioId) return;

    const id = ticker.toUpperCase().trim();
    if (!id || quantity <= 0) return;

    const record = await api.portfolio.upsertHolding(portfolioId, id, quantity, avgPrice);

    set((state) => {
      const existing = state.holdings.find((h) => h.ticker === id);
      if (existing) {
        return {
          holdings: state.holdings.map((h) =>
            h.ticker === id
              ? { ...h, quantity, ...(avgPrice !== undefined ? { avgPrice } : {}) }
              : h
          ),
        };
      }
      return {
        holdings: [
          ...state.holdings,
          { id: record.id, ticker: id, quantity, ...(avgPrice !== undefined ? { avgPrice } : {}) },
        ],
      };
    });
  },

  removeHolding: async (ticker) => {
    const { portfolioId, holdings } = get();
    if (!portfolioId) return;

    const holding = holdings.find((h) => h.ticker === ticker.toUpperCase());
    if (!holding) return;

    await api.portfolio.deleteHolding(portfolioId, holding.id);
    set((state) => ({
      holdings: state.holdings.filter((h) => h.ticker !== ticker.toUpperCase()),
    }));
  },

  updateQuantity: async (ticker, quantity) => {
    const { portfolioId } = get();
    if (!portfolioId) return;

    const id = ticker.toUpperCase();
    const holding = get().holdings.find((h) => h.ticker === id);
    if (!holding) return;

    await api.portfolio.upsertHolding(portfolioId, id, quantity, holding.avgPrice);
    set((state) => ({
      holdings: state.holdings.map((h) =>
        h.ticker === id ? { ...h, quantity } : h
      ),
    }));
  },

  reset: () => set({ portfolioId: null, holdings: [], isSyncing: false }),
}));
