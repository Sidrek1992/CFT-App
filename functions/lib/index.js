"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.trackEmailOpen = void 0;
const functions = __importStar(require("firebase-functions/v2/https"));
const admin = __importStar(require("firebase-admin"));
admin.initializeApp();
const db = admin.firestore();
// 1×1 transparent GIF (base64)
const TRANSPARENT_GIF = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
exports.trackEmailOpen = functions.onRequest({
    region: 'us-central1',
    // Allow unauthenticated access — this is a public pixel endpoint
    invoker: 'public',
}, async (req, res) => {
    // Always return the pixel immediately so mail clients don't time out
    res.set('Content-Type', 'image/gif');
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    res.set('Pragma', 'no-cache');
    res.set('Access-Control-Allow-Origin', '*');
    res.status(200).send(TRANSPARENT_GIF);
    // Process tracking asynchronously (after pixel is delivered)
    try {
        const { lid, cid, dbid } = req.query;
        if (!lid || !cid || !dbid)
            return;
        const now = admin.firestore.FieldValue.serverTimestamp();
        // Update the email log document nested inside the database document
        const dbRef = db.collection('databases').doc(dbid);
        const dbSnap = await dbRef.get();
        if (!dbSnap.exists)
            return;
        const data = dbSnap.data();
        const campaigns = data.campaigns || [];
        let updated = false;
        const updatedCampaigns = campaigns.map((c) => {
            if (c.id !== cid)
                return c;
            const updatedLogs = (c.logs || []).map((l) => {
                if (l.id !== lid)
                    return l;
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
    }
    catch (err) {
        // Non-critical — pixel already delivered; just log the error
        console.error('[trackEmailOpen] Error recording receipt:', err);
    }
});
//# sourceMappingURL=index.js.map