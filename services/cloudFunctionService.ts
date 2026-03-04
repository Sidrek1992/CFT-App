import { auth } from './firebaseService';

const RAW_FUNCTIONS_BASE =
  import.meta.env.VITE_FUNCTIONS_BASE_URL ||
  import.meta.env.VITE_TRACKING_BASE_URL ||
  (import.meta.env.VITE_FIREBASE_PROJECT_ID
    ? `https://us-central1-${import.meta.env.VITE_FIREBASE_PROJECT_ID}.cloudfunctions.net`
    : '') ||
  '';

const FUNCTIONS_BASE = RAW_FUNCTIONS_BASE.replace(/\/$/, '');

function requireFunctionsBase(): string {
  if (!FUNCTIONS_BASE) {
    throw new Error(
      'No hay URL base de Cloud Functions configurada. Define VITE_FUNCTIONS_BASE_URL o VITE_TRACKING_BASE_URL.'
    );
  }
  return FUNCTIONS_BASE;
}

function buildUrl(path: string): string {
  const base = requireFunctionsBase();
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${base}/${cleanPath}`;
}

async function buildAuthHeaders(): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Sesion no autenticada para llamar Cloud Functions.');
  }
  const token = await user.getIdToken();
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

async function parseJsonResponse(response: Response): Promise<any> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
}

export async function callProtectedFunction<T>(path: string, payload: unknown): Promise<T> {
  const headers = await buildAuthHeaders();
  const response = await fetch(buildUrl(path), {
    method: 'POST',
    headers,
    body: JSON.stringify(payload ?? {}),
  });

  const parsed = await parseJsonResponse(response);
  if (!response.ok) {
    const msg = parsed?.error || `Error ${response.status} al llamar ${path}`;
    throw new Error(msg);
  }

  return parsed as T;
}
