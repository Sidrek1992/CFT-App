export function getBaseUrl(req) {
  const configured = (process.env.APP_BASE_URL || '').trim();
  if (configured) return configured.replace(/\/$/, '');

  const forwardedProto = req.headers['x-forwarded-proto'];
  const forwardedHost = req.headers['x-forwarded-host'];
  const host = forwardedHost || req.headers.host || process.env.VERCEL_URL;
  const proto = forwardedProto || 'https';

  if (!host) {
    return 'http://localhost:3000';
  }

  return `${proto}://${host}`.replace(/\/$/, '');
}
