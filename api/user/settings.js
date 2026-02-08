import { getSession } from '../lib/session.js';
import * as db from '../lib/db.js';
import { attachRequestContext, logError } from '../lib/observability.js';
import { asString } from '../lib/validation.js';

export default async function handler(req, res) {
  attachRequestContext(req, res);
  const session = getSession(req);
  if (!session?.userId) {
    return res.status(401).json({ error: 'not_authenticated' });
  }

  try {
    if (req.method === 'GET') {
      const settings = await db.getUserSettings(session.userId);
      return res.status(200).json(settings || { active_db_id: null });
    }

    if (req.method === 'POST') {
      const activeDbId = asString(req.body?.activeDbId, 120);
      if (activeDbId) {
        const ownsDb = await db.isDatabaseOwnedByUser(session.userId, activeDbId);
        if (!ownsDb) {
          return res.status(404).json({ error: 'database_not_found' });
        }
      }
      await db.saveUserSettings(session.userId, activeDbId);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    logError(req, 'Settings error', error, { route: 'user/settings' });
    res.status(statusCode).json({ error: 'operation_failed', message: error.message, requestId: req.requestId });
  }
}
