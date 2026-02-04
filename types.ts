
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

export interface OfficialDatabase {
  id: string;
  name: string;
  officials: Official[];
  createdAt: number;
}

export interface EmailTemplate {
  subject: string;
  body: string; // Contains variables like {nombre}, {cargo}
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

export type ViewState = 'dashboard' | 'database' | 'template' | 'generate';

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
