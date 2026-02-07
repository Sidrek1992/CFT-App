import { google } from 'googleapis';
import { setSession } from '../../lib/session.js';
import * as db from '../../lib/db.js';
import { getBaseUrl } from '../../lib/base-url.js';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

export default async function handler(req, res) {
  console.log('=== OAuth Callback ===');
  const appBaseUrl = getBaseUrl(req);
  const googleRedirectUri = process.env.GOOGLE_REDIRECT_URI || `${appBaseUrl}/api/auth/google/callback`;
  
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    console.error('Missing Google credentials');
    return res.redirect(`${appBaseUrl}?gmail=error&reason=missing_credentials`);
  }

  const { code } = req.query;
  
  if (!code) {
    console.error('No code provided');
    return res.redirect(`${appBaseUrl}?gmail=error&reason=no_code`);
  }

  try {
    console.log('Getting tokens...');
    const oauth2Client = new google.auth.OAuth2(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      googleRedirectUri
    );

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    console.log('Tokens received');

    console.log('Getting user info...');
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data } = await oauth2.userinfo.get();
    
    const googleId = data.id;
    const userEmail = data.email || '';
    const userName = data.name || '';
    console.log('User info:', userEmail);

    console.log('Creating/getting user in database...');
    const user = await db.getOrCreateUser(googleId, userEmail, userName);
    
    if (!user || !user.id) {
      throw new Error('Failed to create or retrieve user');
    }
    console.log('User ID:', user.id);

    console.log('Setting session cookie...');
    setSession(res, {
      tokens,
      userId: user.id,
      userEmail,
      userName,
    });

    console.log('Redirecting to app...');
    res.redirect(`${appBaseUrl}?gmail=connected`);
  } catch (error) {
    console.error('OAuth callback error:', error);
    console.error('Stack:', error.stack);
    res.redirect(`${appBaseUrl}?gmail=error&reason=${encodeURIComponent(error.message)}`);
  }
}
