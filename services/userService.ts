import type { OfficialDatabase, SavedTemplate, EmailTemplate } from '../types';

const API_BASE = '/api/user';

const safeJson = async (response: Response) => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

// Databases
export const fetchDatabases = async (): Promise<OfficialDatabase[]> => {
  const response = await fetch(`${API_BASE}/databases`, { credentials: 'include' });
  if (!response.ok) throw new Error('fetch_failed');
  return response.json();
};

export const createDatabase = async (id: string, name: string) => {
  const response = await fetch(`${API_BASE}/databases`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ id, name }),
  });
  if (!response.ok) throw new Error('create_failed');
  return response.json();
};

export const updateDatabase = async (id: string, name: string) => {
  const response = await fetch(`${API_BASE}/databases/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ name }),
  });
  if (!response.ok) throw new Error('update_failed');
  return response.json();
};

export const deleteDatabase = async (id: string) => {
  const response = await fetch(`${API_BASE}/databases/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!response.ok) throw new Error('delete_failed');
  return response.json();
};

// Officials
export const fetchOfficials = async (databaseId: string) => {
  const response = await fetch(`${API_BASE}/databases/${databaseId}/officials`, {
    credentials: 'include',
  });
  if (!response.ok) throw new Error('fetch_failed');
  return response.json();
};

export const createOfficial = async (databaseId: string, official: any) => {
  const response = await fetch(`${API_BASE}/databases/${databaseId}/officials`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(official),
  });
  if (!response.ok) throw new Error('create_failed');
  return response.json();
};

export const updateOfficial = async (official: any) => {
  const response = await fetch(`${API_BASE}/officials/${official.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(official),
  });
  if (!response.ok) throw new Error('update_failed');
  return response.json();
};

export const deleteOfficial = async (id: string) => {
  const response = await fetch(`${API_BASE}/officials/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!response.ok) throw new Error('delete_failed');
  return response.json();
};

// Templates
export const fetchTemplates = async (): Promise<SavedTemplate[]> => {
  const response = await fetch(`${API_BASE}/templates`, { credentials: 'include' });
  if (!response.ok) throw new Error('fetch_failed');
  return response.json();
};

export const createTemplate = async (template: SavedTemplate) => {
  const response = await fetch(`${API_BASE}/templates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(template),
  });
  if (!response.ok) throw new Error('create_failed');
  return response.json();
};

export const deleteTemplate = async (id: string) => {
  const response = await fetch(`${API_BASE}/templates/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!response.ok) throw new Error('delete_failed');
  return response.json();
};

// Current Template
export const fetchCurrentTemplate = async (): Promise<EmailTemplate> => {
  const response = await fetch(`${API_BASE}/current-template`, { credentials: 'include' });
  if (!response.ok) throw new Error('fetch_failed');
  return response.json();
};

export const saveCurrentTemplate = async (subject: string, body: string) => {
  const response = await fetch(`${API_BASE}/current-template`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ subject, body }),
  });
  if (!response.ok) throw new Error('save_failed');
  return response.json();
};

// Sent History
export const fetchSentHistory = async (): Promise<string[]> => {
  const response = await fetch(`${API_BASE}/sent-history`, { credentials: 'include' });
  if (!response.ok) throw new Error('fetch_failed');
  return response.json();
};

// Settings
export const fetchSettings = async () => {
  const response = await fetch(`${API_BASE}/settings`, { credentials: 'include' });
  if (!response.ok) throw new Error('fetch_failed');
  return response.json();
};

export const saveSettings = async (activeDbId: string) => {
  const response = await fetch(`${API_BASE}/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ activeDbId }),
  });
  if (!response.ok) throw new Error('save_failed');
  return response.json();
};
