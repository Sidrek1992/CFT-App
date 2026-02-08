import { getSession } from '../../lib/session.js';
import * as db from '../../lib/db.js';
import { attachRequestContext, logError } from '../../lib/observability.js';
import { sanitizeOfficial } from '../../lib/validation.js';

export default async function handler(req, res) {
  attachRequestContext(req, res);
  const session = getSession(req);
  if (!session?.userId) {
    return res.status(401).json({ error: 'not_authenticated' });
  }

  const { id } = req.query;

  try {
    const ownsOfficial = await db.isOfficialOwnedByUser(session.userId, id);
    if (!ownsOfficial) {
      return res.status(404).json({ error: 'official_not_found' });
    }

    if (req.method === 'PUT') {
      const official = sanitizeOfficial({ ...req.body, id });
      await db.updateOfficial(official);
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'DELETE') {
      await db.deleteOfficial(id);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    logError(req, 'Official error', error, { route: 'user/officials/[id]' });
    res.status(statusCode).json({ error: 'operation_failed', message: error.message, requestId: req.requestId });
  }
}
