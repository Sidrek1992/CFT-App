
/**
 * Service to send emails using the Gmail API
 */

const GMAIL_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me';

const gmailFetch = async (path: string, options?: RequestInit) => {
    const token = sessionStorage.getItem('gmail_access_token');
    if (!token) throw new Error('No se encontró el token de Gmail. Por favor autoriza Gmail primero.');
    const res = await fetch(`${GMAIL_BASE}${path}`, {
        ...options,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...(options?.headers || {}),
        },
    });
    if (!res.ok) {
        if (res.status === 401) {
            sessionStorage.removeItem('gmail_access_token');
            throw new Error('Sesión de Google expirada. Por favor autoriza Gmail nuevamente.');
        }
        const err = await res.json().catch(() => ({}));
        throw new Error(`Gmail API error: ${err?.error?.message || res.statusText}`);
    }
    return res.json();
};


export const sendGmail = async (rawMessage: string) => {
    const token = sessionStorage.getItem('gmail_access_token');

    if (!token) {
        throw new Error('No se encontró el token de acceso de Gmail. Por favor reinicia sesión con Google para autorizar el envío de correos.');
    }

    // Gmail expects a base64url encoded string
    // First we encode the string to UTF-8, then to Base64, then to Base64URL
    const encodedMessage = btoa(new TextEncoder().encode(rawMessage).reduce((data, byte) => data + String.fromCharCode(byte), ''))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            raw: encodedMessage
        })
    });

    if (!response.ok) {
        const errorData = await response.json();

        // If the token is invalid or expired
        if (response.status === 401) {
            sessionStorage.removeItem('gmail_access_token');
            throw new Error('Tu sesión de Google ha expirado o no tiene permisos. Por favor cierra sesión y vuelve a entrar con Google.');
        }

        throw new Error(`Error de Gmail API: ${errorData.error?.message || 'Error desconocido'}`);
    }

    return await response.json();
};

/**
 * Helper to build the raw MIME message string
 */
/**
 * Encode a subject line using RFC 2047 encoded-word so that accented
 * characters (tildes, ñ, etc.) display correctly in Gmail.
 */
const encodeSubject = (subject: string): string => {
    // Only encode if the subject contains non-ASCII characters
    if (/[\u0080-\uFFFF]/.test(subject)) {
        const utf8Bytes = new TextEncoder().encode(subject);
        const base64 = btoa(String.fromCharCode(...utf8Bytes));
        return `=?UTF-8?B?${base64}?=`;
    }
    return subject;
};

export const buildRawMessage = async (to: string, subject: string, bodyHTML: string, cc?: string, files: File[] = []) => {
    const boundary = `----=_NextPart_${Date.now()}`;
    const encodedSubject = encodeSubject(subject);

    let message = `To: ${to}\n`;
    if (cc) message += `Cc: ${cc}\n`;
    message += `Subject: ${encodedSubject}\n`;
    message += `MIME-Version: 1.0\n`;
    message += `Content-Type: multipart/mixed; boundary="${boundary}"\n\n`;

    // HTML Part
    message += `--${boundary}\n`;
    message += `Content-Type: text/html; charset="utf-8"\n`;
    message += `Content-Transfer-Encoding: quoted-printable\n\n`;
    message += `<html><body style="font-family: sans-serif;">${bodyHTML}</body></html>\n\n`;

    // Attachments
    for (const file of files) {
        const base64 = await fileToBase64(file);
        const safeFilename = encodeSubject(file.name); // RFC 2047 encode filename if needed
        message += `--${boundary}\n`;
        message += `Content-Type: ${file.type || 'application/octet-stream'}; name="${safeFilename}"\n`;
        message += `Content-Disposition: attachment; filename="${safeFilename}"\n`;
        message += `Content-Transfer-Encoding: base64\n\n`;

        // Break base64 into 76-character lines (RFC 2045)
        const chunks = base64.match(/.{1,76}/g) || [];
        message += chunks.join('\n') + `\n\n`;
    }

    message += `--${boundary}--`;
    return message;
};

// Helper to convert File to Base64 (exported for use in other components)
export const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            if (typeof reader.result === 'string') {
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            } else {
                reject(new Error('Failed to convert file'));
            }
        };
        reader.onerror = error => reject(error);
    });
};

// ─── Types for Gmail Inbox ─────────────────────────────────────────────────

export interface GmailMessagePart {
    mimeType: string;
    body: { data?: string; size: number };
    parts?: GmailMessagePart[];
    headers?: { name: string; value: string }[];
}

export interface GmailMessage {
    id: string;
    threadId: string;
    labelIds: string[];
    snippet: string;
    internalDate: string;
    payload: GmailMessagePart;
}

export interface GmailThread {
    id: string;
    historyId: string;
    messages: GmailMessage[];
}

export interface ParsedThread {
    threadId: string;
    subject: string;
    latestFrom: string;
    latestDate: number;
    messageCount: number;
    hasUnread: boolean;
    snippet: string;
    messages: ParsedMessage[];
}

