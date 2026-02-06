import { google } from 'googleapis';
import { getSession, clearSession } from '../lib/session.js';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = getSession(req);
  const accessToken = session?.tokens?.access_token;

  if (accessToken && GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
    try {
      const oauth2Client = new google.auth.OAuth2(
        GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET
      );
      oauth2Client.setCredentials(session.tokens);
      await oauth2Client.revokeToken(accessToken);
    } catch (error) {
      console.warn('Failed to revoke token:', error.message);
    }
  }

  clearSession(res);
  res.status(200).json({ ok: true });
}
