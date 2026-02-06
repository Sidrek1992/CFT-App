import { getSession } from '../../../lib/session.js';
import * as db from '../../../lib/db.js';

export default async function handler(req, res) {
  const session = getSession(req);
  if (!session?.userId) {
    return res.status(401).json({ error: 'not_authenticated' });
  }

  const { id: databaseId } = req.query;

  try {
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
      const official = req.body;
      await db.createOfficial(official, databaseId);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Officials error:', error);
    res.status(500).json({ error: 'operation_failed', message: error.message });
  }
}