export interface ParsedMessage {
    id: string;
    from: string;
    to: string;
    date: number;
    subject: string;
    bodyHtml: string;
    bodyText: string;
    isFromMe: boolean;
    labelIds: string[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const decodeBase64Url = (str: string): string => {
    const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    try {
        return decodeURIComponent(
            atob(base64).split('').map(c =>
                '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
            ).join('')
        );
    } catch {
        return atob(base64);
    }
};

const extractBodyFromPart = (part: GmailMessagePart): { html: string; text: string } => {
    let html = '';
    let text = '';

    if (part.mimeType === 'text/html' && part.body?.data) {
        html = decodeBase64Url(part.body.data);
    } else if (part.mimeType === 'text/plain' && part.body?.data) {
        text = decodeBase64Url(part.body.data);
    } else if (part.parts) {
        for (const subPart of part.parts) {
            const sub = extractBodyFromPart(subPart);
            if (sub.html) html = sub.html;
            if (sub.text) text = sub.text;
        }
    }
    return { html, text };
};

const getHeader = (msg: GmailMessage, name: string): string => {
    return msg.payload?.headers?.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';
};

const parseMessage = (msg: GmailMessage, myEmail: string): ParsedMessage => {
    const { html, text } = extractBodyFromPart(msg.payload);
    const from = getHeader(msg, 'from');
    return {
        id: msg.id,
        from,
        to: getHeader(msg, 'to'),
        date: parseInt(msg.internalDate),
        subject: getHeader(msg, 'subject'),
        bodyHtml: html || `<pre style="white-space:pre-wrap;font-family:inherit">${text}</pre>`,
        bodyText: text,
        isFromMe: from.toLowerCase().includes(myEmail.toLowerCase()),
        labelIds: msg.labelIds || [],
    };
};

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Fetches threads from Gmail inbox, optionally filtered by a search query.
 * Searches for replies to contacts by filtering for known recipient emails.
 */
export const fetchInboxThreads = async (
    contactEmails: string[],
    maxResults = 30
): Promise<ParsedThread[]> => {
    // Build query: in:inbox AND (from:email1 OR from:email2 ...)
    const fromQuery = contactEmails.length > 0
        ? `(${contactEmails.slice(0, 15).map(e => `from:${e}`).join(' OR ')})`
        : '';
    const q = `in:inbox ${fromQuery}`.trim();

    const data = await gmailFetch(`/threads?q=${encodeURIComponent(q)}&maxResults=${maxResults}`);
    const threadList: { id: string }[] = data.threads || [];

    if (threadList.length === 0) return [];

    // Fetch each thread in parallel (limit concurrency)
    const threads: ParsedThread[] = [];
    const batchSize = 5;
    for (let i = 0; i < threadList.length; i += batchSize) {
        const batch = threadList.slice(i, i + batchSize);
        const results = await Promise.all(
            batch.map(t => gmailFetch(`/threads/${t.id}?format=full`).catch(() => null))
        );
        for (const raw of results) {
            if (!raw) continue;
            const thread = raw as GmailThread;

            // Get myEmail from profile (first call or cache)
            const myEmail = sessionStorage.getItem('gmail_user_email') || '';

            const parsedMessages = thread.messages.map(m => parseMessage(m, myEmail));
            const latest = parsedMessages[parsedMessages.length - 1];
            const hasUnread = thread.messages.some(m => m.labelIds?.includes('UNREAD'));

            threads.push({
                threadId: thread.id,
                subject: latest?.subject || '(Sin asunto)',
                latestFrom: latest?.from || '',
                latestDate: latest?.date || 0,
                messageCount: parsedMessages.length,
                hasUnread,
                snippet: thread.messages[thread.messages.length - 1]?.snippet || '',
                messages: parsedMessages,
            });
        }
    }

    return threads.sort((a, b) => b.latestDate - a.latestDate);
};

/**
 * Fetches the Gmail profile (email) of the authenticated user.
 */
export const fetchGmailProfile = async (): Promise<{ email: string }> => {
    const data = await gmailFetch('/profile');
    const email: string = data.emailAddress || '';
    sessionStorage.setItem('gmail_user_email', email);
    return { email };
};

/**
 * Marks all messages in a thread as READ.
 */
export const markThreadAsRead = async (threadId: string): Promise<void> => {
    await gmailFetch(`/threads/${threadId}/modify`, {
        method: 'POST',
        body: JSON.stringify({ removeLabelIds: ['UNREAD'] }),
    });
};

/**
 * Builds a reply raw MIME message for a Gmail thread.
 */
export const buildReplyRaw = (
    to: string,
    subject: string,
    bodyHtml: string,
    threadId: string,
    inReplyToMessageId: string
): string => {
    const replySubject = subject.startsWith('Re:') ? subject : `Re: ${subject}`;
    let message =
        `To: ${to}\n` +
        `Subject: ${replySubject}\n` +
        `In-Reply-To: ${inReplyToMessageId}\n` +
        `References: ${inReplyToMessageId}\n` +
        `MIME-Version: 1.0\n` +
        `Content-Type: text/html; charset="utf-8"\n\n` +
        `<html><body style="font-family:sans-serif">${bodyHtml}</body></html>`;

    const encodedMessage = btoa(
        new TextEncoder().encode(message).reduce((data, byte) => data + String.fromCharCode(byte), '')
    ).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    return JSON.stringify({ raw: encodedMessage, threadId });
};

/**
 * Sends a reply within a Gmail thread.
 */
export const sendGmailReply = async (replyPayload: string): Promise<void> => {
    const token = sessionStorage.getItem('gmail_access_token');
    if (!token) throw new Error('No se encontró el token de Gmail.');
    const res = await fetch(`${GMAIL_BASE}/messages/send`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: replyPayload,
    });
    if (!res.ok) {
        if (res.status === 401) {
            sessionStorage.removeItem('gmail_access_token');
            throw new Error('Sesión de Google expirada. Por favor autoriza Gmail nuevamente.');
        }
        const err = await res.json().catch(() => ({}));
        throw new Error(`Error al responder: ${err?.error?.message || 'desconocido'}`);
    }
};
