import { getSession } from '../../../lib/session.js';
import * as db from '../../../lib/db.js';
import { attachRequestContext, logError } from '../../../lib/observability.js';
import { sanitizeOfficial } from '../../../lib/validation.js';

export default async function handler(req, res) {
  attachRequestContext(req, res);
  const session = getSession(req);
  if (!session?.userId) {
    return res.status(401).json({ error: 'not_authenticated' });
  }

  const { id: databaseId } = req.query;

  try {
    const ownsDb = await db.isDatabaseOwnedByUser(session.userId, databaseId);
    if (!ownsDb) {
      return res.status(404).json({ error: 'database_not_found' });
    }

    if (req.method === 'GET') {
      const officials = await db.getOfficials(databaseId);
      const mapped = officials.map(o => ({
        id: o.id,
        name: o.name,
        email: o.email,
        gender: o.gender,
        title: o.title,
        department: o.department,
        position: o.position,
        stament: o.stament,
        isBoss: Boolean(o.is_boss),
        bossName: o.boss_name,
        bossPosition: o.boss_position,
        bossEmail: o.boss_email,
      }));
      return res.status(200).json(mapped);
    }

    if (req.method === 'POST') {
      const official = sanitizeOfficial(req.body || {});
      await db.createOfficial(official, databaseId);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    logError(req, 'Officials error', error, { route: 'user/databases/[id]/officials' });
    res.status(statusCode).json({ error: 'operation_failed', message: error.message, requestId: req.requestId });
  }
}
