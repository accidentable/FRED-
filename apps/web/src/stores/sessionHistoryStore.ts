import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ChatMessage, MessageRole } from '@fred/shared';

// ─── Types ────────────────────────────────────────────────────────────

export interface SessionEntry {
  id: string;           // UUID (== backend sessionId)
  title: string;        // First user message, truncated
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

interface SessionHistoryState {
  sessions: SessionEntry[];
  saveSession: (sessionId: string, messages: ChatMessage[]) => void;
  removeSession: (id: string) => void;
  clear: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────

function getTitle(messages: ChatMessage[]): string {
  const first = messages.find((m) => m.role === MessageRole.USER);
  return (first?.content ?? '').slice(0, 40) || 'Empty session';
}

// ─── Store ────────────────────────────────────────────────────────────

export const useSessionHistoryStore = create<SessionHistoryState>()(
  persist(
    (set) => ({
      sessions: [],

      saveSession: (sessionId, messages) => {
        if (!sessionId) return;
        const hasUserMsg = messages.some((m) => m.role === MessageRole.USER);
        if (!hasUserMsg) return;

        const now = new Date().toISOString();
        const title = getTitle(messages);

        set((state) => {
          const existing = state.sessions.find((s) => s.id === sessionId);
          if (existing) {
            return {
              sessions: state.sessions.map((s) =>
                s.id === sessionId ? { ...s, messages, title, updatedAt: now } : s
              ),
            };
          }
          const entry: SessionEntry = { id: sessionId, title, messages, createdAt: now, updatedAt: now };
          // Prepend, keep max 20 sessions
          return { sessions: [entry, ...state.sessions].slice(0, 20) };
        });
      },

      removeSession: (id) =>
        set((state) => ({ sessions: state.sessions.filter((s) => s.id !== id) })),

      clear: () => set({ sessions: [] }),
    }),
    { name: 'fred-os-session-history' }
  )
);
