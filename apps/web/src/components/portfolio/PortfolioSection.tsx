import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, TrendingUp, TrendingDown, Loader2, Briefcase, PackagePlus } from 'lucide-react';
import { usePortfolioStore } from '@/stores/portfolioStore';
import { api } from '@/services/api';
import { PortfolioDropModal } from './PortfolioDropModal';

// ─── Simple module-level price cache (TTL: 60s) ──────────────────────
// Avoids duplicate API calls across re-renders without needing React Query
interface CachedPrice {
  price: number;
  change: number;
  changePercent: number;
  ts: number;
}
const PRICE_CACHE = new Map<string, CachedPrice>();
const CACHE_TTL_MS = 60_000;

async function fetchPrice(ticker: string): Promise<CachedPrice | null> {
  const cached = PRICE_CACHE.get(ticker);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached;

  try {
    const raw = await api.getStockData(ticker);
    const entry: CachedPrice = {
      price: (raw.price as number) ?? 0,
      change: (raw.change as number) ?? 0,
      changePercent: (raw.changePercent as number) ?? 0,
      ts: Date.now(),
    };
    PRICE_CACHE.set(ticker, entry);
    return entry;
  } catch {
    return null;
  }
}

// ─── Per-holding price row ────────────────────────────────────────────

interface HoldingRowProps {
  ticker: string;
  quantity: number;
  avgPrice?: number;
  onRemove: () => void;
}

const HoldingRow: React.FC<HoldingRowProps> = ({ ticker, quantity, avgPrice, onRemove }) => {
  const [price, setPrice] = useState<CachedPrice | null>(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    setFetching(true);
    fetchPrice(ticker).then((p) => {
      setPrice(p);
      setFetching(false);
    });
  }, [ticker]);

  const isUp = (price?.change ?? 0) >= 0;
  const pnlPct =
    avgPrice && avgPrice > 0 && price
      ? ((price.price - avgPrice) / avgPrice) * 100
      : null;
  const isPnlUp = (pnlPct ?? 0) >= 0;

  return (
    <div className="flex items-start gap-1.5 px-2 py-1.5 hover:bg-terminal-gray/20 group rounded-sm">
      {/* Ticker + Quantity + Avg Price */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[10px] font-bold text-terminal-orange">{ticker}</span>
          <span className="font-mono text-[9px] text-terminal-dim">{quantity.toLocaleString()}주</span>
        </div>
        {avgPrice && avgPrice > 0 ? (
          <div className="flex items-center gap-1 mt-0.5">
            <span className="font-mono text-[9px] text-terminal-dim">
              평단 ${avgPrice.toFixed(2)}
            </span>
            {pnlPct !== null && (
              <span className={`font-mono text-[8px] ${isPnlUp ? 'text-terminal-green' : 'text-red-400'}`}>
                ({isPnlUp ? '+' : ''}{pnlPct.toFixed(1)}%)
              </span>
            )}
          </div>
        ) : null}
      </div>

      {/* Live Price */}
      <div className="flex items-center gap-0.5 flex-shrink-0">
        {fetching ? (
          <Loader2 size={8} className="text-terminal-dim animate-spin" />
        ) : price ? (
          <>
            {isUp
              ? <TrendingUp size={8} className="text-terminal-green" />
              : <TrendingDown size={8} className="text-red-400" />
            }
            <span className={`font-mono text-[9px] ${isUp ? 'text-terminal-green' : 'text-red-400'}`}>
              ${price.price.toFixed(2)}
            </span>
          </>
        ) : (
          <span className="font-mono text-[9px] text-terminal-dim">—</span>
        )}
      </div>

      {/* Remove */}
      <button
        onClick={onRemove}
        className="flex-shrink-0 opacity-0 group-hover:opacity-100 text-terminal-dim hover:text-red-400 transition-all"
        title={`${ticker} 제거`}
      >
        <Trash2 size={9} />
      </button>
    </div>
  );
};

// ─── Add Form ─────────────────────────────────────────────────────────

interface AddFormProps {
  onAdd: (ticker: string, quantity: number, avgPrice?: number) => void;
}

