import * as functions from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { defineSecret } from 'firebase-functions/params';
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

admin.initializeApp();
const db = admin.firestore();

const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');
const TRACKING_HMAC_SECRET = defineSecret('TRACKING_HMAC_SECRET');

const GEMINI_MODEL = 'gemini-3-flash-preview';
const TRACKING_SIGNATURE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const TRACKING_TOKEN_TTL_MS = 45 * 24 * 60 * 60 * 1000;
const TRACKING_RATE_LIMIT_WINDOW_MS = 60 * 1000;

const TRANSPARENT_GIF = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

const setCorsHeaders = (res: any) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
};

const handleCorsPreflight = (req: any, res: any): boolean => {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return true;
  }
  return false;
};

const verifyAuth = async (req: any, res: any): Promise<admin.auth.DecodedIdToken | null> => {
  const authHeader = req.get('authorization') || req.get('Authorization') || '';
  if (!authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No autorizado.' });
    return null;
  }

  const idToken = authHeader.slice('Bearer '.length);
  try {
    return await admin.auth().verifyIdToken(idToken);
  } catch {
    res.status(401).json({ error: 'Token de autenticacion invalido o expirado.' });
    return null;
  }
};

const stripCodeFence = (input: string): string =>
  input
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

const safeJsonParse = <T>(text: string, fallback: T): T => {
  try {
    return JSON.parse(stripCodeFence(text)) as T;
  } catch {
    return fallback;
  }
};

const getGeminiText = (data: any): string => {
  const parts = data?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return '';
  return parts.map((p: any) => p?.text || '').join('').trim();
};

