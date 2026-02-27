/**
 * trackingService.ts
 * ────────────────────────────────────────────────────────────────────────────
 * Client-side helpers for email read receipt tracking.
 *
 * Works in conjunction with the Cloud Function in functions/src/index.ts.
 *
 * SETUP REQUIRED:
 *  1. Deploy the Cloud Function: cd functions && npm install && firebase deploy --only functions
 *  2. Set VITE_TRACKING_BASE_URL in your .env to the deployed function URL:
 *       VITE_TRACKING_BASE_URL=https://us-central1-<PROJECT-ID>.cloudfunctions.net
 *  3. The tracking pixel is automatically injected into emails sent via Gmail API
 *     by the buildRawMessageWithTracking() helper below.
 *
 * HOW IT WORKS:
 *  - When an email is sent, a 1×1 transparent GIF pixel URL is appended to the
 *    HTML body. The URL encodes: logId, campaignId, databaseId, and a timestamp
 *    (to prevent mail client caching).
 *  - When the recipient opens the email and renders images, the pixel is fetched.
 *  - The Cloud Function receives the GET request, records the open event in
 *    Firestore (openedAt, openCount, lastOpenedAt on the EmailLog document),
 *    and returns the transparent GIF.
 *
 * READ RECEIPT STATUS (in types.ts — EmailLog):
 *  - openedAt: number    — unix ms of first open
 *  - openCount: number   — total open count
 *  - lastOpenedAt: number — unix ms of most recent open
 */

const TRACKING_BASE = import.meta.env.VITE_TRACKING_BASE_URL || '';

/**
 * Builds the tracking pixel HTML string for a given email log.
 * Returns an empty string if the tracking URL is not configured.
 */
export const buildTrackingPixel = (
    logId: string,
    campaignId: string,
    databaseId: string
): string => {
    if (!TRACKING_BASE || !logId || !campaignId || !databaseId) return '';

    const params = new URLSearchParams({
        lid: logId,
        cid: campaignId,
        dbid: databaseId,
        t: String(Date.now()), // cache-bust
    });

    const pixelUrl = `${TRACKING_BASE}/trackEmailOpen?${params.toString()}`;

    return `<img src="${pixelUrl}" width="1" height="1" style="display:none;border:0;width:1px;height:1px;padding:0;margin:0;" alt="" />`;
};

/**
 * Returns true if tracking is enabled (i.e., VITE_TRACKING_BASE_URL is set).
 */
export const isTrackingEnabled = (): boolean => !!TRACKING_BASE;
