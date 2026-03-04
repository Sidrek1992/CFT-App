import { callProtectedFunction } from './cloudFunctionService';

const TRACKING_BASE =
  import.meta.env.VITE_TRACKING_BASE_URL ||
  import.meta.env.VITE_FUNCTIONS_BASE_URL ||
  (import.meta.env.VITE_FIREBASE_PROJECT_ID
    ? `https://us-central1-${import.meta.env.VITE_FIREBASE_PROJECT_ID}.cloudfunctions.net`
    : '');

interface IssueTrackingTokenResponse {
  tid: string;
}

export const buildTrackingPixel = (
  logId: string,
  campaignId: string,
  databaseId: string
): Promise<string> => {
  if (!TRACKING_BASE || !logId || !campaignId || !databaseId) return Promise.resolve('');

  return callProtectedFunction<IssueTrackingTokenResponse>('issueTrackingToken', {
    logId,
    campaignId,
    databaseId,
  })
    .then((token) => {
      if (!token?.tid) return '';

      const params = new URLSearchParams({
        tid: token.tid,
        t: String(Date.now()),
      });

      const pixelUrl = `${TRACKING_BASE}/trackEmailOpen?${params.toString()}`;
      return `<img src="${pixelUrl}" width="1" height="1" style="display:none;border:0;width:1px;height:1px;padding:0;margin:0;" alt="" />`;
    })
    .catch((err) => {
      console.warn('[trackingService] No se pudo emitir token de tracking:', err);
      return '';
    });
};

export const isTrackingEnabled = (): boolean => !!TRACKING_BASE;
