import React from 'react';
import { GripVertical, PlusCircle, Activity } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

interface IndicatorCardProps {
  id: string;
  title: string;
  description: string;
  onQuickView: (id: string) => void;
}

export const IndicatorCard: React.FC<IndicatorCardProps> = ({
  id,
  title,
  description,
  onQuickView,
}) => {
  const { t } = useTranslation();

  const handleDragStart = (e: React.DragEvent) => {
    // Send structured JSON for chip creation
    const chipData = JSON.stringify({
      id,
      type: 'indicator',
      label: title,
    });
    e.dataTransfer.setData('text/plain', chipData);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="group flex flex-col bg-terminal-gray/20 border border-terminal-gray hover:border-terminal-orange/50 p-2 rounded-sm cursor-grab active:cursor-grabbing transition-all hover:bg-terminal-gray/40 mb-2 relative"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 overflow-hidden">
          <GripVertical size={12} className="text-terminal-dim flex-shrink-0" />
          {/* Korean title: Pretendard (semibold) */}
          <span className="font-sans text-xs font-semibold text-terminal-primary truncate group-hover:text-terminal-orange transition-colors">
            {title}
          </span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onQuickView(id);
          }}
          className="text-terminal-dim hover:text-terminal-green transition-colors"
          title={t('right_panel.quick_view')}
        >
          <PlusCircle size={14} />
        </button>
      </div>

      <div className="pl-5 mt-1">
        <div className="text-[10px] text-terminal-dim font-mono flex justify-between items-center">
          <span>{id}</span>
          <Activity size={10} className="text-terminal-gray group-hover:text-terminal-green/50" />
        </div>
        <div className="text-[10px] text-terminal-dim/70 mt-0.5 truncate">
          {description}
        </div>
      </div>

      {/* Drag overlay */}
      <div className="absolute inset-0 bg-terminal-orange/5 opacity-0 group-active:opacity-100 pointer-events-none border border-terminal-orange" />
    </div>
  );
};
