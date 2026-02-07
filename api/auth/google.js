import { google } from 'googleapis';
import { getBaseUrl } from '../lib/base-url.js';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

const OAUTH_SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'openid',
  'email',
  'profile',
];

export default function handler(req, res) {
  const appBaseUrl = getBaseUrl(req);
  const googleRedirectUri = process.env.GOOGLE_REDIRECT_URI || `${appBaseUrl}/api/auth/google/callback`;

  console.log('=== OAuth Google Init ===');
  console.log('GOOGLE_CLIENT_ID:', GOOGLE_CLIENT_ID ? 'Set' : 'NOT SET');
  console.log('GOOGLE_CLIENT_SECRET:', GOOGLE_CLIENT_SECRET ? 'Set' : 'NOT SET');
  console.log('APP_BASE_URL:', appBaseUrl);
  console.log('GOOGLE_REDIRECT_URI:', googleRedirectUri);
  
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    console.error('Missing Google credentials');
    return res.status(500).json({ error: 'missing_google_credentials' });
  }

  try {
    const oauth2Client = new google.auth.OAuth2(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      googleRedirectUri
    );

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: OAUTH_SCOPES,
    });

    console.log('Redirecting to:', authUrl);
    res.redirect(authUrl);
  } catch (error) {
    console.error('Error generating auth URL:', error);
    res.status(500).json({ error: 'auth_init_failed', message: error.message });
  }
}
