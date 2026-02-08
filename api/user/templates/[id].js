import { getSession } from '../../lib/session.js';
import * as db from '../../lib/db.js';
import { attachRequestContext, logError } from '../../lib/observability.js';

export default async function handler(req, res) {
  attachRequestContext(req, res);
  const session = getSession(req);
  if (!session?.userId) {
    return res.status(401).json({ error: 'not_authenticated' });
  }

  const { id } = req.query;

  try {
    if (req.method === 'DELETE') {
      const ownsTemplate = await db.isTemplateOwnedByUser(session.userId, id);
      if (!ownsTemplate) {
        return res.status(404).json({ error: 'template_not_found' });
      }

      await db.deleteTemplate(id);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    logError(req, 'Template error', error, { route: 'user/templates/[id]' });
    res.status(statusCode).json({ error: 'operation_failed', message: error.message, requestId: req.requestId });
  }
}
