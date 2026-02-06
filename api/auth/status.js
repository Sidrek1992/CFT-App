import { getSession } from '../lib/session.js';

export default function handler(req, res) {
  const session = getSession(req);
  const authenticated = Boolean(session?.userId);
  
  res.status(200).json({
    authenticated,
    userId: session?.userId || null,
    email: session?.userEmail || '',
    name: session?.userName || '',
  });
}
