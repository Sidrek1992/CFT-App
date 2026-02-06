import { getSession } from '../../lib/session.js';
import * as db from '../../lib/db.js';

export default async function handler(req, res) {
  const session = getSession(req);
  if (!session?.userId) {
    return res.status(401).json({ error: 'not_authenticated' });
  }

  const { id } = req.query;

  try {
    if (req.method === 'PUT') {
      const { name } = req.body;
      if (!name) {
        return res.status(400).json({ error: 'missing_fields' });
      }
      await db.updateDatabase(id, name);
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'DELETE') {
      await db.deleteDatabase(id);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'operation_failed', message: error.message });
  }
}
