import React, { useState, useRef, useEffect } from 'react';
import { X, TrendingUp } from 'lucide-react';

interface PortfolioDropModalProps {
  ticker: string;
  label: string;
  onConfirm: (quantity: number, avgPrice?: number) => void;
  onCancel: () => void;
}

export const PortfolioDropModal: React.FC<PortfolioDropModalProps> = ({
  ticker,
  label,
  onConfirm,
  onCancel,
}) => {
  const [quantity, setQuantity] = useState('');
  const [avgPrice, setAvgPrice] = useState('');
  const quantityRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    quantityRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = parseFloat(quantity);
    if (isNaN(q) || q <= 0) return;
    const ap = parseFloat(avgPrice);
    onConfirm(q, isNaN(ap) || ap <= 0 ? undefined : ap);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onCancel();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onKeyDown={handleKeyDown}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="bg-terminal-bg border border-terminal-green/40 rounded-sm shadow-2xl p-4 w-72 font-mono">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp size={12} className="text-terminal-green" />
            <div>
              <span className="text-xs text-terminal-green font-bold">{ticker}</span>
              {label !== ticker && (
                <span className="text-[10px] text-terminal-dim ml-1.5 truncate max-w-[140px] inline-block align-bottom">
                  {label}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onCancel}
            className="text-terminal-dim hover:text-terminal-light transition-colors"
          >
            <X size={12} />
          </button>
        </div>

        <div className="text-[10px] text-terminal-dim mb-3 pb-2 border-b border-terminal-gray/40">
          포트폴리오에 추가
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Quantity */}
          <div>
            <label className="text-[10px] text-terminal-dim uppercase tracking-wider block mb-1">
              수량 <span className="text-terminal-green">*</span>
            </label>
            <input
              ref={quantityRef}
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="0"
              min="0.0001"
              step="any"
              className="w-full bg-terminal-gray/30 border border-terminal-gray/60 text-terminal-light
                         font-mono text-xs px-2 py-1.5 outline-none rounded-sm
                         focus:border-terminal-green/60 placeholder:text-terminal-dim/40"
            />
          </div>

          {/* Average Price */}
          <div>
            <label className="text-[10px] text-terminal-dim uppercase tracking-wider block mb-1">
              평단가 <span className="text-terminal-dim/50">(선택)</span>
            </label>
            <div className="relative">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-terminal-dim text-[10px]">$</span>
              <input
                type="number"
                value={avgPrice}
                onChange={(e) => setAvgPrice(e.target.value)}
                placeholder="0.00"
                min="0"
                step="any"
                className="w-full bg-terminal-gray/30 border border-terminal-gray/60 text-terminal-light
                           font-mono text-xs pl-5 pr-2 py-1.5 outline-none rounded-sm
                           focus:border-terminal-green/60 placeholder:text-terminal-dim/40"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-1.5 text-[10px] border border-terminal-gray/60 text-terminal-dim
                         hover:text-terminal-light hover:border-terminal-gray transition-colors rounded-sm"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={!quantity || parseFloat(quantity) <= 0}
              className="flex-1 py-1.5 text-[10px] bg-terminal-green/20 border border-terminal-green/40
                         text-terminal-green hover:bg-terminal-green/30 disabled:opacity-30
                         disabled:cursor-not-allowed transition-colors rounded-sm font-bold"
            >
              추가
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
