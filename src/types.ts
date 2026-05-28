/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface GroundingSource {
  title: string;
  url: string;
}

export interface Attachment {
  name: string;
  mimeType: string;
  data: string; // Base64 encoded file string
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  thought?: string;
  thinkingTime?: number; // In seconds
  isThinking?: boolean;
  groundingSources?: GroundingSource[];
  timestamp: number;
  attachment?: Attachment;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  deepThinkEnabled: boolean;
  webSearchEnabled: boolean;
  temperature: number;
  createdAt: number;
}
