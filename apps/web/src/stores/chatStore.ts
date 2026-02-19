import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ChatMessage, MessageRole, ContentType } from '@fred/shared';
import { ASCII_HEADER, WELCOME_MESSAGE } from '@fred/shared';

// ─── Types ───────────────────────────────────────────────────────────

export interface DraggedChip {
  id: string;            // series ID or ticker
  type: 'indicator' | 'stock';
  label: string;         // display name
}

interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  sessionId: string | null;
  logs: string[];
  dataObjects: Array<{ id: string; title: string; description: string }>;
  chips: DraggedChip[];

  addMessage: (message: ChatMessage) => void;
  setMessages: (messages: ChatMessage[]) => void;
  removeMessage: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setSessionId: (id: string) => void;
  setLogs: (logs: string[]) => void;
  appendLog: (log: string) => void;
  setDataObjects: (objects: Array<{ id: string; title: string; description: string }>) => void;
  addChip: (chip: DraggedChip) => void;
  removeChip: (id: string) => void;
  clearChips: () => void;
  reset: () => void;
  restoreSession: (messages: ChatMessage[], sessionId: string) => void;
}

// ─── Initial Message ─────────────────────────────────────────────────

const generateId = () => Math.random().toString(36).substring(2, 9);

const initialMessage: ChatMessage = {
  id: generateId(),
  role: MessageRole.SYSTEM,
  type: ContentType.TEXT,
  content: `${ASCII_HEADER}\n${WELCOME_MESSAGE}`,
  timestamp: new Date().toISOString(),
};

// ─── Store (persisted to localStorage) ──────────────────────────────

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      messages: [initialMessage],
      isLoading: false,
      sessionId: null,
      logs: [],
      dataObjects: [],
      chips: [],

      addMessage: (message) =>
        set((state) => ({ messages: [...state.messages, message] })),

      setMessages: (messages) => set({ messages }),

      removeMessage: (id) =>
        set((state) => ({
          messages: state.messages.filter((m) => m.id !== id),
        })),

      setLoading: (isLoading) => set({ isLoading }),

      setSessionId: (sessionId) => set({ sessionId }),

      setLogs: (logs) => set({ logs }),

      appendLog: (log) =>
        set((state) => ({ logs: [...state.logs, log] })),

      setDataObjects: (dataObjects) => set({ dataObjects }),

      addChip: (chip) =>
        set((state) => {
          // Prevent duplicates
          if (state.chips.find((c) => c.id === chip.id)) return state;
          return { chips: [...state.chips, chip] };
        }),

      removeChip: (id) =>
        set((state) => ({
          chips: state.chips.filter((c) => c.id !== id),
        })),

      clearChips: () => set({ chips: [] }),

      reset: () =>
        set({
          messages: [initialMessage],
          isLoading: false,
          sessionId: null,
          logs: [],
          dataObjects: [],
          chips: [],
        }),

      restoreSession: (messages, sessionId) =>
        set({ messages, sessionId, isLoading: false, chips: [], logs: [], dataObjects: [] }),
    }),
    {
      name: 'fred-os-chat',
      partialize: (state) => ({
        messages: state.messages,
        sessionId: state.sessionId,
        logs: state.logs.slice(-50), // Keep last 50 logs
      }),
    }
  )
);
