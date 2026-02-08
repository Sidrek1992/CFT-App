import { getSession } from '../lib/session.js';
import * as db from '../lib/db.js';
import { attachRequestContext, logError } from '../lib/observability.js';
import { assertNonEmpty } from '../lib/validation.js';

export default async function handler(req, res) {
  attachRequestContext(req, res);
  const session = getSession(req);
  if (!session?.userId) {
    return res.status(401).json({ error: 'not_authenticated' });
  }

  try {
    if (req.method === 'GET') {
      const databases = await db.getUserDatabases(session.userId);
      return res.status(200).json(databases);
    }

    if (req.method === 'POST') {
      const id = assertNonEmpty(req.body?.id, 'id');
      const name = assertNonEmpty(req.body?.name, 'name');
      await db.createDatabase(session.userId, id, name);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    logError(req, 'Database error', error, { route: 'user/databases' });
    res.status(statusCode).json({ error: 'operation_failed', message: error.message, requestId: req.requestId });
  }
}
