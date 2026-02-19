import React from 'react';
import { Menu, PanelRightClose, PanelRightOpen, SquarePen } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { useChatStore } from '@/stores/chatStore';
import { useUIStore } from '@/stores/uiStore';
import { useSessionHistoryStore } from '@/stores/sessionHistoryStore';
import { MessageRole } from '@fred/shared';

interface TopBarProps {
  showRightPanel: boolean;
  onToggleRightPanel: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ showRightPanel, onToggleRightPanel }) => {
  const { t } = useTranslation();
  const { reset, isLoading, messages, sessionId } = useChatStore();
  const { setWatchedIndicators } = useUIStore();
  const saveSession = useSessionHistoryStore((s) => s.saveSession);

  const handleNewChat = () => {
    if (isLoading) return;
    // Save current session to history before clearing (only if it has user messages)
    if (sessionId && messages.some((m) => m.role === MessageRole.USER)) {
      saveSession(sessionId, messages);
    }
    reset();
    setWatchedIndicators([]); // Watch 패널 초기화
  };

  return (
    <div className="h-14 border-b border-terminal-gray flex items-center justify-between px-4 bg-terminal-bg/95 z-30">
      <div className="flex items-center gap-4">
        <button className="md:hidden text-terminal-orange">
          <Menu />
        </button>
        <div className="flex flex-col">
          <h1 className="text-lg font-bold text-terminal-light tracking-wider">
            {t('topbar.title_prefix')}<span className="text-terminal-orange">{t('topbar.title_accent')}</span>
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden sm:flex items-center gap-2 text-terminal-dim text-xs">
          <span>{t('topbar.latency')}: 24ms</span>
          <div className="w-1.5 h-1.5 rounded-full bg-terminal-green"></div>
        </div>

        {/* New Chat button */}
        <button
          onClick={handleNewChat}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-terminal-gray text-terminal-dim hover:border-terminal-orange hover:text-terminal-orange transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          title="새 채팅"
        >
          <SquarePen size={13} />
          <span className="hidden sm:inline">새 채팅</span>
        </button>

        <button
          onClick={onToggleRightPanel}
          className="text-terminal-dim hover:text-terminal-orange transition-colors hidden lg:block"
          title={t('topbar.toggle_panel')}
        >
          {showRightPanel ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
        </button>
      </div>
    </div>
  );
};
