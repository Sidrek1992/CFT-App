import { getSession } from '../../lib/session.js';
import * as db from '../../lib/db.js';
import { attachRequestContext, logError } from '../../lib/observability.js';
import { assertNonEmpty } from '../../lib/validation.js';

export default async function handler(req, res) {
  attachRequestContext(req, res);
  const session = getSession(req);
  if (!session?.userId) {
    return res.status(401).json({ error: 'not_authenticated' });
  }

  const { id } = req.query;

  try {
    const ownsDb = await db.isDatabaseOwnedByUser(session.userId, id);
    if (!ownsDb) {
      return res.status(404).json({ error: 'database_not_found' });
    }

    if (req.method === 'PUT') {
      const name = assertNonEmpty(req.body?.name, 'name');
      await db.updateDatabase(id, name);
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'DELETE') {
      await db.deleteDatabase(id);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    logError(req, 'Database error', error, { route: 'user/databases/[id]' });
    res.status(statusCode).json({ error: 'operation_failed', message: error.message, requestId: req.requestId });
  }
}
