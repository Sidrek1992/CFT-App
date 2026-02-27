/**
 * Cloud Functions for CFT-CORREO
 * ────────────────────────────────────────────────────────────────────────────
 *
 * trackEmailOpen — Tracking pixel endpoint
 * ─────────────────────────────────────────
 * Receives a GET request containing encoded tracking metadata and writes a
 * read receipt to Firestore, then returns a 1×1 transparent GIF so it can
 * be embedded invisibly in any HTML email.
 *
 * URL format:
 *   https://us-central1-<PROJECT>.cloudfunctions.net/trackEmailOpen
 *       ?lid=<emailLogId>&cid=<campaignId>&dbid=<databaseId>
 *
 * Firestore write target:
 *   databases/{dbid}/campaigns/{cid}/logs/{lid}  ← updateDoc: { openedAt, openCount }
 *
 * NOTE: Because email clients cache pixel images, we add a unique `t` (timestamp)
 * query param when generating the pixel URL so each open triggers a fresh hit.
 */

import * as functions from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

admin.initializeApp();
const db = admin.firestore();

// 1×1 transparent GIF (base64)
const TRANSPARENT_GIF = Buffer.from(
    'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    'base64'
);

export const trackEmailOpen = functions.onRequest(
    {
        region: 'us-central1',
        // Allow unauthenticated access — this is a public pixel endpoint
        invoker: 'public',
    },
    async (req: any, res: any) => {
        // Always return the pixel immediately so mail clients don't time out
        res.set('Content-Type', 'image/gif');
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
        res.set('Pragma', 'no-cache');
        res.set('Access-Control-Allow-Origin', '*');
        res.status(200).send(TRANSPARENT_GIF);

        // Process tracking asynchronously (after pixel is delivered)
        try {
            const { lid, cid, dbid } = req.query as Record<string, string>;
            if (!lid || !cid || !dbid) return;

            const now = admin.firestore.FieldValue.serverTimestamp();

            // Update the email log document nested inside the database document
            const dbRef = db.collection('databases').doc(dbid);
            const dbSnap = await dbRef.get();
            if (!dbSnap.exists) return;

            const data = dbSnap.data()!;
            const campaigns: any[] = data.campaigns || [];
            let updated = false;

            const updatedCampaigns = campaigns.map((c: any) => {
                if (c.id !== cid) return c;
                const updatedLogs = (c.logs || []).map((l: any) => {
                    if (l.id !== lid) return l;
                    updated = true;
                    return {
                        ...l,
                        openedAt: l.openedAt || Date.now(),
                        openCount: (l.openCount || 0) + 1,
                        lastOpenedAt: Date.now(),
                    };
                });
                return { ...c, logs: updatedLogs };
            });

            if (updated) {
                await dbRef.update({ campaigns: updatedCampaigns });
                console.log(`[trackEmailOpen] Read receipt recorded: lid=${lid} cid=${cid} dbid=${dbid}`);
            }
        } catch (err) {
            // Non-critical — pixel already delivered; just log the error
            console.error('[trackEmailOpen] Error recording receipt:', err);
        }
    }
);
