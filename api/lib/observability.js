import crypto from 'crypto';

export const attachRequestContext = (req, res) => {
  const requestId = (req.headers['x-request-id'] || '').toString().trim() || crypto.randomUUID();
  req.requestId = requestId;
  res.setHeader('x-request-id', requestId);
  return requestId;
};

export const logInfo = (req, message, extra = {}) => {
  console.log(JSON.stringify({ level: 'info', requestId: req.requestId, message, ...extra }));
};

export const logError = (req, message, error, extra = {}) => {
  console.error(
    JSON.stringify({
      level: 'error',
      requestId: req.requestId,
      message,
      error: error?.message || String(error),
      ...extra,
    })
  );
};
