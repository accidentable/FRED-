import React from 'react';
import ReactMarkdown from 'react-markdown';
import { ChatMessage, ContentType, MessageRole } from '@fred/shared';
import { ChartWidget } from '@/components/charts/ChartWidget';
import { Terminal, User, AlertCircle } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

interface TerminalMessageProps {
  message: ChatMessage;
}

export const TerminalMessage: React.FC<TerminalMessageProps> = ({ message }) => {
  const { t } = useTranslation();
  const isUser = message.role === MessageRole.USER;
  const isSystem = message.role === MessageRole.SYSTEM;
  const isAssistant = message.role === MessageRole.ASSISTANT;
  const isError = message.type === ContentType.ERROR;

  const timestamp = typeof message.timestamp === 'string'
    ? new Date(message.timestamp)
    : message.timestamp;

  // System (welcome) message — rendered separately, no header row
  if (isSystem && message.type === ContentType.TEXT) {
    return (
      <div className="mb-7 text-sm text-left">
        <pre className="font-mono text-terminal-orange text-[10px] leading-tight whitespace-pre select-none mb-3">
          {(message.content ?? '').split('\n').slice(0, 9).join('\n')}
        </pre>
        <div className="prose prose-sm max-w-none text-terminal-secondary">
          <ReactMarkdown>{(message.content ?? '').split('\n').slice(9).join('\n')}</ReactMarkdown>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-1.5 mb-6 text-sm group ${isUser ? 'items-end' : 'items-start'}`}>

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className={`flex items-center gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        <div className={`
          flex items-center justify-center w-6 h-6 rounded-sm border
          ${isUser ? 'border-terminal-green text-terminal-green bg-terminal-green/10' : ''}
          ${isAssistant && !isError ? 'border-terminal-orange text-terminal-orange bg-terminal-orange/10' : ''}
          ${isError ? 'border-terminal-red text-terminal-red' : ''}
        `}>
          {isUser && <User size={14} />}
          {isAssistant && <Terminal size={14} />}
        </div>

        <span className="font-mono text-xs text-terminal-muted uppercase tracking-wider">
          {isUser ? 'YOU' : 'FRED-OS'}
          <span className="mx-1">::</span>
          {timestamp.toLocaleTimeString([], { hour12: false })}
        </span>
      </div>

      {/* ── Content ──────────────────────────────────────────────── */}
      <div className={`max-w-[90%] md:max-w-[82%] ${isUser ? 'text-right' : 'text-left'}`}>

        {/* User: clean sans-serif text */}
        {isUser && message.type === ContentType.TEXT && (
          <p className="font-sans text-terminal-primary leading-relaxed tracking-tight">
            {message.content}
          </p>
        )}

        {/* Assistant: clean markdown prose, NO wrapping container */}
        {isAssistant && message.type === ContentType.TEXT && (
          <div className="prose prose-sm max-w-none text-terminal-light leading-relaxed">
            <ReactMarkdown>{message.content || ''}</ReactMarkdown>
          </div>
        )}

        {/* Loading */}
        {message.type === ContentType.LOADING && (
          <div className="flex items-center gap-2 text-terminal-orange font-mono">
            <span className="animate-pulse">{t('chat.processing')}</span>
            <span className="animate-spin">/</span>
          </div>
        )}

        {/* Chart */}
        {message.type === ContentType.CHART && message.data && (
          <div className="w-full min-w-[300px] md:min-w-[500px]">
            {message.content && (
              <div className="prose prose-sm max-w-none mb-3 text-terminal-light">
                <ReactMarkdown>{message.content}</ReactMarkdown>
              </div>
            )}
            <ChartWidget data={message.data} />
            <div className="flex justify-between text-xs text-terminal-muted mt-2 font-mono">
              <span>[ID: {message.data.id}]</span>
              <span>[{t('chart.last_updated').toUpperCase()}: {message.data.lastUpdated}]</span>
            </div>
          </div>
        )}

        {/* Error */}
        {message.type === ContentType.ERROR && (
          <div className="border border-terminal-red text-terminal-red p-3 bg-terminal-red/5 flex items-start gap-2 font-mono text-xs">
            <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
            <span>{message.content}</span>
          </div>
        )}
      </div>
    </div>
  );
};
