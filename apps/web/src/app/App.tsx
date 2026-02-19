import React, { useState } from 'react';
import { LeftPanel } from '@/components/layout/LeftPanel';
import { RightPanel } from '@/components/layout/RightPanel';
import { TopBar } from '@/components/layout/TopBar';
import { MessageList } from '@/components/chat/MessageList';
import { ChipInput } from '@/components/chat/ChipInput';
import { ChartOverlay } from '@/components/charts/ChartOverlay';
import { WatchPanel } from '@/components/watch/WatchPanel';
import { useChat } from '@/hooks/useChat';
import { useFredData } from '@/hooks/useFredData';
import { useUIStore } from '@/stores/uiStore';
import { useChatStore, DraggedChip } from '@/stores/chatStore';
import { INDICATOR_NAMES_KO } from '@fred/shared';

const App: React.FC = () => {
  const [inputValue, setInputValue] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const { messages, isLoading, sendMessage, stopMessage } = useChat();
  const { fetchQuickView, closeOverlay } = useFredData();
  const { showRightPanel, overlayData, isOverlayLoading, toggleRightPanel } = useUIStore();
  const { chips, addChip, removeChip } = useChatStore();

  // ── Drag & Drop (entire center panel) ─────────────────────────

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only trigger if leaving the center panel entirely
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const { clientX, clientY } = e;
    if (
      clientX <= rect.left || clientX >= rect.right ||
      clientY <= rect.top || clientY >= rect.bottom
    ) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    try {
      const raw = e.dataTransfer.getData('text/plain');
      const data = JSON.parse(raw) as DraggedChip;
      addChip(data);
    } catch {
      const seriesId = e.dataTransfer.getData('text/plain');
      if (seriesId) {
        const label = INDICATOR_NAMES_KO[seriesId] || seriesId;
        addChip({ id: seriesId, type: 'indicator', label });
      }
    }
  };

  // ── Send ────────────────────────────────────────────────────────

  const handleSend = () => {
    if (inputValue.trim() || chips.length > 0) {
      sendMessage(inputValue);
      setInputValue('');
    }
  };

  // ── Render ──────────────────────────────────────────────────────

  return (
    <div className="flex h-screen bg-terminal-bg text-terminal-primary font-mono overflow-hidden">
      {/* Left Panel */}
      <LeftPanel />

      {/* Center Panel */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          showRightPanel={showRightPanel}
          onToggleRightPanel={toggleRightPanel}
        />

        {/* Below TopBar: Chat area (left) + Watch Panel (right) */}
        <div className="flex flex-1 min-h-0">

          {/* Chat area — drop zone for chips */}
          <div
            className="flex-1 flex flex-col relative min-w-0"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <MessageList messages={messages} isLoading={isLoading} />

            {/* Drop overlay */}
            {isDragging && (
              <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
                <div className="absolute inset-0 bg-terminal-orange/5 border-2 border-dashed border-terminal-orange/40" />
                <div className="relative bg-terminal-black/80 backdrop-blur px-6 py-3 border border-terminal-orange/50 shadow-lg shadow-terminal-orange/10">
                  <span className="text-terminal-orange font-mono text-sm font-bold animate-pulse tracking-wider">
                    ⬇ 채팅에 추가
                  </span>
                </div>
              </div>
            )}

            <ChipInput
              chips={chips}
              inputValue={inputValue}
              isLoading={isLoading}
              onInputChange={setInputValue}
              onSend={handleSend}
              onStop={stopMessage}
              onRemoveChip={removeChip}
            />
          </div>

          {/* Watch Panel — inline chart monitor */}
          <WatchPanel />
        </div>
      </div>

      {/* Right Panel */}
      {showRightPanel && <RightPanel onQuickView={fetchQuickView} />}

      {/* Chart Overlay */}
      {(overlayData || isOverlayLoading) && (
        <ChartOverlay
          data={overlayData}
          isLoading={isOverlayLoading}
          onClose={closeOverlay}
        />
      )}
    </div>
  );
};

export default App;
