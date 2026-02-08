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
      const template = await db.getCurrentTemplate(session.userId);
      return res.status(200).json(template || { subject: '', body: '' });
    }

    if (req.method === 'POST') {
      const subject = asString(req.body?.subject, 300);
      const body = asString(req.body?.body, 20000);
      await db.saveCurrentTemplate(session.userId, subject, body);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    logError(req, 'Current template error', error, { route: 'user/current-template' });
    res.status(statusCode).json({ error: 'operation_failed', message: error.message, requestId: req.requestId });
  }
}