const callGemini = async (
  apiKey: string,
  contents: any[],
  options?: { systemInstruction?: string }
): Promise<string> => {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      GEMINI_MODEL
    )}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        ...(options?.systemInstruction
          ? {
              systemInstruction: {
                parts: [{ text: options.systemInstruction }],
              },
            }
          : {}),
      }),
    }
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${body}`);
  }

  const data = await response.json();
  const text = getGeminiText(data);
  if (!text) throw new Error('Gemini no devolvio contenido.');
  return text;
};

const signTrackingPayload = (
  secret: string,
  lid: string,
  cid: string,
  dbid: string,
  exp: number,
  nonce: string
): string => {
  const payload = `${lid}.${cid}.${dbid}.${exp}.${nonce}`;
  return createHmac('sha256', secret).update(payload).digest('hex');
};

const constantTimeSigEquals = (a: string, b: string): boolean => {
  if (!/^[0-9a-f]+$/i.test(a) || !/^[0-9a-f]+$/i.test(b)) return false;
  const aBuffer = Buffer.from(a, 'hex');
  const bBuffer = Buffer.from(b, 'hex');
  if (aBuffer.length === 0 || aBuffer.length !== bBuffer.length) return false;
  return timingSafeEqual(aBuffer, bBuffer);
};

const isSafeId = (value: string): boolean => /^[a-zA-Z0-9_-]{6,160}$/.test(value);

const hashHex = (value: string): string => createHash('sha256').update(value).digest('hex');

const allowTrackingHit = async (
  lid: string,
  cid: string,
  dbid: string,
  clientIp: string
): Promise<boolean> => {
  const key = hashHex(`${lid}:${clientIp}`);
  const ipHash = hashHex(clientIp).slice(0, 16);
  const limiterRef = db.collection('_tracking_rate_limits').doc(key);
  const now = Date.now();

  let allowed = false;
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(limiterRef);
    const lastHitAt = Number(snap.data()?.lastHitAt || 0);

    if (now - lastHitAt < TRACKING_RATE_LIMIT_WINDOW_MS) {
      allowed = false;
      return;
    }

    tx.set(
      limiterRef,
      {
        lid,
        cid,
        dbid,
        ipHash,
        lastHitAt: now,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    allowed = true;
  });

  return allowed;
};

type TrackingTarget = {
  lid: string;
  cid: string;
  dbid: string;
};

const resolveTrackingTarget = async (req: any): Promise<TrackingTarget | null> => {
  const tid = String(req.query?.tid || '');
  if (tid) {
    if (!/^[a-f0-9]{32,80}$/i.test(tid)) return null;
    const tokenRef = db.collection('_tracking_tokens').doc(tid);
    const tokenSnap = await tokenRef.get();
    if (!tokenSnap.exists) return null;

    const tokenData = tokenSnap.data() || {};
    const lid = String(tokenData.lid || '');
    const cid = String(tokenData.cid || '');
    const dbid = String(tokenData.dbid || '');
    const exp = Number(tokenData.exp || 0);

    if (!isSafeId(lid) || !isSafeId(cid) || !isSafeId(dbid)) return null;
    if (!Number.isFinite(exp) || exp < Date.now()) return null;

    return { lid, cid, dbid };
  }

  // Legacy fallback for already-sent emails using signed lid/cid/dbid params
  const lid = String(req.query?.lid || '');
  const cid = String(req.query?.cid || '');
  const dbid = String(req.query?.dbid || '');
  const exp = Number(req.query?.exp || 0);
  const nonce = String(req.query?.nonce || '');
  const sig = String(req.query?.sig || '');

  if (!isSafeId(lid) || !isSafeId(cid) || !isSafeId(dbid) || !nonce || !sig) return null;
  if (!Number.isFinite(exp) || exp < Date.now()) return null;

  const secret = TRACKING_HMAC_SECRET.value();
  const expectedSig = signTrackingPayload(secret, lid, cid, dbid, exp, nonce);
  if (!constantTimeSigEquals(expectedSig, sig)) return null;

  return { lid, cid, dbid };
};

export const bootstrapUserProfile = functions.onRequest(
  {
    region: 'us-central1',
  },
  async (req: any, res: any) => {
    if (handleCorsPreflight(req, res)) return;
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Metodo no permitido.' });
      return;
    }

    const decoded = await verifyAuth(req, res);
    if (!decoded) return;

    try {
      const profileRef = db.collection('user_profiles').doc(decoded.uid);
      const bootstrapRef = db.collection('_system').doc('bootstrap');

      const profile = await db.runTransaction(async (tx) => {
        const existingProfileSnap = await tx.get(profileRef);
        if (existingProfileSnap.exists) {
          return existingProfileSnap.data();
        }

        const bootstrapSnap = await tx.get(bootstrapRef);
        const isFirstUser = !bootstrapSnap.exists;
        const now = Date.now();

        const newProfile = {
          uid: decoded.uid,
          email: decoded.email || '',
          displayName:
            decoded.name || decoded.email?.split('@')[0] || 'Usuario',
          photoURL: decoded.picture || null,
          role: isFirstUser ? 'superadmin' : 'reader',
          createdAt: now,
          updatedAt: now,
          createdBy: isFirstUser ? 'system-bootstrap' : 'self-bootstrap',
        };

        tx.set(profileRef, newProfile, { merge: true });

        if (isFirstUser) {
          tx.set(
            bootstrapRef,
            {
              firstSuperadminUid: decoded.uid,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
        }

        return newProfile;
      });

      res.status(200).json({ profile });
    } catch (error: any) {
      console.error('[bootstrapUserProfile] Error:', error);
      res.status(500).json({ error: 'No se pudo bootstrapear el perfil.' });
    }
  }
);

export const issueTrackingSignature = functions.onRequest(
  {
    region: 'us-central1',
    secrets: [TRACKING_HMAC_SECRET],
  },
  async (req: any, res: any) => {
    if (handleCorsPreflight(req, res)) return;
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Metodo no permitido.' });
      return;
    }

    const decoded = await verifyAuth(req, res);
    if (!decoded) return;

    try {
      const { logId, campaignId, databaseId } = req.body || {};
      if (!isSafeId(logId) || !isSafeId(campaignId) || !isSafeId(databaseId)) {
        res.status(400).json({ error: 'Parametros de tracking invalidos.' });
        return;
      }

      const exp = Date.now() + TRACKING_SIGNATURE_TTL_MS;
      const nonce = randomBytes(12).toString('hex');
      const secret = TRACKING_HMAC_SECRET.value();
      const sig = signTrackingPayload(secret, logId, campaignId, databaseId, exp, nonce);

      res.status(200).json({ exp, nonce, sig });
    } catch (error: any) {
      console.error('[issueTrackingSignature] Error:', error);
      res.status(500).json({ error: 'No se pudo emitir firma de tracking.' });
    }
  }
);

export const issueTrackingToken = functions.onRequest(
  {
    region: 'us-central1',
  },
  async (req: any, res: any) => {
    if (handleCorsPreflight(req, res)) return;
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Metodo no permitido.' });
      return;
    }

    const decoded = await verifyAuth(req, res);
    if (!decoded) return;

    try {
      const { logId, campaignId, databaseId } = req.body || {};
      if (!isSafeId(logId) || !isSafeId(campaignId) || !isSafeId(databaseId)) {
        res.status(400).json({ error: 'Parametros de tracking invalidos.' });
        return;
      }

      const tid = randomBytes(20).toString('hex');
      const exp = Date.now() + TRACKING_TOKEN_TTL_MS;

      await db.collection('_tracking_tokens').doc(tid).set(
        {
          lid: logId,
          cid: campaignId,
          dbid: databaseId,
          exp,
          createdBy: decoded.uid,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      res.status(200).json({ tid, exp });
    } catch (error: any) {
      console.error('[issueTrackingToken] Error:', error);
      res.status(500).json({ error: 'No se pudo emitir token de tracking.' });
    }
  }
);

export const trackEmailOpen = functions.onRequest(
  {
    region: 'us-central1',
    invoker: 'public',
    secrets: [TRACKING_HMAC_SECRET],
  },
  async (req: any, res: any) => {
    res.set('Content-Type', 'image/gif');
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    res.set('Pragma', 'no-cache');
    res.set('Access-Control-Allow-Origin', '*');
    res.status(200).send(TRANSPARENT_GIF);

    try {
      const target = await resolveTrackingTarget(req);
      if (!target) return;
      const { lid, cid, dbid } = target;

      const xff = String(req.get('x-forwarded-for') || '');
      const clientIp = (xff.split(',')[0] || req.ip || 'unknown').trim() || 'unknown';
      const allowed = await allowTrackingHit(lid, cid, dbid, clientIp);
      if (!allowed) return;

      const logRef = db
        .collection('databases')
        .doc(dbid)
        .collection('campaigns')
        .doc(cid)
        .collection('logs')
        .doc(lid);

      await db.runTransaction(async (tx) => {
        const logSnap = await tx.get(logRef);
        const now = Date.now();
        const currentOpenCount = Number(logSnap.data()?.openCount || 0);
        const openedAt = logSnap.data()?.openedAt || now;

        tx.set(
          logRef,
          {
            id: lid,
            campaignId: cid,
            databaseId: dbid,
            openedAt,
            openCount: currentOpenCount + 1,
            lastOpenedAt: now,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      });
    } catch (error) {
      console.error('[trackEmailOpen] Error recording read receipt:', error);
    }
  }
);

type GeminiAction =
  | 'detectGenderAndTitle'
  | 'generateTemplate'
  | 'generateQuickReplies'
  | 'analyzePdf'
  | 'refineEmail';

export const geminiProxy = functions.onRequest(
  {
    region: 'us-central1',
    secrets: [GEMINI_API_KEY],
  },
  async (req: any, res: any) => {
    if (handleCorsPreflight(req, res)) return;
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Metodo no permitido.' });
      return;
    }

    const decoded = await verifyAuth(req, res);
    if (!decoded) return;

    try {
      const apiKey = GEMINI_API_KEY.value();
      if (!apiKey) {
        res.status(500).json({ error: 'GEMINI_API_KEY no esta configurada en Functions.' });
        return;
      }

      const action = req.body?.action as GeminiAction;
      const payload = req.body?.payload || {};

      switch (action) {
        case 'detectGenderAndTitle': {
          const name = String(payload.name || '').trim();
          if (!name) {
            res.status(400).json({ error: 'Nombre requerido.' });
            return;
          }

          const text = await callGemini(apiKey, [
            {
              role: 'user',
              parts: [
                {
                  text:
                    `Analiza el nombre "${name}" para contexto corporativo hispanohablante. ` +
                    'Devuelve JSON exacto con claves: gender (Male|Female|Unspecified) y title (ej: Sr., Sra., Dr.).',
                },
              ],
            },
          ]);

          const parsed = safeJsonParse<{ gender?: string; title?: string }>(text, {});
          res.status(200).json({
            result: {
              gender:
                parsed.gender === 'Male' || parsed.gender === 'Female'
                  ? parsed.gender
                  : 'Unspecified',
              title: parsed.title || 'Sr./Sra.',
            },
          });
          return;
        }

        case 'generateTemplate': {
          const instruction = String(payload.instruction || '').trim();
          if (!instruction) {
            res.status(400).json({ error: 'Instruccion requerida.' });
            return;
          }

          const systemInstruction = `Eres un asistente experto en comunicaciones corporativas.
