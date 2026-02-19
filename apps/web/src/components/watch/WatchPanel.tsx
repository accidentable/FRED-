import React, { useState } from 'react';
import { Eye } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { DraggedChip } from '@/stores/chatStore';
import { WatchCard } from './WatchCard';

const SLOTS = [0, 1, 2, 3, 4] as const;

export const WatchPanel: React.FC = () => {
  const { watchedIndicators, addWatchIndicator, removeWatchIndicator } = useUIStore();
  const [isDragOver, setIsDragOver] = useState(false);

  const canAdd = watchedIndicators.length < 5;

  const handleDragOver = (e: React.DragEvent) => {
    if (!canAdd) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const { clientX, clientY } = e;
    if (
      clientX <= rect.left || clientX >= rect.right ||
      clientY <= rect.top || clientY >= rect.bottom
    ) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (!canAdd) return;

    try {
      const raw = e.dataTransfer.getData('text/plain');
      const data = JSON.parse(raw) as DraggedChip;
      if (data.type === 'indicator' && data.id) {
        addWatchIndicator(data.id);
      }
    } catch {
      const id = e.dataTransfer.getData('text/plain');
      if (id) addWatchIndicator(id);
    }
  };

  return (
    <div
      className={`w-72 flex-shrink-0 flex flex-col border-l transition-colors duration-150 overflow-hidden ${
        isDragOver
          ? 'border-terminal-orange/60 bg-terminal-orange/5'
          : 'border-terminal-gray/30'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-terminal-gray/30 flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <Eye size={11} className="text-terminal-orange" />
          <span className="font-mono text-[10px] text-terminal-orange tracking-widest">WATCH</span>
        </div>
        <span className="font-mono text-[10px] text-terminal-muted">
          {watchedIndicators.length}/5
        </span>
      </div>

      {/* Content: always 5 equal-height rows via grid */}
      <div className="flex-1 min-h-0 grid" style={{ gridTemplateRows: '1fr 1fr 1fr 1fr 1fr' }}>
        {SLOTS.map((slot) => {
          const id = watchedIndicators[slot];
          const isFirstEmpty = !id && slot === watchedIndicators.length;

          if (id) {
            return (
              <div key={id} className="min-h-0 min-w-0 overflow-hidden border-b border-terminal-gray/20 last:border-b-0">
                <WatchCard seriesId={id} onRemove={() => removeWatchIndicator(id)} />
              </div>
            );
          }

          return (
            <div
              key={`slot-${slot}`}
              className={`min-h-0 border-b border-terminal-gray/15 last:border-b-0 flex items-center justify-center`}
            >
              {isFirstEmpty && canAdd && (
                <div
                  className={`w-full h-full flex flex-col items-center justify-center gap-1.5 border border-dashed m-2 rounded-sm transition-colors ${
                    isDragOver ? 'border-terminal-orange/40' : 'border-terminal-gray/20'
                  }`}
                >
                  <Eye size={16} className={isDragOver ? 'text-terminal-orange' : 'text-terminal-dim'} />
                  <span className="font-mono text-[9px] text-center text-terminal-muted leading-relaxed whitespace-pre-line px-3">
                    {isDragOver ? '드롭하세요' : '지표를 드래그하여\n추가하세요'}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
