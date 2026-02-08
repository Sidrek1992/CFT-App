import { getSession } from '../lib/session.js';
import * as db from '../lib/db.js';
import { attachRequestContext, logError } from '../lib/observability.js';
import { sanitizeTemplate } from '../lib/validation.js';

export default async function handler(req, res) {
  attachRequestContext(req, res);
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
      const template = sanitizeTemplate(req.body || {});
      await db.createTemplate(session.userId, template);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    logError(req, 'Templates error', error, { route: 'user/templates' });
    res.status(statusCode).json({ error: 'operation_failed', message: error.message, requestId: req.requestId });
  }
}
