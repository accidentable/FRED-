import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ─── Types (single source of truth, shared with api.ts / useChat.ts) ──────

export interface PortfolioHolding {
  ticker: string;      // Always uppercase, e.g. "NVDA"
  quantity: number;    // Supports fractional (e.g. 0.5 BTC)
  avgPrice?: number;   // Average purchase price in USD
}

interface PortfolioState {
  holdings: PortfolioHolding[];
  addHolding: (ticker: string, quantity: number, avgPrice?: number) => void;
  removeHolding: (ticker: string) => void;
  updateQuantity: (ticker: string, quantity: number) => void;
}

// ─── Store ────────────────────────────────────────────────────────────────

export const usePortfolioStore = create<PortfolioState>()(
  persist(
    (set) => ({
      holdings: [],

      addHolding: (ticker, quantity, avgPrice) =>
        set((state) => {
          const id = ticker.toUpperCase().trim();
          if (!id || quantity <= 0) return state;

          // Update quantity (and avgPrice if provided) if already tracked, otherwise append
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
              { ticker: id, quantity, ...(avgPrice !== undefined ? { avgPrice } : {}) },
            ],
          };
        }),

      removeHolding: (ticker) =>
        set((state) => ({
          holdings: state.holdings.filter(
            (h) => h.ticker !== ticker.toUpperCase()
          ),
        })),

      updateQuantity: (ticker, quantity) =>
        set((state) => ({
          holdings: state.holdings.map((h) =>
            h.ticker === ticker.toUpperCase() ? { ...h, quantity } : h
          ),
        })),
    }),
    { name: 'fred-os-portfolio' }
  )
);
