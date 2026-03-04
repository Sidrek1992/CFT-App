
export enum Gender {
  Male = 'Male',
  Female = 'Female',
  Unspecified = 'Unspecified'
}

export interface Official {
  id: string;
  // ── Nombre desglosado ──────────────────────────────────────────────────────
  name: string;               // Nombre completo (retrocompatibilidad y display)
  primerNombre?: string;
  segundoNombre?: string;
  tercerNombre?: string;
  primerApellido?: string;
  segundoApellido?: string;
  // ── Datos de contacto ─────────────────────────────────────────────────────
  email: string;
  telefono?: string;
  // ── Datos personales ──────────────────────────────────────────────────────
  gender: Gender;
  title: string;              // e.g., "Sr.", "Sra.", "Dr."
  estadoCivil?: string;       // Soltero, Casado, Viudo, Divorciado, Conviviente
  hijos?: number;             // Número de hijos
  // ── Datos laborales ───────────────────────────────────────────────────────
  department: string;
  stament?: string;           // Estamento (Profesional, Técnico, etc.)
  position: string;
  tipoContrato?: string;      // Planta, Contrata, Honorarios, etc.
  profesion?: string;         // Título profesional
  postGrado?: string;         // Postgrado / Magíster / Doctorado
  isBoss?: boolean;
  bossName: string;
  bossPosition: string;
  bossEmail: string;
  profileImage?: string;
  // ── Fechas ────────────────────────────────────────────────────────────────
  fechaIngreso?: string;       // ISO date
  fechaTermino?: string;       // ISO date
  fechaCumpleanios?: string;   // ISO date
  // ── Otros ────────────────────────────────────────────────────────────────
  contactoEmergencia?: string;
  direccion?: string;
  tieneVehiculo?: boolean;
}

/** Construye el nombre completo a partir de los campos desglosados (si existen). */
export function buildFullName(o: Pick<Official, 'name' | 'primerNombre' | 'segundoNombre' | 'tercerNombre' | 'primerApellido' | 'segundoApellido'>): string {
  if (o.primerNombre || o.primerApellido) {
    return [o.primerNombre, o.segundoNombre, o.tercerNombre, o.primerApellido, o.segundoApellido]
      .filter(Boolean).join(' ').trim();
  }
  return o.name ?? '';
}

export interface EmailLog {
  id: string;
  campaignId: string;
  officialId: string;
  recipientEmail: string;
  sentAt: number;
  status: 'sent' | 'failed';
  method: 'mailto' | 'eml' | 'gmail_api';
  // Read receipt fields (populated by Cloud Function trackEmailOpen)
  openedAt?: number;      // unix ms of first open
  openCount?: number;     // total open count
  lastOpenedAt?: number;  // unix ms of most recent open
  databaseId?: string;    // which DB this log belongs to (for tracking pixel)
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

export type TemplateCategory = 'Notificaciones' | 'Evaluaciones' | 'Recordatorios' | 'Convocatorias' | 'General';

export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  'Notificaciones',
  'Evaluaciones',
  'Recordatorios',
  'Convocatorias',
  'General',
];

export interface SavedTemplate extends EmailTemplate {
  id: string;
  name: string;
  createdAt: number;
  category?: TemplateCategory;
  archived?: boolean;
}

export interface GeneratedEmail {
  id: string;
  officialId: string;
  recipient: string;
  subject: string;
  body: string;
  attachments: File[];
}

export type ViewState = 'dashboard' | 'database' | 'orgChart' | 'template' | 'generate' | 'inbox' | 'roles' | 'docAnalysis' | 'parking';

// ─── Parking Rotation ─────────────────────────────────────────────────────────

export interface ParkingWeek {
  weekKey: string;       // formato ISO: '2026-W10'
  assignedOfficialIds: string[]; // IDs de funcionarios que les toca ese slot
  spots: number;         // cantidad de estacionamientos disponibles
  lockedManually?: boolean;
}

export interface ParkingConfig {
  spots: number;                 // # de estacionamientos disponibles (default 13)
  rotationHistory: ParkingWeek[];
  lastRotatedWeekKey?: string;
  excludedOfficialIds?: string[]; // funcionarios excluidos de la rotación
  ccEmails?: string[];            // correos extra que reciben la notificación
  createdAt: number;
  updatedAt: number;
}

// ─── User Roles ────────────────────────────────────────────────────────────────
/**
 * Role hierarchy (highest to lowest):
 *   superadmin → Can do everything + manage roles/users
 *   admin      → Full CRUD on DB, templates, campaigns
 *   operator   → Can generate and send emails, cannot edit DB directly
 *   reader     → Read-only: can see dashboard, DB list, sent history
 */
export type UserRole = 'superadmin' | 'admin' | 'operator' | 'reader';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  createdAt: number;
  updatedAt: number;
  createdBy?: string; // uid of the admin who assigned the role
}

export const ROLE_LABELS: Record<UserRole, string> = {
  superadmin: 'Superadmin',
  admin: 'Administrador',
  operator: 'Operador',
  reader: 'Lector',
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  superadmin: 'Acceso total. Gestiona roles y todos los módulos.',
  admin: 'CRUD completo en base de datos, plantillas y campañas.',
  operator: 'Puede generar y enviar correos. No puede editar la BD.',
  reader: 'Solo lectura: dashboards, listas y registros de envío.',
};

export const ROLE_COLORS: Record<UserRole, string> = {
  superadmin: 'bg-red-500/20 text-red-400 border-red-500/30',
  admin: 'bg-primary-500/20 text-primary-400 border-primary-500/30',
  operator: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  reader: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

export interface ToastNotification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export type SortOption = 'name' | 'surname' | 'department';

export interface FilterCriteria {
  type: 'none' | 'missingBoss' | 'missingGender' | 'invalidEmail' | 'department' | 'search';
  value?: string;
}

// ─── PDF Analysis ─────────────────────────────────────────────────────────────

export interface PdfIssue {
  severity: 'error' | 'warning' | 'info';
  description: string;
}

export interface PdfAnalysisResult {
  fileName: string;
  summary: string;
  issues: PdfIssue[];
  horasDetected: boolean;
  totalHorasFalta: number | null;
  isLegible: boolean;
}
