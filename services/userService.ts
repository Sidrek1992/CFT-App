import type { OfficialDatabase, SavedTemplate, EmailTemplate } from '../types';

const API_BASE = '/api/user';
const REQUEST_TIMEOUT_MS = 15000;

type ApiErrorCode = 'not_authenticated' | 'not_found' | 'validation_failed' | 'rate_limit' | 'server_error' | 'network_error';

export class ApiError extends Error {
  code: ApiErrorCode;
  status: number;
  requestId?: string;

  constructor(message: string, code: ApiErrorCode, status = 0, requestId?: string) {
    super(message);
    this.code = code;
    this.status = status;
    this.requestId = requestId;
  }
}

const safeJson = async (response: Response) => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

const mapApiError = (status: number, payload: any) => {
  const requestId = typeof payload?.requestId === 'string' ? payload.requestId : undefined;
  const message = typeof payload?.message === 'string' ? payload.message : (typeof payload?.error === 'string' ? payload.error : 'request_failed');

  if (status === 401) return new ApiError(message, 'not_authenticated', status, requestId);
  if (status === 404) return new ApiError(message, 'not_found', status, requestId);
  if (status === 400) return new ApiError(message, 'validation_failed', status, requestId);
  if (status === 429) return new ApiError(message, 'rate_limit', status, requestId);
  return new ApiError(message, 'server_error', status, requestId);
};

const request = async (path: string, init: RequestInit = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(path, {
      credentials: 'include',
      ...init,
      signal: controller.signal,
    });

    const payload = await safeJson(response);
    if (!response.ok) {
      throw mapApiError(response.status, payload);
    }

    return payload;
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      throw new ApiError('request_timeout', 'network_error');
    }
    if (error instanceof ApiError) throw error;
    throw new ApiError('network_error', 'network_error');
  } finally {
    clearTimeout(timeoutId);
  }
};

// Databases
export const fetchDatabases = async (): Promise<OfficialDatabase[]> => {
  return request(`${API_BASE}/databases`);
};

export const createDatabase = async (id: string, name: string) => {
  return request(`${API_BASE}/databases`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, name }),
  });
};

export const updateDatabase = async (id: string, name: string) => {
  return request(`${API_BASE}/databases/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
};

export const deleteDatabase = async (id: string) => {
  return request(`${API_BASE}/databases/${id}`, {
    method: 'DELETE',
  });
};

// Officials
export const fetchOfficials = async (databaseId: string) => {
  return request(`${API_BASE}/databases/${databaseId}/officials`);
};

export const createOfficial = async (databaseId: string, official: any) => {
  return request(`${API_BASE}/databases/${databaseId}/officials`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(official),
  });
};

export const updateOfficial = async (official: any) => {
  return request(`${API_BASE}/officials/${official.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(official),
  });
};

export const deleteOfficial = async (id: string) => {
  return request(`${API_BASE}/officials/${id}`, {
    method: 'DELETE',
  });
};

// Templates
export const fetchTemplates = async (): Promise<SavedTemplate[]> => {
  return request(`${API_BASE}/templates`);
};

export const createTemplate = async (template: SavedTemplate) => {
  return request(`${API_BASE}/templates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(template),
  });
};

export const deleteTemplate = async (id: string) => {
  return request(`${API_BASE}/templates/${id}`, {
    method: 'DELETE',
  });
};

// Current Template
export const fetchCurrentTemplate = async (): Promise<EmailTemplate> => {
  return request(`${API_BASE}/current-template`);
};

export const saveCurrentTemplate = async (subject: string, body: string) => {
  return request(`${API_BASE}/current-template`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subject, body }),
  });
};

// Sent History
export const fetchSentHistory = async (): Promise<string[]> => {
  return request(`${API_BASE}/sent-history`);
};

// Settings
export const fetchSettings = async () => {
  return request(`${API_BASE}/settings`);
};

export const saveSettings = async (activeDbId: string) => {
  return request(`${API_BASE}/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ activeDbId }),
  });
};
