export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system'
}

export enum ContentType {
  TEXT = 'text',
  CHART = 'chart',
  LOADING = 'loading',
  ERROR = 'error'
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  type: ContentType;
  content?: string;
  data?: FredSeriesData;
  timestamp: Date | string;
}

export interface ChatRequest {
  message: string;
  sessionId?: string;
}

export interface ChatResponse {
  message: ChatMessage;
  functionCall?: {
    name: string;
    args: Record<string, unknown>;
  };
}

// Import from fred.ts to avoid circular dependency
import type { FredSeriesData } from './fred';
