import React from 'react';
import { GripVertical, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';

interface StockCardProps {
  ticker: string;
  name: string;
  price?: number;
  change?: number;
  changePercent?: number;
  isLoading?: boolean;
}

export const StockCard: React.FC<StockCardProps> = ({
  ticker,
  name,
  price,
  change,
  changePercent,
  isLoading,
}) => {
  const isPositive = (change ?? 0) >= 0;

  const handleDragStart = (e: React.DragEvent) => {
    const chipData = JSON.stringify({
      id: ticker,
      type: 'stock',
      label: name,
    });
    e.dataTransfer.setData('text/plain', chipData);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="group flex flex-col bg-terminal-gray/20 border border-terminal-gray hover:border-terminal-green/50 p-2 rounded-sm cursor-grab active:cursor-grabbing transition-all hover:bg-terminal-gray/40 mb-2 relative"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 overflow-hidden">
          <GripVertical size={12} className="text-terminal-dim flex-shrink-0" />
          <span className="font-mono text-xs font-bold text-terminal-green truncate group-hover:text-terminal-green transition-colors">
            {ticker}
          </span>
        </div>
        {isLoading ? (
          <Loader2 size={12} className="text-terminal-dim animate-spin" />
        ) : price ? (
          <span className={`font-mono text-[11px] font-bold ${
            isPositive ? 'text-terminal-green' : 'text-terminal-red'
          }`}>
            ${price.toFixed(2)}
          </span>
        ) : null}
      </div>

      <div className="pl-5 mt-1">
        <div className="text-[10px] text-terminal-dim/70 truncate">
          {name}
        </div>
        {change !== undefined && changePercent !== undefined && (
          <div className={`text-[10px] font-mono flex items-center gap-1 mt-0.5 ${
            isPositive ? 'text-terminal-green/80' : 'text-terminal-red/80'
          }`}>
            {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            {isPositive ? '+' : ''}{change.toFixed(2)} ({isPositive ? '+' : ''}{changePercent.toFixed(2)}%)
          </div>
        )}
      </div>

      {/* Drag overlay */}
      <div className="absolute inset-0 bg-terminal-green/5 opacity-0 group-active:opacity-100 pointer-events-none border border-terminal-green" />
    </div>
  );
};
