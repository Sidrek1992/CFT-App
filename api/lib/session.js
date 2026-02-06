import jwt from 'jsonwebtoken';
import { parse, serialize } from 'cookie';

const SESSION_SECRET = process.env.SESSION_SECRET || 'fallback-secret-change-in-production';
const COOKIE_NAME = 'cft_session';
const MAX_AGE = 60 * 60 * 24 * 7; // 7 días

export function getSession(req) {
  try {
    const cookies = parse(req.headers.cookie || '');
    const token = cookies[COOKIE_NAME];
    
    if (!token) {
      return null;
    }
    
    const decoded = jwt.verify(token, SESSION_SECRET);
    return decoded;
  } catch (error) {
    console.error('Error parsing session:', error.message);
    return null;
  }
}

export function setSession(res, sessionData) {
  try {
    const token = jwt.sign(sessionData, SESSION_SECRET, {
      expiresIn: MAX_AGE,
    });
    
    const cookie = serialize(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: MAX_AGE,
      path: '/',
    });
    
    res.setHeader('Set-Cookie', cookie);
    return token;
  } catch (error) {
    console.error('Error setting session:', error);
    throw error;
  }
}

export function clearSession(res) {
  const cookie = serialize(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 0,
    path: '/',
  });
  
  res.setHeader('Set-Cookie', cookie);
}
