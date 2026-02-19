import React from 'react';
import { X, BarChart3, TrendingUp } from 'lucide-react';
import { DraggedChip as ChipType } from '@/stores/chatStore';

interface DragChipProps {
  chip: ChipType;
  onRemove: (id: string) => void;
}

export const DragChip: React.FC<DragChipProps> = ({ chip, onRemove }) => {
  const isIndicator = chip.type === 'indicator';

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs font-mono
        border transition-all group animate-in slide-in-from-left-2 duration-200
        ${isIndicator
          ? 'bg-terminal-orange/15 border-terminal-orange/40 text-terminal-orange hover:bg-terminal-orange/25'
          : 'bg-terminal-green/15 border-terminal-green/40 text-terminal-green hover:bg-terminal-green/25'
        }
      `}
    >
      {isIndicator ? <BarChart3 size={12} /> : <TrendingUp size={12} />}
      <span className="font-bold">{chip.id}</span>
      <span className="text-[10px] opacity-70 max-w-[80px] truncate">{chip.label}</span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove(chip.id);
        }}
        className={`
          ml-0.5 rounded-sm p-0.5 opacity-0 group-hover:opacity-100 transition-opacity
          ${isIndicator
            ? 'hover:bg-terminal-orange/30 hover:text-white'
            : 'hover:bg-terminal-green/30 hover:text-white'
          }
        `}
      >
        <X size={10} />
      </button>
    </span>
  );
};
