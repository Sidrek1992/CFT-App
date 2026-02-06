import crypto from 'crypto';
import express from 'express';
import { google } from 'googleapis';
import * as db from '../server/supabaseClient.js';
import { getSession, setSession, clearSession, updateSession } from './sessionHandler.js';

const app = express();

// Environment variables
const APP_BASE_URL = process.env.APP_BASE_URL || 
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || `${APP_BASE_URL}/api/auth/google/callback`;

const OAUTH_SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'openid',
  'email',
  'profile',
];

// Middleware
app.use(express.json({ limit: '20mb' }));

// Helper functions
const createOAuthClient = () =>
  new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
  );

const ensureConfigured = (res) => {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    res.status(500).json({ error: 'missing_google_credentials' });
    return false;
  }
  return true;
};

const base64UrlEncode = (input) =>
  Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

const chunkString = (value, size) => {
  const chunks = [];
  for (let i = 0; i < value.length; i += size) {
    chunks.push(value.slice(i, i + size));
  }
  return chunks;
};

const sanitizeHeaderValue = (value) =>
  String(value || '').replace(/[\r\n]+/g, ' ').trim();

const encodeSubject = (subject) => {
  if (!subject) return '';
  const encoded = Buffer.from(subject, 'utf8').toString('base64');
  return `=?UTF-8?B?${encoded}?=`;
};

const buildMimeMessage = ({ to, cc, subject, html, attachments }) => {
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
};

const getAuthorizedClient = (req) => {
  const session = getSession(req);
  if (!session?.tokens) return null;
  const client = createOAuthClient();
  client.setCredentials(session.tokens);
  return client;
};

const requireAuth = (req, res, next) => {
  const session = getSession(req);
  if (!session?.userId) {
    res.status(401).json({ error: 'not_authenticated' });
    return;
  }
  req.userSession = session;
  next();
};

// Routes
app.get('/api/health', (req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

app.get('/api/auth/google', (req, res) => {
  if (!ensureConfigured(res)) return;
  console.log('Initiating OAuth flow...');
  const client = createOAuthClient();
  const url = client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: OAUTH_SCOPES,
  });
  console.log('Redirecting to:', url);
  res.redirect(url);
});

app.get('/api/auth/google/callback', async (req, res) => {
  if (!ensureConfigured(res)) return;
  const { code } = req.query;
  
  if (!code) {
    console.error('No code provided in OAuth callback');
    res.redirect(`${APP_BASE_URL}?gmail=error`);
    return;
  }

  try {
    console.log('OAuth callback: Getting tokens...');
    const client = createOAuthClient();
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    console.log('OAuth callback: Getting user info...');
    const oauth2 = google.oauth2({ version: 'v2', auth: client });
    const { data } = await oauth2.userinfo.get();
    
    const googleId = data.id;
    const userEmail = data.email || '';
    const userName = data.name || '';

    console.log('OAuth callback: Creating/getting user from database...', userEmail);
    const user = await db.getOrCreateUser(googleId, userEmail, userName);
    
    if (!user || !user.id) {
      throw new Error('Failed to create or retrieve user');
    }

    console.log('OAuth callback: User retrieved:', user.id);
    
    // Guardar sesión en cookie JWT
    setSession(res, {
      tokens,
      userId: user.id,
      userEmail,
      userName,
    });

    console.log('OAuth callback: Session saved in JWT cookie');
    console.log('OAuth callback: Redirecting to app...');
    res.redirect(`${APP_BASE_URL}?gmail=connected`);
  } catch (error) {
    console.error('OAuth callback error:', error);
    console.error('Error stack:', error.stack);
    res.redirect(`${APP_BASE_URL}?gmail=error&message=${encodeURIComponent(error.message)}`);
  }
});

app.get('/api/auth/status', (req, res) => {
  const session = getSession(req);
  const authenticated = Boolean(session?.userId);
  res.json({
    authenticated,
    userId: session?.userId || null,
    email: session?.userEmail || '',
    name: session?.userName || '',
  });
});

app.post('/api/auth/logout', async (req, res) => {
  const session = getSession(req);
  const client = getAuthorizedClient(req);
  const accessToken = session?.tokens?.access_token;

  if (client && accessToken) {
    try {
      await client.revokeToken(accessToken);
    } catch (error) {
      console.warn('Failed to revoke token', error);
    }
  }

  clearSession(res);
  res.json({ ok: true });
});

app.post('/api/gmail/send', requireAuth, async (req, res) => {
  if (!ensureConfigured(res)) return;
  const client = getAuthorizedClient(req);
  if (!client) {
    res.status(401).json({ error: 'not_authenticated' });
    return;
  }

  const { to, cc, subject, body, attachments, officialId } = req.body || {};
  if (!to) {
    res.status(400).json({ error: 'missing_fields' });
    return;
  }

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

  try {
    const gmail = google.gmail({ version: 'v1', auth: client });
    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: base64UrlEncode(rawMessage),
      },
    });

    if (officialId) {
      await db.markAsSent(req.userSession.userId, officialId);
    }

    res.json({ id: response.data.id });
  } catch (error) {
    console.error('Gmail send error', error);
    res.status(500).json({ error: 'send_failed' });
  }
});

