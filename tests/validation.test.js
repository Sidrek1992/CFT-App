import test from 'node:test';
import assert from 'node:assert/strict';
import {
  sanitizeOfficial,
  sanitizeTemplate,
  sanitizeGmailPayload,
} from '../api/lib/validation.js';

test('sanitizeOfficial normalizes and keeps required fields', () => {
  const official = sanitizeOfficial({
    id: 'abc',
    name: ' Juan Perez ',
    email: 'juan@empresa.cl',
    isBoss: 1,
  });

  assert.equal(official.id, 'abc');
  assert.equal(official.name, 'Juan Perez');
  assert.equal(official.email, 'juan@empresa.cl');
  assert.equal(official.isBoss, true);
});

test('sanitizeTemplate clamps fields and defaults createdAt', () => {
  const template = sanitizeTemplate({
    id: 't1',
    name: 'Plantilla',
    subject: 'Hola',
    body: 'Contenido',
  });

  assert.equal(template.id, 't1');
  assert.equal(template.name, 'Plantilla');
  assert.equal(typeof template.createdAt, 'number');
});

test('sanitizeGmailPayload validates email and parses cc', () => {
  const payload = sanitizeGmailPayload({
    to: 'destino@empresa.cl',
    cc: 'a@empresa.cl, b@empresa.cl',
    subject: 'Asunto',
    body: 'Texto',
    attachments: [],
  });

  assert.equal(payload.to, 'destino@empresa.cl');
  assert.equal(payload.cc, 'a@empresa.cl,b@empresa.cl');
});
