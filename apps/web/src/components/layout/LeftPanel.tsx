import React from 'react';
import { Database, Terminal, Clock, X } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { useChatStore } from '@/stores/chatStore';
import { useSessionHistoryStore, SessionEntry } from '@/stores/sessionHistoryStore';
import { PortfolioSection } from '@/components/portfolio/PortfolioSection';
import { MessageRole } from '@fred/shared';

// ─── Time formatter ──────────────────────────────────────────────────

function formatSessionTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
  if (diffDays === 0)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  if (diffDays === 1) return '어제';
  if (diffDays < 7) return `${diffDays}일 전`;
  return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

// ─── LeftPanel ───────────────────────────────────────────────────────

export const LeftPanel: React.FC = () => {
  const { t } = useTranslation();
  const { sessionId, messages, isLoading, restoreSession } = useChatStore();
  const { sessions, saveSession, removeSession } = useSessionHistoryStore();

  const pastSessions = sessions.filter((s) => s.id !== sessionId);

  const handleRestoreSession = (entry: SessionEntry) => {
    if (isLoading) return;
    if (sessionId && sessionId !== entry.id && messages.some((m) => m.role === MessageRole.USER)) {
      saveSession(sessionId, messages);
    }
    restoreSession(entry.messages, entry.id);
  };

  const handleRemoveSession = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    removeSession(id);
  };

  return (
    <div className="hidden md:flex flex-col w-64 bg-terminal-bg border-r border-terminal-gray h-full">

      {/* Header */}
      <div className="h-14 border-b border-terminal-gray flex items-center px-4 bg-terminal-bg/50 flex-shrink-0">
        <span className="text-terminal-green font-bold tracking-widest text-xs flex items-center gap-2">
          <Database size={14} />
          {t('left_panel.header')}
        </span>
      </div>

      {/* ── Middle: Sessions (1/3) + Portfolio (2/3) — each independently scrollable ── */}
      <div className="flex flex-col flex-1 overflow-hidden">

        {/* Sessions — 1/3 */}
        <div
          className="flex flex-col border-b border-terminal-gray overflow-hidden"
          style={{ flex: '1 1 0' }}
        >
          <div className="px-3 pt-2.5 pb-1 text-[10px] text-terminal-dim uppercase tracking-wider flex-shrink-0">
            {t('left_panel.recent_sessions')}
          </div>

          {/* Scrollable list */}
          <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-2 space-y-1 min-h-0">
            {/* Active session */}
            {sessionId && (
              <div className="flex items-center gap-2 px-2 py-1.5 bg-terminal-gray/30 border border-terminal-green/30 rounded-sm">
                <Terminal size={11} className="text-terminal-green flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-terminal-green font-bold truncate font-mono">
                    {sessionId}
                  </div>
                  <div className="text-[9px] text-terminal-dim">ACTIVE</div>
                </div>
                <div className="w-1.5 h-1.5 rounded-full bg-terminal-green animate-pulse flex-shrink-0" />
              </div>
            )}

            {/* Past sessions */}
            {pastSessions.map((entry) => (
              <div
                key={entry.id}
                onClick={() => handleRestoreSession(entry)}
                className="group flex items-start gap-1.5 px-2 py-1.5 rounded-sm border border-transparent
                           hover:bg-terminal-gray/20 hover:border-terminal-gray/40
                           cursor-pointer transition-colors"
              >
                <Clock size={10} className="text-terminal-dim/60 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-terminal-light/80 truncate leading-tight">
                    {entry.title}
                  </div>
                  <div className="text-[9px] text-terminal-dim/60 font-mono">
                    {formatSessionTime(entry.updatedAt)}
                  </div>
                </div>
                <button
                  onClick={(e) => handleRemoveSession(e, entry.id)}
                  className="flex-shrink-0 opacity-0 group-hover:opacity-100 text-terminal-dim
                             hover:text-red-400 transition-all mt-0.5"
                  title="삭제"
                >
                  <X size={9} />
                </button>
              </div>
            ))}

            {/* Empty state */}
            {!sessionId && pastSessions.length === 0 && (
              <div className="px-2 py-2 text-[10px] text-terminal-dim/40 italic">
                No active session
              </div>
            )}
          </div>
        </div>

        {/* Portfolio — 2/3 */}
        <div
          className="flex flex-col overflow-hidden"
          style={{ flex: '2 1 0' }}
        >
          <PortfolioSection />
        </div>

      </div>

      {/* Footer */}
      <div className="p-4 border-t border-terminal-gray flex-shrink-0 text-[10px] text-terminal-dim font-mono text-center">
        {t('app.version')}
      </div>
    </div>
  );
};
