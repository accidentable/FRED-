import React, { useEffect, useState } from 'react';
import { X, Star, Loader2, AlertTriangle } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { FredSeriesData } from '@fred/shared';
import { api } from '@/services/api';

interface WatchCardProps {
  seriesId: string;
  onRemove: () => void;
}

export const WatchCard: React.FC<WatchCardProps> = ({ seriesId, onRemove }) => {
  const [data, setData] = useState<FredSeriesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const isFavorited = useUIStore((s) => s.favoritedIndicators.includes(seriesId));
  const toggleFavorite = useUIStore((s) => s.toggleFavorite);

  useEffect(() => {
    setLoading(true);
    setError(false);
    setData(null);
    api
      .getFredData(seriesId)
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [seriesId]);

  const chartData = data?.data.slice(-60) ?? [];
  const latest = chartData[chartData.length - 1];

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Card header */}
      <div className="flex items-center justify-between px-2 pt-1.5 pb-1 flex-shrink-0">
        <div className="flex flex-col min-w-0 pr-1">
          <span className="font-mono text-[9px] text-terminal-orange truncate leading-tight">
            {data?.title ?? seriesId}
          </span>
          {latest && (
            <span className="font-mono text-[9px] text-terminal-muted leading-tight">
              {seriesId} &nbsp;·&nbsp; {Number(latest.value).toLocaleString()} {data?.units_short ?? ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => toggleFavorite(seriesId)}
            title={isFavorited ? '즐겨찾기 해제' : '즐겨찾기 추가'}
            className={`transition-colors ${isFavorited ? 'text-yellow-400' : 'text-terminal-muted hover:text-yellow-400'}`}
          >
            <Star size={10} fill={isFavorited ? 'currentColor' : 'none'} />
          </button>
          <button
            onClick={onRemove}
            className="text-terminal-muted hover:text-terminal-orange transition-colors"
          >
            <X size={10} />
          </button>
        </div>
      </div>

      {/* Chart area */}
      <div className="flex-1 min-h-0 min-w-0 px-1 pb-1 overflow-hidden">
        {loading && (
          <div className="h-full flex items-center justify-center">
            <Loader2 size={14} className="text-terminal-orange animate-spin" />
          </div>
        )}
        {error && (
          <div className="h-full flex flex-col items-center justify-center gap-1">
            <AlertTriangle size={12} className="text-terminal-red" />
            <span className="font-mono text-[9px] text-terminal-muted">데이터 없음</span>
          </div>
        )}
        {data && !loading && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 2, bottom: 0 }}>
              <defs>
                <linearGradient id={`grad-${data.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ff5f1f" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#ff5f1f" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 2" stroke="#333333" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: '#6B7280', fontSize: 8 }}
                tickFormatter={(s: string) => s.substring(0, 4)}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: '#6B7280', fontSize: 8, fontFamily: 'monospace' }}
                domain={['auto', 'auto']}
                axisLine={false}
                tickLine={false}
                width={38}
                tickCount={4}
                tickFormatter={(v: number) =>
                  Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(Math.round(v))
                }
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#111111',
                  border: '1px solid #ff5f1f44',
                  color: '#e5e5e5',
                  fontSize: '9px',
                  fontFamily: 'monospace',
                  padding: '3px 6px',
                }}
                itemStyle={{ color: '#ff5f1f' }}
                formatter={(value: number | string) => {
                  const num = typeof value === 'string' ? parseFloat(value) : value;
                  return [num.toLocaleString(), seriesId];
                }}
                labelFormatter={(label: string) => label}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#ff5f1f"
                strokeWidth={1.5}
                fillOpacity={1}
                fill={`url(#grad-${data.id})`}
                activeDot={{ r: 3, fill: '#00ff41', stroke: '#000' }}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
