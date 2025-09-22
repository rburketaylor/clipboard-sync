export type ClipType = 'text' | 'url';
export type ClipSource = 'selection' | 'tab' | 'clipboard' | 'electron';

export interface ClipPayload {
  type: ClipType;
  content: string;
  title?: string | null;
  mimeType?: string;
  source?: ClipSource;
  createdAt?: string;
}

export interface ClipboardReadResult {
  text: string;
  mimeType: string;
}

export const DEFAULT_MIME_TYPE = 'text/plain';
