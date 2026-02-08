const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const asString = (value, max = 5000) => {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, max);
};

export const isEmail = (value) => EMAIL_REGEX.test(asString(value, 320));

export const assertNonEmpty = (value, field) => {
  const normalized = asString(value);
  if (!normalized) {
    const err = new Error(`${field}_required`);
    err.statusCode = 400;
    throw err;
  }
  return normalized;
};

export const assertOptionalEmail = (value, field) => {
  const normalized = asString(value, 320);
  if (!normalized) return '';
  if (!isEmail(normalized)) {
    const err = new Error(`${field}_invalid`);
    err.statusCode = 400;
    throw err;
  }
  return normalized;
};

export const sanitizeOfficial = (input) => {
  const id = assertNonEmpty(input?.id, 'id');
  const name = assertNonEmpty(input?.name, 'name');
  const email = assertOptionalEmail(input?.email, 'email');
  const position = asString(input?.position, 200);
  const title = asString(input?.title, 60);

  return {
    id,
    name,
    email,
    gender: asString(input?.gender, 40) || 'Unspecified',
    title,
    department: asString(input?.department, 200),
    position,
    stament: asString(input?.stament, 200),
    isBoss: Boolean(input?.isBoss),
    bossName: asString(input?.bossName, 200),
    bossPosition: asString(input?.bossPosition, 200),
    bossEmail: assertOptionalEmail(input?.bossEmail, 'bossEmail'),
  };
};

export const sanitizeTemplate = (input) => ({
  id: assertNonEmpty(input?.id, 'id'),
  name: assertNonEmpty(input?.name, 'name').slice(0, 200),
  subject: asString(input?.subject, 300),
  body: asString(input?.body, 20000),
  createdAt: Number(input?.createdAt) || Date.now(),
});

export const sanitizeGmailPayload = (input) => {
  const to = assertOptionalEmail(input?.to, 'to');
  if (!to) {
    const err = new Error('to_required');
    err.statusCode = 400;
    throw err;
  }

  const ccRaw = asString(input?.cc, 2000);
  const ccList = ccRaw
    ? ccRaw.split(',').map((item) => item.trim()).filter(Boolean)
    : [];

  if (ccList.length > 10) {
    const err = new Error('cc_limit_exceeded');
    err.statusCode = 400;
    throw err;
  }

  ccList.forEach((mail) => {
    if (!isEmail(mail)) {
      const err = new Error('cc_invalid');
      err.statusCode = 400;
      throw err;
    }
  });

  const attachments = Array.isArray(input?.attachments) ? input.attachments : [];
  if (attachments.length > 10) {
    const err = new Error('attachments_limit_exceeded');
    err.statusCode = 400;
    throw err;
  }

  const safeAttachments = attachments.map((attachment) => ({
    filename: asString(attachment?.filename, 255) || 'attachment',
    mimeType: asString(attachment?.mimeType, 120) || 'application/octet-stream',
    contentBase64: asString(attachment?.contentBase64, 15_000_000),
  }));

  return {
    to,
    cc: ccList.join(','),
    subject: asString(input?.subject, 300),
    body: asString(input?.body, 100_000),
    attachments: safeAttachments,
    officialId: input?.officialId ? asString(input.officialId, 120) : '',
  };
};
