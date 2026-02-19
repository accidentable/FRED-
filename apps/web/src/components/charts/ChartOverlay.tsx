import React, { useEffect, useCallback } from 'react';
import { X, Maximize2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { FredSeriesData } from '@fred/shared';
import { ChartWidget } from './ChartWidget';
import { useTranslation } from '@/hooks/useTranslation';

interface ChartOverlayProps {
  data: FredSeriesData | null;
  isLoading: boolean;
  onClose: () => void;
}

export const ChartOverlay: React.FC<ChartOverlayProps> = ({ data, isLoading, onClose }) => {
  const { t } = useTranslation();

  // ESC key to close
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Click backdrop to close
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (!data && !isLoading) return null;

  // Compute stats
  const stats = data ? (() => {
    const latest = data.data[data.data.length - 1];
    const prev = data.data.length >= 2 ? data.data[data.data.length - 2] : null;
    const first = data.data[0];
    const change = prev ? latest.value - prev.value : 0;
    const changePct = prev && prev.value !== 0 ? (change / prev.value) * 100 : 0;
    return { latest, prev, first, change, changePct };
  })() : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={handleBackdropClick}
    >
      <div className="w-full max-w-3xl bg-terminal-bg border border-terminal-orange shadow-[0_0_30px_rgba(255,95,31,0.15)] relative flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-terminal-gray bg-terminal-gray/20">
          <div className="flex items-center gap-2 text-terminal-orange font-mono text-sm font-bold">
            <Maximize2 size={16} />
            <span>{t('chart.overlay_title')}</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-terminal-dim font-mono">
            <span>ESC to close</span>
            <button
              onClick={onClose}
              className="text-terminal-dim hover:text-terminal-red transition-colors p-1"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 min-h-[300px] flex items-center justify-center">
          {isLoading ? (
            <div className="flex flex-col items-center gap-4 text-terminal-orange">
              <div className="w-8 h-8 border-2 border-terminal-orange border-t-transparent rounded-full animate-spin"></div>
              <span className="font-mono text-xs animate-pulse">{t('chart.fetching')}</span>
            </div>
          ) : data && stats ? (
            <div className="w-full">
              {/* Title + Meta */}
              <div className="mb-2">
                <h2 className="text-lg font-bold text-terminal-light">{data.title}</h2>
                <div className="text-xs text-terminal-dim font-mono">
                  ID: {data.id} | {t('chart.freq').toUpperCase()}: {data.frequency} | {t('chart.last_updated').toUpperCase()}: {data.lastUpdated}
                </div>
              </div>

              {/* Stats Row */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-terminal-gray/20 border border-terminal-gray p-3 rounded-sm">
                  <div className="text-[10px] text-terminal-dim uppercase tracking-wider mb-1">최신값</div>
                  <div className="text-lg font-bold text-terminal-light font-mono">
                    {stats.latest.value.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-terminal-dim">{data.units}</div>
                </div>

                <div className="bg-terminal-gray/20 border border-terminal-gray p-3 rounded-sm">
                  <div className="text-[10px] text-terminal-dim uppercase tracking-wider mb-1">전월 대비</div>
                  <div className={`text-lg font-bold font-mono flex items-center gap-1 ${
                    stats.change > 0 ? 'text-terminal-green' : stats.change < 0 ? 'text-terminal-red' : 'text-terminal-dim'
                  }`}>
                    {stats.change > 0 ? <TrendingUp size={16} /> : stats.change < 0 ? <TrendingDown size={16} /> : <Minus size={16} />}
                    {stats.changePct >= 0 ? '+' : ''}{stats.changePct.toFixed(2)}%
                  </div>
                  <div className="text-[10px] text-terminal-dim">
                    {stats.change >= 0 ? '+' : ''}{stats.change.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </div>
                </div>

                <div className="bg-terminal-gray/20 border border-terminal-gray p-3 rounded-sm">
                  <div className="text-[10px] text-terminal-dim uppercase tracking-wider mb-1">기간</div>
                  <div className="text-sm font-bold text-terminal-light font-mono">
                    {stats.first.date.substring(0, 4)}
                  </div>
                  <div className="text-[10px] text-terminal-dim">
                    ~ {stats.latest.date.substring(0, 7)} ({data.data.length}개)
                  </div>
                </div>
              </div>

              {/* Chart */}
              <ChartWidget data={data} />
            </div>
          ) : (
            <div className="text-terminal-red font-mono">{t('chart.data_link_failed')}</div>
          )}
        </div>

        {/* Footer accent */}
        <div className="h-1 bg-gradient-to-r from-terminal-orange via-terminal-orange/50 to-transparent w-full"></div>
      </div>
    </div>
  );
};
