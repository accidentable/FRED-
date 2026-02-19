import React, { useRef, useEffect } from 'react';
import { ChatMessage } from '@fred/shared';
import { TerminalMessage } from './TerminalMessage';

interface MessageListProps {
  messages: ChatMessage[];
  isLoading?: boolean;
}

export const MessageList: React.FC<MessageListProps> = ({ messages, isLoading }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  return (
    <div className="flex-1 overflow-y-auto p-4 scroll-smooth pb-20">
      {messages.map((msg) => (
        <TerminalMessage key={msg.id} message={msg} />
      ))}

      {/* Loading indicator — shown while streaming */}
      {isLoading && (
        <div className="flex items-center gap-3 mb-7 text-sm">
          <div className="flex items-center justify-center w-6 h-6 rounded-sm border border-terminal-orange text-terminal-orange bg-terminal-orange/10">
            <span className="text-[10px] font-mono">AI</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="w-1.5 h-1.5 rounded-full bg-terminal-orange animate-bounce"
              style={{ animationDelay: '0ms' }}
            />
            <span
              className="w-1.5 h-1.5 rounded-full bg-terminal-orange animate-bounce"
              style={{ animationDelay: '150ms' }}
            />
            <span
              className="w-1.5 h-1.5 rounded-full bg-terminal-orange animate-bounce"
              style={{ animationDelay: '300ms' }}
            />
          </div>
          <span className="text-terminal-dim text-xs font-mono">분석 중...</span>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
};