const AddForm: React.FC<AddFormProps> = ({ onAdd }) => {
  const [ticker, setTicker] = useState('');
  const [quantity, setQuantity] = useState('');
  const [avgPrice, setAvgPrice] = useState('');
  const tickerRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = ticker.trim().toUpperCase();
    const q = parseFloat(quantity);
    if (!t || isNaN(q) || q <= 0) return;
    const ap = parseFloat(avgPrice);
    onAdd(t, q, isNaN(ap) || ap <= 0 ? undefined : ap);
    setTicker('');
    setQuantity('');
    setAvgPrice('');
    tickerRef.current?.focus();
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-1 px-2 py-2">
      <input
        ref={tickerRef}
        value={ticker}
        onChange={(e) => setTicker(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
        placeholder="티커"
        maxLength={5}
        className="w-14 bg-terminal-gray/30 border border-terminal-gray/60 text-terminal-orange
                   font-mono text-[10px] px-1.5 py-1 outline-none rounded-sm
                   focus:border-terminal-orange/60 placeholder:text-terminal-dim/40"
      />
      <input
        value={quantity}
        onChange={(e) => setQuantity(e.target.value)}
        placeholder="수량"
        type="number"
        min="0.0001"
        step="any"
        className="w-14 bg-terminal-gray/30 border border-terminal-gray/60 text-terminal-light
                   font-mono text-[10px] px-1.5 py-1 outline-none rounded-sm
                   focus:border-terminal-orange/60 placeholder:text-terminal-dim/40"
      />
      <input
        value={avgPrice}
        onChange={(e) => setAvgPrice(e.target.value)}
        placeholder="평단가"
        type="number"
        min="0"
        step="any"
        className="flex-1 bg-terminal-gray/30 border border-terminal-gray/60 text-terminal-light
                   font-mono text-[10px] px-1.5 py-1 outline-none rounded-sm
                   focus:border-terminal-orange/60 placeholder:text-terminal-dim/40"
      />
      <button
        type="submit"
        disabled={!ticker || !quantity}
        className="flex-shrink-0 w-6 h-[26px] flex items-center justify-center
                   bg-terminal-orange/20 border border-terminal-orange/40 text-terminal-orange
                   hover:bg-terminal-orange/30 disabled:opacity-30 disabled:cursor-not-allowed
                   transition-colors rounded-sm"
        title="종목 추가"
      >
        <Plus size={10} />
      </button>
    </form>
  );
};

// ─── Portfolio Section ────────────────────────────────────────────────

export const PortfolioSection: React.FC = () => {
  const { holdings, addHolding, removeHolding } = usePortfolioStore();
  const [isDragOver, setIsDragOver] = useState(false);
  const [dropModal, setDropModal] = useState<{ ticker: string; label: string } | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear when leaving the drop zone entirely (not its children)
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    try {
      const raw = e.dataTransfer.getData('text/plain');
      const data = JSON.parse(raw);
      if (data.type === 'stock' && data.id) {
        setDropModal({ ticker: data.id, label: data.label || data.id });
      }
    } catch {
      // ignore invalid drops
    }
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-terminal-gray flex-shrink-0">
        <Briefcase size={10} className="text-terminal-orange flex-shrink-0" />
        <span className="text-[10px] text-terminal-dim uppercase tracking-wider">내 포트폴리오</span>
        {holdings.length > 0 && (
          <span className="ml-auto text-[9px] font-mono text-terminal-dim/60">
            {holdings.length}종목
          </span>
        )}
      </div>

      {/* Drop Zone: Holdings List */}
      <div
        className={`flex-1 overflow-y-auto custom-scrollbar relative transition-colors ${
          isDragOver ? 'bg-terminal-green/5' : ''
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {holdings.length > 0 ? (
          <div className="py-1">
            {holdings.map((h) => (
              <HoldingRow
                key={h.ticker}
                ticker={h.ticker}
                quantity={h.quantity}
                avgPrice={h.avgPrice}
                onRemove={() => removeHolding(h.ticker)}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full px-4 text-center gap-3">
            <PackagePlus size={22} className="text-terminal-dim/25" />
            <p className="font-mono text-[9px] text-terminal-dim/40 leading-relaxed">
              오른쪽 종목 패널에서<br />
              여기로 드래그하세요
            </p>
          </div>
        )}

        {/* Drag overlay */}
        {isDragOver && (
          <div className="absolute inset-0 border-2 border-dashed border-terminal-green/50 pointer-events-none flex items-center justify-center">
            <span className="font-mono text-[10px] text-terminal-green bg-terminal-bg/80 px-2 py-1 rounded-sm">
              드롭하여 포트폴리오에 추가
            </span>
          </div>
        )}
      </div>

      {/* Add Form */}
      <div className="border-t border-terminal-gray flex-shrink-0">
        <AddForm onAdd={(ticker, quantity, avgPrice) => addHolding(ticker, quantity, avgPrice)} />
      </div>

      {/* Drop Modal */}
      {dropModal && (
        <PortfolioDropModal
          ticker={dropModal.ticker}
          label={dropModal.label}
          onConfirm={(quantity, avgPrice) => {
            addHolding(dropModal.ticker, quantity, avgPrice);
            setDropModal(null);
          }}
          onCancel={() => setDropModal(null)}
        />
      )}
    </div>
  );
};
