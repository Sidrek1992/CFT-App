
/**
 * Service to send emails using the Gmail API
 */

export const sendGmail = async (rawMessage: string) => {
    const token = sessionStorage.getItem('gmail_access_token');

    if (!token) {
        throw new Error('No se encontró el token de acceso de Gmail. Por favor reinicia sesión con Google para autorizar el envío de correos.');
    }

    // Gmail expects a base64url encoded string
    // First we encode the string to UTF-8, then to Base64, then to Base64URL
    const encodedMessage = btoa(new TextEncoder().encode(rawMessage).reduce((data, byte) => data + String.fromCharCode(byte), ''))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            raw: encodedMessage
        })
    });

    if (!response.ok) {
        const errorData = await response.json();

        // If the token is invalid or expired
        if (response.status === 401) {
            sessionStorage.removeItem('gmail_access_token');
            throw new Error('Tu sesión de Google ha expirado o no tiene permisos. Por favor cierra sesión y vuelve a entrar con Google.');
        }

        throw new Error(`Error de Gmail API: ${errorData.error?.message || 'Error desconocido'}`);
    }

    return await response.json();
};

/**
 * Helper to build the raw MIME message string
 */
export const buildRawMessage = async (to: string, subject: string, bodyHTML: string, cc?: string, files: File[] = []) => {
    const boundary = `----=_NextPart_${Date.now()}`;

    let message = `To: ${to}\n`;
    if (cc) message += `Cc: ${cc}\n`;
    message += `Subject: ${subject}\n`;
    message += `MIME-Version: 1.0\n`;
    message += `Content-Type: multipart/mixed; boundary="${boundary}"\n\n`;

    // HTML Part
    message += `--${boundary}\n`;
    message += `Content-Type: text/html; charset="utf-8"\n`;
    message += `Content-Transfer-Encoding: 7bit\n\n`;
    message += `<html><body style="font-family: sans-serif;">${bodyHTML}</body></html>\n\n`;

    // Attachments
    for (const file of files) {
        const base64 = await fileToBase64(file);
        message += `--${boundary}\n`;
        message += `Content-Type: ${file.type || 'application/octet-stream'}; name="${file.name}"\n`;
        message += `Content-Disposition: attachment; filename="${file.name}"\n`;
        message += `Content-Transfer-Encoding: base64\n\n`;

        // Break base64 into 76-character lines
        const chunks = base64.match(/.{1,76}/g) || [];
        message += chunks.join('\n') + `\n\n`;
    }

    message += `--${boundary}--`;
    return message;
};

// Helper to convert File to Base64 (exported for use in other components)
export const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            if (typeof reader.result === 'string') {
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            } else {
                reject(new Error('Failed to convert file'));
            }
        };
        reader.onerror = error => reject(error);
    });
};
