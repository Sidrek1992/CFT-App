import { google } from 'googleapis';
import { getSession } from '../lib/session.js';
import * as db from '../lib/db.js';
import { sanitizeGmailPayload } from '../lib/validation.js';
import { consumeRateLimit } from '../lib/rate-limit.js';
import { attachRequestContext, logError, logInfo } from '../lib/observability.js';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

function base64UrlEncode(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function sanitizeHeaderValue(value) {
  return String(value || '').replace(/[\r\n]+/g, ' ').trim();
}

function encodeSubject(subject) {
  if (!subject) return '';
  const encoded = Buffer.from(subject, 'utf8').toString('base64');
  return `=?UTF-8?B?${encoded}?=`;
}

function chunkString(value, size) {
  const chunks = [];
  for (let i = 0; i < value.length; i += size) {
    chunks.push(value.slice(i, i + size));
  }
  return chunks;
}

function buildMimeMessage({ to, cc, subject, html, attachments }) {
  const safeAttachments = Array.isArray(attachments) ? attachments : [];
  const hasAttachments = safeAttachments.length > 0;
  const boundary = `----=_Part_${Date.now()}`;

  const safeTo = sanitizeHeaderValue(to);
  const safeCc = sanitizeHeaderValue(cc);
  const safeSubject = sanitizeHeaderValue(subject);

  let headers = `To: ${safeTo}\n`;
  if (safeCc) headers += `Cc: ${safeCc}\n`;
  headers += `Subject: ${encodeSubject(safeSubject)}\n`;
  headers += 'MIME-Version: 1.0\n';

  if (!hasAttachments) {
    headers += 'Content-Type: text/html; charset="UTF-8"\n';
    headers += 'Content-Transfer-Encoding: 7bit\n\n';
    return headers + html;
  }

  headers += `Content-Type: multipart/mixed; boundary="${boundary}"\n\n`;

  let body = '';
  body += `--${boundary}\n`;
  body += 'Content-Type: text/html; charset="UTF-8"\n';
  body += 'Content-Transfer-Encoding: 7bit\n\n';
  body += `${html}\n\n`;

  safeAttachments.forEach((attachment) => {
    const filename = attachment.filename || 'attachment';
    const mimeType = attachment.mimeType || 'application/octet-stream';
    const content = attachment.contentBase64 || '';
    const chunks = chunkString(content, 76).join('\n');

    body += `--${boundary}\n`;
    body += `Content-Type: ${mimeType}; name="${filename}"\n`;
    body += `Content-Disposition: attachment; filename="${filename}"\n`;
    body += 'Content-Transfer-Encoding: base64\n\n';
    body += `${chunks}\n\n`;
  });

  body += `--${boundary}--`;
  return headers + body;
}

export default async function handler(req, res) {
  attachRequestContext(req, res);
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = getSession(req);
  if (!session?.userId) {
    return res.status(401).json({ error: 'not_authenticated' });
  }

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return res.status(500).json({ error: 'missing_google_credentials' });
  }

  const rate = consumeRateLimit({
    key: `gmail-send:${session.userId}`,
    limit: 25,
    windowMs: 60_000,
  });
  if (!rate.allowed) {
    res.setHeader('retry-after', String(Math.ceil((rate.retryAfterMs || 1000) / 1000)));
    return res.status(429).json({ error: 'rate_limit_exceeded', requestId: req.requestId });
  }

  try {
    const { to, cc, subject, body, attachments, officialId } = sanitizeGmailPayload(req.body || {});

    if (officialId) {
      const ownsOfficial = await db.isOfficialOwnedByUser(session.userId, officialId);
      if (!ownsOfficial) {
        return res.status(404).json({ error: 'official_not_found' });
      }
    }

    const oauth2Client = new google.auth.OAuth2(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET
    );
    oauth2Client.setCredentials(session.tokens);

    const safeSubject = typeof subject === 'string' ? subject : '';
    const safeBody = typeof body === 'string' ? body : '';
    const htmlBody = safeBody.replace(/\n/g, '<br/>');
    
    const rawMessage = buildMimeMessage({
      to,
      cc,
      subject: safeSubject,
      html: `<html><body style="font-family: Arial, sans-serif;">${htmlBody}</body></html>`,
      attachments,
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: base64UrlEncode(rawMessage),
      },
    });

    if (officialId) {
      await db.markAsSent(session.userId, officialId);
    }

    logInfo(req, 'gmail_send_success', { userId: session.userId, officialId: officialId || null });
    res.status(200).json({ id: response.data.id });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    logError(req, 'Gmail send error', error, { userId: session.userId });
    res.status(statusCode).json({ error: 'send_failed', message: error.message, requestId: req.requestId });
  }
}
