import { getSession } from '../lib/session.js';
import * as db from '../lib/db.js';

export default async function handler(req, res) {
  const session = getSession(req);
  if (!session?.userId) {
    return res.status(401).json({ error: 'not_authenticated' });
  }

  try {
    if (req.method === 'GET') {
      const templates = await db.getSavedTemplates(session.userId);
      return res.status(200).json(templates);
    }

    if (req.method === 'POST') {
      const template = req.body;
      await db.createTemplate(session.userId, template);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Templates error:', error);
    res.status(500).json({ error: 'operation_failed', message: error.message });
  }
}
