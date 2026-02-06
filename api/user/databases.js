import { getSession } from '../lib/session.js';
import * as db from '../lib/db.js';

export default async function handler(req, res) {
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
      const { id, name } = req.body;
      if (!id || !name) {
        return res.status(400).json({ error: 'missing_fields' });
      }
      await db.createDatabase(session.userId, id, name);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'operation_failed', message: error.message });
  }
}
