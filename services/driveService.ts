/**
 * driveService.ts
 * ───────────────────────────────────────────────────────────────────────────
 * Integrates the Google Picker API to let users attach files directly from
 * Google Drive without downloading them first.
 *
 * SETUP REQUIRED (one-time, in Google Cloud Console):
 *  1. Enable the "Google Picker API" for your project.
 *  2. Enable the "Google Drive API" for your project.
 *  3. Add the Drive scope to your OAuth consent screen:
 *       https://www.googleapis.com/auth/drive.readonly
 *  4. Add your domain to the list of authorized JavaScript origins.
 *
 * The scope is added to authService.ts loginWithGoogle() automatically
 * by the DRIVE_SCOPE constant below — but it only takes effect after the
 * user re-authorizes (next login after the scope is added).
 *
 * VITE ENV VAR REQUIRED:
 *   VITE_GOOGLE_APP_ID = your Google Cloud project number (found in Console)
 *
 * Usage:
 *   const file = await openDrivePicker(accessToken);
 *   // file is a File object ready to attach
 */

export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.readonly';

const PICKER_API_URL = 'https://apis.google.com/js/api.js';

/** Maximum allowed file size in bytes (25 MB — typical Gmail attachment limit). */
const MAX_FILE_BYTES = 25 * 1024 * 1024;

let pickerApiLoaded = false;

/**
 * Injects the Google API script and resolves once the Picker library is ready.
 *
 * Improvement over the old implementation:
 *  - Uses the script's own `onload` callback exclusively — no `setInterval` polling.
 *  - If the script tag already exists (e.g. called twice), waits for `gapi.load`
 *    via a one-shot `load` event listener on the same script element instead of
 *    repeatedly checking a global variable.
 */
const loadPickerScript = (): Promise<void> => {
    if (pickerApiLoaded) return Promise.resolve();

    return new Promise((resolve, reject) => {
        const existing = document.getElementById('google-picker-api') as HTMLScriptElement | null;

        const loadPickerLibrary = () => {
            (window as any).gapi.load('picker', () => {
                pickerApiLoaded = true;
                resolve();
            });
        };

        if (existing) {
            // Script tag is already in the DOM. If gapi is ready, use it directly;
            // otherwise wait for its load event (fires once the script executes).
            if ((window as any).gapi) {
                loadPickerLibrary();
            } else {
                existing.addEventListener('load', loadPickerLibrary, { once: true });
                existing.addEventListener('error', reject, { once: true });
            }
            return;
        }

        const script = document.createElement('script');
        script.id = 'google-picker-api';
        script.src = PICKER_API_URL;
        script.async = true;
        script.defer = true;
        script.onload = loadPickerLibrary;
        script.onerror = reject;
        document.head.appendChild(script);
    });
};

export interface DriveFile {
    id: string;
    name: string;
    mimeType: string;
    sizeBytes?: number;
}

/**
 * Fetches file metadata from Drive (name, mimeType, size) WITHOUT downloading
 * the full content. Used to validate the file size before committing to a
 * potentially large download.
 */
const fetchDriveFileMetadata = async (
    fileId: string,
    accessToken: string
): Promise<{ name: string; mimeType: string; size?: number }> => {
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}?fields=name,mimeType,size`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(`Error al leer metadatos de Drive: ${err?.error?.message || res.statusText}`);
    }
    return res.json();
};

/**
 * Opens the Google Picker dialog and returns the selected file metadata.
 * After selection:
 *  1. Fetches file metadata to validate the size (rejects if > 25 MB).
 *  2. Downloads the file content via Drive API and wraps it in a File object.
 */
export const openDrivePicker = (accessToken: string): Promise<File | null> => {
    const appId = import.meta.env.VITE_GOOGLE_APP_ID || '';

    return new Promise(async (resolve, reject) => {
        try {
            await loadPickerScript();
            const gapi = (window as any).gapi;
            const google = (window as any).google;

            if (!gapi || !google?.picker) {
                throw new Error('Google Picker API no está disponible. Verifica la configuración en Google Cloud Console.');
            }

            const picker = new google.picker.PickerBuilder()
                .addView(google.picker.ViewId.DOCS)
                .addView(google.picker.ViewId.RECENTLY_PICKED)
                .setOAuthToken(accessToken)
                .setDeveloperKey(import.meta.env.VITE_FIREBASE_API_KEY || '')
                .setAppId(appId)
                .setCallback(async (data: any) => {
                    if (data.action !== google.picker.Action.PICKED) {
                        resolve(null);
                        return;
                    }

                    const doc = data.docs?.[0];
                    if (!doc) { resolve(null); return; }

                    try {
                        // 1. Validate file size BEFORE downloading
                        const metadata = await fetchDriveFileMetadata(doc.id, accessToken);
                        const sizeBytes = metadata.size ? Number(metadata.size) : undefined;

                        if (sizeBytes !== undefined && sizeBytes > MAX_FILE_BYTES) {
                            const sizeMB = (sizeBytes / 1024 / 1024).toFixed(1);
                            throw new Error(
                                `El archivo "${doc.name}" pesa ${sizeMB} MB y supera el límite de ${MAX_FILE_BYTES / 1024 / 1024} MB permitido para adjuntos.`
                            );
                        }

                        // 2. Download the file content
                        const fileBlob = await downloadDriveFile(doc.id, accessToken, doc.mimeType);
                        const file = new File([fileBlob], doc.name, { type: doc.mimeType });
                        resolve(file);
                    } catch (err) {
                        reject(err);
                    }
                })
                .build();

            picker.setVisible(true);
        } catch (err) {
            reject(err);
        }
    });
};

/**
 * Downloads a Google Drive file as a Blob.
 * For Google Workspace files (Docs, Sheets, Slides) it exports them to
 * a standard format (PDF for Docs/Slides, XLSX for Sheets).
 */
const downloadDriveFile = async (fileId: string, accessToken: string, mimeType: string): Promise<Blob> => {
    const DRIVE_BASE = 'https://www.googleapis.com/drive/v3/files';
    const headers = { Authorization: `Bearer ${accessToken}` };

    // Google Workspace types require export
    const exportMap: Record<string, string> = {
        'application/vnd.google-apps.document': 'application/pdf',
        'application/vnd.google-apps.spreadsheet': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.google-apps.presentation': 'application/pdf',
    };

    const exportMimeType = exportMap[mimeType];

    let url: string;
    if (exportMimeType) {
        url = `${DRIVE_BASE}/${fileId}/export?mimeType=${encodeURIComponent(exportMimeType)}`;
    } else {
        url = `${DRIVE_BASE}/${fileId}?alt=media`;
    }

    const res = await fetch(url, { headers });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(`Error al descargar desde Drive: ${err?.error?.message || res.statusText}`);
    }
    return res.blob();
};
