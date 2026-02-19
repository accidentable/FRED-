import React from 'react';
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
import { useTranslation } from '@/hooks/useTranslation';

interface ChartWidgetProps {
  data: FredSeriesData;
}

export const ChartWidget: React.FC<ChartWidgetProps> = ({ data }) => {
  const { t } = useTranslation();

  return (
    <div className="w-full h-64 md:h-80 border border-terminal-gray bg-terminal-black/50 p-4 mt-2 mb-4 rounded-sm relative overflow-hidden group">
      {/* Header */}
      <div className="absolute top-2 left-4 z-10 text-xs font-mono">
        <div className="text-terminal-orange font-bold flex items-center gap-2">
          <span className="w-2 h-2 bg-terminal-orange rounded-full animate-pulse"></span>
          {data.title}
        </div>
        <div className="text-terminal-dim mt-1">
          {t('chart.unit').toUpperCase()}: {data.units} | {t('chart.freq').toUpperCase()}: {data.frequency}
        </div>
      </div>

      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data.data}
          margin={{ top: 40, right: 20, left: 10, bottom: 5 }}
        >
          <defs>
            <linearGradient id={`color${data.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ff5f1f" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#ff5f1f" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#444" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: '#666', fontSize: 10, fontFamily: 'Fira Code' }}
            tickFormatter={(str: string) => str.substring(0, 4)}
            axisLine={{ stroke: '#333' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#666', fontSize: 10, fontFamily: 'Fira Code' }}
            domain={['auto', 'auto']}
            axisLine={{ stroke: '#333' }}
            tickLine={false}
            width={50}
            tickFormatter={(val: number) => val.toLocaleString()}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1A1A1A',
              border: '1px solid #ff5f1f',
              color: '#F9FAF9',
              fontFamily: 'Fira Code',
              fontSize: '12px',
            }}
            itemStyle={{ color: '#ff5f1f' }}
            formatter={(value: number | string | undefined) => {
              const num = typeof value === 'string' ? parseFloat(value) : (value ?? 0);
              return [num.toLocaleString(), t('chart.tooltip_value')] as [string, string];
            }}
            labelFormatter={(label: unknown) => `${t('chart.tooltip_date')}: ${label}`}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#ff5f1f"
            strokeWidth={2}
            fillOpacity={1}
            fill={`url(#color${data.id})`}
            activeDot={{ r: 4, fill: '#00ff41', stroke: '#000' }}
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Decorative corners */}
      <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-terminal-orange opacity-50"></div>
      <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-terminal-orange opacity-50"></div>
      <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-terminal-orange opacity-50"></div>
      <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-terminal-orange opacity-50"></div>
    </div>
  );
};
