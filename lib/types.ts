export type Role = 'user' | 'assistant' | 'system';

export interface Attachment {
  id: string;
  name: string;
  size: number;
  text: string;
  loading?: boolean;
  error?: string;
}

export interface FileMeta {
  name: string;
  size: number;
}

export interface Msg {
  id: string;
  role: Role;
  content: string;
  files?: FileMeta[];
  model?: string;
  ts: number;
}

export interface Conversation {
  id: string;
  title: string;
  msgs: Msg[];
  ts: number;
}

export interface Settings {
  url: string;
  key: string;
  model: string;
  temperature: number;
  systemPrompt: string;
}

export interface ModelInfo {
  id: string;
  owned_by?: string;
  created?: number;
}
