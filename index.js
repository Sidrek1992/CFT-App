import express from 'express';
import { onRequest } from 'firebase-functions/v2/https';

import healthHandler from './api/health.js';
import authGoogleHandler from './api/auth/google.js';
import authGoogleCallbackHandler from './api/auth/google/callback.js';
import authStatusHandler from './api/auth/status.js';
import authLogoutHandler from './api/auth/logout.js';
import gmailSendHandler from './api/gmail/send.js';
import userDatabasesHandler from './api/user/databases.js';
import userDatabaseByIdHandler from './api/user/databases/[id].js';
import userOfficialsByDatabaseHandler from './api/user/databases/[id]/officials.js';
import userOfficialByIdHandler from './api/user/officials/[id].js';
import userTemplatesHandler from './api/user/templates.js';
import userTemplateByIdHandler from './api/user/templates/[id].js';
import userCurrentTemplateHandler from './api/user/current-template.js';
import userSentHistoryHandler from './api/user/sent-history.js';
import userSettingsHandler from './api/user/settings.js';

const app = express();

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true }));

const adapt = (handler, injectQuery) => async (req, res) => {
  try {
    if (injectQuery) {
      req.query = {
        ...req.query,
        ...injectQuery(req),
      };
    }
    await handler(req, res);
  } catch (error) {
    console.error('Unhandled API error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'internal_error' });
    }
  }
};

app.all('/api/health', adapt(healthHandler));
app.all('/api/auth/google', adapt(authGoogleHandler));
app.all('/api/auth/google/callback', adapt(authGoogleCallbackHandler));
app.all('/api/auth/status', adapt(authStatusHandler));
app.all('/api/auth/logout', adapt(authLogoutHandler));
app.all('/api/gmail/send', adapt(gmailSendHandler));

app.all('/api/user/databases', adapt(userDatabasesHandler));
app.all('/api/user/databases/:id', adapt(userDatabaseByIdHandler, (req) => ({ id: req.params.id })));
app.all(
  '/api/user/databases/:id/officials',
  adapt(userOfficialsByDatabaseHandler, (req) => ({ id: req.params.id }))
);
app.all('/api/user/officials/:id', adapt(userOfficialByIdHandler, (req) => ({ id: req.params.id })));
app.all('/api/user/templates', adapt(userTemplatesHandler));
app.all('/api/user/templates/:id', adapt(userTemplateByIdHandler, (req) => ({ id: req.params.id })));
app.all('/api/user/current-template', adapt(userCurrentTemplateHandler));
app.all('/api/user/sent-history', adapt(userSentHistoryHandler));
app.all('/api/user/settings', adapt(userSettingsHandler));

app.all('/api/*', (req, res) => {
  res.status(404).json({ error: 'not_found' });
});

export const api = onRequest({ region: 'us-central1' }, app);
