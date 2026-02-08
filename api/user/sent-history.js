import { getSession } from '../lib/session.js';
import * as db from '../lib/db.js';
import { attachRequestContext, logError } from '../lib/observability.js';

export default async function handler(req, res) {
  attachRequestContext(req, res);
  const session = getSession(req);
  if (!session?.userId) {
    return res.status(401).json({ error: 'not_authenticated' });
  }

  try {
    if (req.method === 'GET') {
      const history = await db.getSentHistory(session.userId);
      return res.status(200).json(history);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    logError(req, 'Sent history error', error, { route: 'user/sent-history' });
    res.status(statusCode).json({ error: 'operation_failed', message: error.message, requestId: req.requestId });
  }
}
