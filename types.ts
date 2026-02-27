
export enum Gender {
  Male = 'Male',
  Female = 'Female',
  Unspecified = 'Unspecified'
}

export interface Official {
  id: string;
  name: string;
  email: string;
  gender: Gender;
  title: string; // e.g., "Sr.", "Sra.", "Dr."
  department: string; // New field
  stament?: string; // New field: Estamento (Profesional, Técnico, etc.)
  position: string;
  isBoss?: boolean; // New field: Is this person a boss available for others?
  bossName: string;
  bossPosition: string;
  bossEmail: string;
}

export interface EmailLog {
  id: string;
  campaignId: string;
  officialId: string;
  recipientEmail: string;
  sentAt: number;
  status: 'sent' | 'failed';
  method: 'mailto' | 'eml' | 'gmail_api';
}

export interface Campaign {
  id: string;
  name: string;
  subject: string;
  createdAt: number;
  status: 'draft' | 'active' | 'completed';
  logs: EmailLog[];
}

export interface OfficialDatabase {
  id: string;
  name: string;
  officials: Official[];
  campaigns?: Campaign[]; // New field for campaigns
  createdAt: number;
}

export interface EmailTemplate {
  subject: string;
  body: string; // Contains HTML string
}

export interface SavedTemplate extends EmailTemplate {
  id: string;
  name: string;
  createdAt: number;
}

export interface GeneratedEmail {
  id: string;
  officialId: string;
  recipient: string;
  subject: string;
  body: string;
  attachments: File[];
}

export type ViewState = 'dashboard' | 'database' | 'orgChart' | 'template' | 'generate' | 'inbox';

export interface ToastNotification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export type SortOption = 'name' | 'surname' | 'department';

export interface FilterCriteria {
  type: 'none' | 'missingBoss' | 'missingGender' | 'invalidEmail' | 'department';
  value?: string;
}
