export type GmailAuthStatus = {
  authenticated: boolean;
  userId?: number | null;
  email?: string;
  name?: string;
};

export type GmailAttachment = {
  filename: string;
  mimeType: string;
  contentBase64: string;
};

export type GmailSendPayload = {
  to: string;
  cc?: string;
  subject: string;
  body: string;
  attachments?: GmailAttachment[];
};

const safeJson = async (response: Response) => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

export const getGmailAuthStatus = async (): Promise<GmailAuthStatus> => {
  const response = await fetch('/api/auth/status', {
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error('status_failed');
  }
  return response.json();
};

export const startGmailAuth = () => {
  window.location.href = '/api/auth/google';
};

export const logoutGmail = async (): Promise<void> => {
  const response = await fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error('logout_failed');
  }
};

export const sendGmailMessage = async (
  payload: GmailSendPayload & { officialId?: string }
) => {
  const response = await fetch('/api/gmail/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const data = await safeJson(response);
    throw new Error(data?.error || 'send_failed');
  }

  return response.json();
};
