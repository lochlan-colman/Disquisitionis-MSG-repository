export interface ParsedAttachment {
  fileName: string;
  content: Uint8Array; // Raw data
  size: number;
  mimeType?: string;
}

export interface ParsedEmail {
  id: string; // Unique ID for UI keys
  fileName: string;
  subject: string;
  senderName: string;
  senderEmail: string;
  senderPhone?: string; // Extracted or inferred
  recipients: { name: string; email: string }[];
  body: string;
  sentDate: string | Date;
  attachments: ParsedAttachment[];
  hasError?: boolean;
  errorMessage?: string;
}

export enum ViewMode {
  LIST = 'LIST',
  DETAIL = 'DETAIL'
}