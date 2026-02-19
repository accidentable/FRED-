import { useCallback, useRef } from 'react';
import { useChatStore } from '@/stores/chatStore';
import { useUIStore } from '@/stores/uiStore';
import { usePortfolioStore } from '@/stores/portfolioStore';
import { api, SSEEvent } from '@/services/api';
import { MessageRole, ContentType, ChatMessage } from '@fred/shared';
import { useTranslation } from '@/hooks/useTranslation';

const generateId = () => Math.random().toString(36).substring(2, 9);

export function useChat() {
  const {
    messages,
    isLoading,
    sessionId,
    logs,
    dataObjects,
    chips,
    addMessage,
    removeMessage,
    setLoading,
    setSessionId,
    setLogs,
    appendLog,
    setDataObjects,
    clearChips,
  } = useChatStore();

  const abortControllerRef = useRef<AbortController | null>(null);

  const { locale } = useTranslation();

  const stopMessage = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    if ((!text.trim() && chips.length === 0) || isLoading) return;

    // Build context from chips
    const chipContext = chips.map((c) =>
      c.type === 'indicator' ? `[FRED:${c.id}]` : `[STOCK:${c.id}]`
    ).join(' ');

    const fullMessage = chipContext
      ? `${chipContext} ${text}`.trim()
      : text;

    // Display message with chip mentions
    const displayContent = chips.length > 0
      ? `${chips.map((c) => `\`${c.id}\``).join(' ')} ${text}`.trim()
      : text;

    const userMsg: ChatMessage = {
      id: generateId(),
      role: MessageRole.USER,
      type: ContentType.TEXT,
      content: displayContent,
      timestamp: new Date().toISOString(),
    };
    addMessage(userMsg);
    setLoading(true);
    clearChips();

    // Set up abort controller for this request
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Create a streaming assistant message
    const assistantMsgId = generateId();
    addMessage({
      id: assistantMsgId,
      role: MessageRole.ASSISTANT,
      type: ContentType.TEXT,
      content: '',
      timestamp: new Date().toISOString(),
    });

    try {
      // Use streaming endpoint (portfolio injected as AI context, not displayed)
      const portfolio = usePortfolioStore.getState().holdings;
      await api.sendMessageStream(
        fullMessage,
        sessionId ?? undefined,
        locale,
        (event: SSEEvent) => {
          switch (event.type) {
            case 'token':
              // Update the assistant message content, stripping JSON planning blocks
              // that Claude may output before tool calls (e.g. ```json {...}```)
              useChatStore.setState((state) => ({
                messages: state.messages.map((m) => {
                  if (m.id !== assistantMsgId) return m;
                  const raw = (m.content || '') + (event.content || '');
                  // Remove complete ```json...``` blocks; partial blocks stay until closed
                  const clean = raw.replace(/```json[\s\S]*?```/g, '').trim();
                  return { ...m, content: clean };
                }),
              }));
              break;

            case 'tool_call':
              appendLog(`⚡ ${event.tool}(${JSON.stringify(event.input)})`);
              break;

            case 'tool_result':
              appendLog(`✅ ${event.tool} → ${(event.result || '').substring(0, 100)}...`);
              break;

            case 'done':
              if (event.sessionId && !sessionId) {
                setSessionId(event.sessionId);
              }
              if (event.logs?.length) {
                setLogs(event.logs);
              }
              break;

            case 'fred_search_results':
              if (event.indicators && event.indicators.length > 0) {
                // sort: sector first, then macro, then risk — keeps backend's 1+3+1 order
                const sorted = [...event.indicators].sort((a, b) => {
                  const order = { sector: 0, macro: 1, risk: 2 };
                  return (order[a.category as keyof typeof order] ?? 1) - (order[b.category as keyof typeof order] ?? 1);
                });
                const ids = sorted.map((ind) => ind.id);
                useUIStore.getState().setWatchedIndicators(ids.slice(0, 5));
              }
              break;

            case 'error':
              // Replace streaming message with error
              useChatStore.setState((state) => ({
                messages: state.messages.map((m) =>
                  m.id === assistantMsgId
                    ? {
                        ...m,
                        type: ContentType.ERROR,
                        content: `[ERR] ${event.message || 'CONNECTION_INTERRUPTED'}`,
                      }
                    : m
                ),
              }));
              break;
          }
        },
        portfolio,
        controller.signal,
      );
    } catch (error) {
      // AbortError = user clicked stop — remove the partial message, no error shown
      if (error instanceof Error && error.name === 'AbortError') {
        useChatStore.setState((state) => ({
          messages: state.messages.filter((m) => m.id !== assistantMsgId),
        }));
        return;
      }
      console.error('Stream error:', error);
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      useChatStore.setState((state) => ({
        messages: state.messages.map((m) =>
          m.id === assistantMsgId
            ? { ...m, type: ContentType.ERROR, content: `[ERR] CONNECTION_INTERRUPTED\n${errMsg}` }
            : m
        ),
      }));
    } finally {
      setLoading(false);
    }
  }, [
    isLoading, sessionId, locale, chips,
    addMessage, removeMessage, setLoading, setSessionId,
    setLogs, appendLog, setDataObjects, clearChips,
  ]);

  return {
    messages,
    isLoading,
    logs,
    dataObjects,
    chips,
    sendMessage,
    stopMessage,
  };
}
