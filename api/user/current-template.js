import { getSession } from '../lib/session.js';
import * as db from '../lib/db.js';

export default async function handler(req, res) {
  const session = getSession(req);
  if (!session?.userId) {
    return res.status(401).json({ error: 'not_authenticated' });
  }

  try {
    if (req.method === 'GET') {
      const template = await db.getCurrentTemplate(session.userId);
      return res.status(200).json(template || { subject: '', body: '' });
    }

    if (req.method === 'POST') {
      const { subject, body } = req.body;
      await db.saveCurrentTemplate(session.userId, subject, body);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Current template error:', error);
    res.status(500).json({ error: 'operation_failed', message: error.message });
  }
}
