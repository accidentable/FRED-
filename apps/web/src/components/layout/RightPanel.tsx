import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Layers, Search, Loader2, BarChart3, TrendingUp } from 'lucide-react';
import { INDICATOR_CATEGORIES, FredSeriesInfo } from '@fred/shared';
import { IndicatorCard } from '@/components/indicators/IndicatorCard';
import { StockCard } from '@/components/stocks/StockCard';
import { useTranslation } from '@/hooks/useTranslation';
import { useUIStore } from '@/stores/uiStore';
import { api } from '@/services/api';

interface RightPanelProps {
  onQuickView: (id: string) => void;
}

export const RightPanel: React.FC<RightPanelProps> = ({ onQuickView }) => {
  const { t, category } = useTranslation();
  const { rightPanelTab, setRightPanelTab } = useUIStore();

  // ── Search ─────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [indicatorResults, setIndicatorResults] = useState<FredSeriesInfo[]>([]);
  const [stockResults, setStockResults] = useState<Array<{
    ticker: string; name: string; price?: number; change?: number; changePercent?: number;
  }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim()) {
      setIndicatorResults([]);
      setStockResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        if (rightPanelTab === 'indicators') {
          // Local filter
          const allIndicators = Object.values(INDICATOR_CATEGORIES).flat();
          const matches = allIndicators.filter((ind) =>
            ind.id.toLowerCase().includes(query.toLowerCase()) ||
            ind.title.toLowerCase().includes(query.toLowerCase()) ||
            ind.description.toLowerCase().includes(query.toLowerCase())
          );
          setIndicatorResults(matches);

          // Also try API
          try {
            const apiResults = await api.searchSeries(query);
            const localIds = new Set(matches.map((m) => m.id));
            setIndicatorResults([
              ...matches,
              ...apiResults.filter((r: FredSeriesInfo) => !localIds.has(r.id)),
            ].slice(0, 20));
          } catch { /* ignore */ }
        } else {
          // Stock search via backend
          try {
            const results = await api.searchStocks(query);
            setStockResults(results);
          } catch {
            setStockResults([]);
          }
        }
      } finally {
        setIsSearching(false);
      }
    }, 300);
  }, [rightPanelTab]);

  // Reset search on tab change
  useEffect(() => {
    setSearchQuery('');
    setIndicatorResults([]);
    setStockResults([]);
  }, [rightPanelTab]);

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

  const showingSearch = searchQuery.trim().length > 0;

  return (
    <div className="hidden lg:flex flex-col w-72 bg-terminal-bg border-l border-terminal-gray h-full">
      {/* Header */}
      <div className="h-14 border-b border-terminal-gray flex items-center px-4 bg-terminal-bg/50 justify-between">
        <span className="text-terminal-orange font-bold tracking-widest text-xs flex items-center gap-2">
          <Layers size={14} />
          {t('right_panel.header')}
        </span>
        <div className="w-2 h-2 rounded-full bg-terminal-orange animate-pulse"></div>
      </div>

      {/* Tab Bar */}
      <div className="flex border-b border-terminal-gray">
        <button
          onClick={() => setRightPanelTab('indicators')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-mono uppercase tracking-wider transition-colors ${
            rightPanelTab === 'indicators'
              ? 'text-terminal-orange border-b-2 border-terminal-orange bg-terminal-orange/5'
              : 'text-terminal-dim hover:text-terminal-light'
          }`}
        >
          <BarChart3 size={12} />
          지표
        </button>
        <button
          onClick={() => setRightPanelTab('stocks')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-mono uppercase tracking-wider transition-colors ${
            rightPanelTab === 'stocks'
              ? 'text-terminal-green border-b-2 border-terminal-green bg-terminal-green/5'
              : 'text-terminal-dim hover:text-terminal-light'
          }`}
        >
          <TrendingUp size={12} />
          종목
        </button>
      </div>

      {/* Search */}
      <div className="p-3 border-b border-terminal-gray">
        <div className="relative">
          {isSearching ? (
            <Loader2 size={12} className="absolute left-2 top-2.5 text-terminal-orange animate-spin" />
          ) : (
            <Search size={12} className="absolute left-2 top-2.5 text-terminal-dim" />
          )}
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder={rightPanelTab === 'indicators'
              ? t('right_panel.search_placeholder')
              : '종목 검색 (예: AAPL, Tesla)...'
            }
            className="w-full bg-terminal-gray/20 border border-terminal-gray rounded-sm py-1.5 pl-8 pr-2 text-xs text-terminal-primary focus:border-terminal-orange focus:outline-none font-mono"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
        {rightPanelTab === 'indicators' ? (
          /* INDICATORS TAB */
          showingSearch ? (
            <div>
              <div className="text-[10px] text-terminal-dim mb-2 uppercase tracking-widest font-bold border-b border-terminal-orange/30 pb-1">
                검색 결과 ({indicatorResults.length})
              </div>
              {indicatorResults.length > 0 ? (
                indicatorResults.map((item) => (
                  <IndicatorCard
                    key={item.id}
                    id={item.id}
                    title={item.title}
                    description={item.description || ''}
                    onQuickView={onQuickView}
                  />
                ))
              ) : !isSearching ? (
                <div className="text-[10px] text-terminal-dim/50 text-center py-4 font-mono">
                  No results found
                </div>
              ) : null}
            </div>
          ) : (
            <>
              {Object.entries(INDICATOR_CATEGORIES).map(([categoryKey, items]) => (
                <div key={categoryKey} className="mb-6">
                  <div className="text-[10px] text-terminal-dim mb-2 uppercase tracking-widest font-bold border-b border-terminal-gray/30 pb-1">
                    {category(categoryKey)}
                  </div>
                  <div>
                    {items.map((item) => (
                      <IndicatorCard
                        key={item.id}
                        id={item.id}
                        title={item.title}
                        description={item.description}
                        onQuickView={onQuickView}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </>
          )
        ) : (
          /* STOCKS TAB */
          showingSearch ? (
            <div>
              <div className="text-[10px] text-terminal-dim mb-2 uppercase tracking-widest font-bold border-b border-terminal-green/30 pb-1">
                종목 검색 결과 ({stockResults.length})
              </div>
              {stockResults.length > 0 ? (
                stockResults.map((stock) => (
                  <StockCard
                    key={stock.ticker}
                    ticker={stock.ticker}
                    name={stock.name}
                    price={stock.price}
                    change={stock.change}
                    changePercent={stock.changePercent}
                  />
                ))
              ) : !isSearching ? (
                <div className="text-[10px] text-terminal-dim/50 text-center py-4 font-mono">
                  No results — 티커를 검색하세요
                </div>
              ) : null}
            </div>
          ) : (
            /* Default: Popular Tickers */
            <div>
              <div className="text-[10px] text-terminal-dim mb-2 uppercase tracking-widest font-bold border-b border-terminal-green/30 pb-1">
                인기 종목
              </div>
              {['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 'META', 'NFLX', 'JPM', 'V'].map((ticker) => {
                const names: Record<string, string> = {
                  AAPL: 'Apple Inc.', MSFT: 'Microsoft', GOOGL: 'Alphabet', AMZN: 'Amazon',
                  NVDA: 'NVIDIA', TSLA: 'Tesla', META: 'Meta Platforms', NFLX: 'Netflix',
                  JPM: 'JPMorgan Chase', V: 'Visa Inc.',
                };
                return (
                  <StockCard
                    key={ticker}
                    ticker={ticker}
                    name={names[ticker] || ticker}
                  />
                );
              })}

              <div className="p-2 border border-dashed border-terminal-green/30 rounded text-center mt-4">
                <span className="text-[10px] text-terminal-dim">
                  종목을 터미널로 드래그하세요
                </span>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
};