Debes redactar una plantilla de correo profesional en espanol.
Reglas:
- Usa placeholders dinamicos cuando corresponda: {nombre}, {titulo}, {estimado}, {departamento}, {cargo}, {correo}, {jefatura_nombre}, {jefatura_cargo}.
- Responde SIEMPRE en JSON con claves subject y body.
- Manten tono profesional y adecuado al contexto solicitado.`;

          const text = await callGemini(
            apiKey,
            [
              {
                role: 'user',
                parts: [{ text: instruction }],
              },
            ],
            { systemInstruction }
          );

          const parsed = safeJsonParse<{ subject?: string; body?: string }>(text, {});
          if (!parsed.subject || !parsed.body) {
            throw new Error('Gemini no devolvio un JSON valido para plantilla.');
          }

          res.status(200).json({ result: parsed });
          return;
        }

        case 'generateQuickReplies': {
          const threadContext = String(payload.threadContext || '').slice(0, 2000);
          const lastMessageFrom = String(payload.lastMessageFrom || '').trim();
          if (!threadContext) {
            res.status(400).json({ error: 'Contexto de hilo requerido.' });
            return;
          }

          const text = await callGemini(apiKey, [
            {
              role: 'user',
              parts: [
                {
                  text:
                    'Analiza el siguiente hilo y genera exactamente 3 respuestas cortas, profesionales y en espanol (maximo 2 oraciones cada una).\n\n' +
                    `Ultimo mensaje de: ${lastMessageFrom || 'contacto'}\n` +
                    `Contexto:\n"""\n${threadContext}\n"""\n\n` +
                    'Responde solo JSON: {"replies":["...","...","..."]}',
                },
              ],
            },
          ]);

          const parsed = safeJsonParse<{ replies?: string[] }>(text, {});
          const replies = Array.isArray(parsed.replies)
            ? parsed.replies.filter((r) => typeof r === 'string').slice(0, 3)
            : [];

          res.status(200).json({ result: { replies } });
          return;
        }

        case 'analyzePdf': {
          const fileName = String(payload.fileName || 'documento.pdf');
          const mimeType = String(payload.mimeType || 'application/pdf');
          const base64Data = String(payload.base64Data || '');
          if (!base64Data) {
            res.status(400).json({ error: 'Contenido PDF requerido.' });
            return;
          }

          const prompt = `Eres un auditor de documentos laborales en Chile. Analiza este documento y responde SOLO JSON con este formato:
{
  "summary": "resumen breve",
  "isLegible": true/false,
  "horasDetected": true/false,
  "totalHorasFalta": numero o null,
  "issues": [{"severity":"error|warning|info","description":"texto"}]
}

