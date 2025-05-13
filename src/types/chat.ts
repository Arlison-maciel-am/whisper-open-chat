
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  attachments?: Attachment[];
}

export interface Attachment {
  id: string;
  name: string;
  url?: string;
  type: string;
  size: number;
  content?: string;
  file?: File;
}

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  model: string;
  createdAt: number;
  updatedAt: number;
}

export interface Model {
  id: string;
  name: string;
  maxTokens: number;
}

export interface OpenRouterSettings {
  apiKey: string;
  models: Model[];
}