// User data endpoints
app.get('/api/user/databases', requireAuth, async (req, res) => {
  try {
    const databases = await db.getUserDatabases(req.userSession.userId);
    res.json(databases);
  } catch (error) {
    console.error('Error fetching databases', error);
    res.status(500).json({ error: 'fetch_failed' });
  }
});

app.post('/api/user/databases', requireAuth, async (req, res) => {
  try {
    const { id, name } = req.body;
    if (!id || !name) {
      return res.status(400).json({ error: 'missing_fields' });
    }
    await db.createDatabase(req.userSession.userId, id, name);
    res.json({ ok: true });
  } catch (error) {
    console.error('Error creating database', error);
    res.status(500).json({ error: 'create_failed' });
  }
});

app.put('/api/user/databases/:id', requireAuth, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'missing_fields' });
    }
    await db.updateDatabase(req.params.id, name);
    res.json({ ok: true });
  } catch (error) {
    console.error('Error updating database', error);
    res.status(500).json({ error: 'update_failed' });
  }
});

app.delete('/api/user/databases/:id', requireAuth, async (req, res) => {
  try {
    await db.deleteDatabase(req.params.id);
    res.json({ ok: true });
  } catch (error) {
    console.error('Error deleting database', error);
    res.status(500).json({ error: 'delete_failed' });
  }
});

app.get('/api/user/databases/:id/officials', requireAuth, async (req, res) => {
  try {
    const officials = await db.getOfficials(req.params.id);
    const mapped = officials.map(o => ({
      id: o.id,
      name: o.name,
      email: o.email,
      gender: o.gender,
      title: o.title,
      department: o.department,
      position: o.position,
      stament: o.stament,
      isBoss: Boolean(o.is_boss),
      bossName: o.boss_name,
      bossPosition: o.boss_position,
      bossEmail: o.boss_email,
    }));
    res.json(mapped);
  } catch (error) {
    console.error('Error fetching officials', error);
    res.status(500).json({ error: 'fetch_failed' });
  }
});

app.post('/api/user/databases/:id/officials', requireAuth, async (req, res) => {
  try {
    const official = req.body;
    await db.createOfficial(official, req.params.id);
    res.json({ ok: true });
  } catch (error) {
    console.error('Error creating official', error);
    res.status(500).json({ error: 'create_failed' });
  }
});

app.put('/api/user/officials/:id', requireAuth, async (req, res) => {
  try {
    const official = { ...req.body, id: req.params.id };
    await db.updateOfficial(official);
    res.json({ ok: true });
  } catch (error) {
    console.error('Error updating official', error);
    res.status(500).json({ error: 'update_failed' });
  }
});

app.delete('/api/user/officials/:id', requireAuth, async (req, res) => {
  try {
    await db.deleteOfficial(req.params.id);
    res.json({ ok: true });
  } catch (error) {
    console.error('Error deleting official', error);
    res.status(500).json({ error: 'delete_failed' });
  }
});

app.get('/api/user/templates', requireAuth, async (req, res) => {
  try {
    const templates = await db.getSavedTemplates(req.userSession.userId);
    res.json(templates);
  } catch (error) {
    console.error('Error fetching templates', error);
    res.status(500).json({ error: 'fetch_failed' });
  }
});

app.post('/api/user/templates', requireAuth, async (req, res) => {
  try {
    const template = req.body;
    await db.createTemplate(req.userSession.userId, template);
    res.json({ ok: true });
  } catch (error) {
    console.error('Error creating template', error);
    res.status(500).json({ error: 'create_failed' });
  }
});

app.delete('/api/user/templates/:id', requireAuth, async (req, res) => {
  try {
    await db.deleteTemplate(req.params.id);
    res.json({ ok: true });
  } catch (error) {
    console.error('Error deleting template', error);
    res.status(500).json({ error: 'delete_failed' });
  }
});

app.get('/api/user/current-template', requireAuth, async (req, res) => {
  try {
    const template = await db.getCurrentTemplate(req.userSession.userId);
    res.json(template || { subject: '', body: '' });
  } catch (error) {
    console.error('Error fetching current template', error);
    res.status(500).json({ error: 'fetch_failed' });
  }
});

app.post('/api/user/current-template', requireAuth, async (req, res) => {
  try {
    const { subject, body } = req.body;
    await db.saveCurrentTemplate(req.userSession.userId, subject, body);
    res.json({ ok: true });
  } catch (error) {
    console.error('Error saving current template', error);
    res.status(500).json({ error: 'save_failed' });
  }
});

app.get('/api/user/sent-history', requireAuth, async (req, res) => {
  try {
    const history = await db.getSentHistory(req.userSession.userId);
    res.json(history);
  } catch (error) {
    console.error('Error fetching sent history', error);
    res.status(500).json({ error: 'fetch_failed' });
  }
});

app.get('/api/user/settings', requireAuth, async (req, res) => {
  try {
    const settings = await db.getUserSettings(req.userSession.userId);
    res.json(settings || { active_db_id: null });
  } catch (error) {
    console.error('Error fetching settings', error);
    res.status(500).json({ error: 'fetch_failed' });
  }
});

app.post('/api/user/settings', requireAuth, async (req, res) => {
  try {
    const { activeDbId } = req.body;
    await db.saveUserSettings(req.userSession.userId, activeDbId);
    res.json({ ok: true });
  } catch (error) {
    console.error('Error saving settings', error);
    res.status(500).json({ error: 'save_failed' });
  }
});

export default app;