Busca problemas de legibilidad, horas no detectadas, valores de horas falta inusualmente altos, inconsistencias de fechas/totales y campos faltantes.
Archivo: "${fileName}".`;

          const text = await callGemini(apiKey, [
            {
              role: 'user',
              parts: [
                {
                  inlineData: {
                    mimeType,
                    data: base64Data,
                  },
                },
                { text: prompt },
              ],
            },
          ]);

          const parsed = safeJsonParse<any>(text, {});
          res.status(200).json({
            result: {
              fileName,
              summary: parsed.summary || '',
              issues: Array.isArray(parsed.issues) ? parsed.issues : [],
              horasDetected: Boolean(parsed.horasDetected),
              totalHorasFalta:
                typeof parsed.totalHorasFalta === 'number' ? parsed.totalHorasFalta : null,
              isLegible:
                typeof parsed.isLegible === 'boolean' ? parsed.isLegible : true,
            },
          });
          return;
        }

        case 'refineEmail': {
          const currentBody = String(payload.currentBody || '').trim();
          const instruction = String(payload.instruction || '').trim();
          if (!currentBody || !instruction) {
            res.status(400).json({ error: 'Cuerpo e instruccion son requeridos.' });
            return;
          }

          const text = await callGemini(apiKey, [
            {
              role: 'user',
              parts: [
                {
                  text:
                    'Reescribe el siguiente cuerpo de correo segun la instruccion. ' +
                    'Mantiene tono profesional. No agregues introduccion ni explicaciones. Devuelve solo el cuerpo final.\n\n' +
                    `Cuerpo original:\n"""${currentBody}"""\n\n` +
                    `Instruccion: ${instruction}`,
                },
              ],
            },
          ]);

          res.status(200).json({ result: { body: text.trim() } });
          return;
        }

        default:
          res.status(400).json({ error: 'Accion Gemini no soportada.' });
          return;
      }
    } catch (error: any) {
      console.error('[geminiProxy] Error:', error);
      res.status(500).json({ error: error?.message || 'Error interno en geminiProxy.' });
    }
  }
);
