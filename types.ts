
export enum Gender {
  Male = 'Male',
  Female = 'Female',
  Unspecified = 'Unspecified'
}

export interface Official {
  id: string;
  name: string;
  rut: string; // Nuevo
  email: string;
  gender: Gender;
  title: string;
  department: string;
  stament?: string;
  position: string;

  // Datos Personales (Nuevos)
  birthDate?: string;
  phone?: string;
  address?: string;

  // Datos Institucionales (Nuevos)
  entryDate?: string;
  contractEndDate?: string;

  // Contacto de Emergencia (Nuevos)
  emergencyContactName?: string;
  emergencyContactPhone?: string;

  isBoss?: boolean;
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
  body: string;
}

export interface SavedTemplate extends EmailTemplate {
  id: string;
  name: string;
  createdAt: number;
}

export interface SavedCc {
  id: string;
  email: string;
  label: string;
}

export type ViewState = 'dashboard' | 'database' | 'absenteeism' | 'calendar' | 'compensatory-hours' | 'template' | 'generate' | 'settings';

export enum AbsenceType {
  FeriadoLegal = 'Feriado Legal',
  PermisoAdministrativo = 'Permiso Administrativo',
  FeriadoLega = 'Feriado Lega'
}

export interface AbsenceRecord {
  id: string;
  officialId: string;
  type: AbsenceType;
  startDate: string;
  endDate: string;
  days: number;
  description?: string;
}

export interface CompensatoryHourRecord {
  id: string;
  officialId: string;
  date: string;
  hours: number;
  type: 'Requirement' | 'Compensation'; // Requirement = worked extra, Compensation = took hours off
  isHolidayOrWeekend: boolean;
  rate: number; // 1.25 or 1.5
  totalCalculated: number; // hours * rate
  description?: string;
}

export interface ToastNotification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export type SortOption = 'name' | 'surname' | 'department' | 'rut' | 'entryDate';

export interface FilterCriteria {
  type: 'none' | 'missingBoss' | 'missingGender' | 'invalidEmail' | 'department' | 'expiringSoon';
  value?: string;
}
