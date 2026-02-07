# Configuración en Vercel

Sigue estos pasos para desplegar la aplicación en Vercel:

## 1. Variables de Entorno

Debes configurar las siguientes variables en el Dashboard de Vercel (Settings -> Environment Variables):

| Variable | Valor de Ejemplo | Descripción |
|----------|-------|-------------|
| `GEMINI_API_KEY` | `TU_GEMINI_API_KEY` | API key de Gemini AI |
| `GOOGLE_CLIENT_ID` | `TU_GOOGLE_CLIENT_ID` | Cliente OAuth de Google |
| `GOOGLE_CLIENT_SECRET` | `TU_GOOGLE_CLIENT_SECRET` | Secret OAuth de Google |
| `GOOGLE_REDIRECT_URI` | `https://tu-app.vercel.app/api/auth/google/callback` | Redirect URI para OAuth |
| `APP_BASE_URL` | `https://tu-app.vercel.app` | URL base de la aplicación |
| `SESSION_SECRET` | `TU_SESSION_SECRET` | Secret para sesiones |
| `FIREBASE_PROJECT_ID` | `TU_FIREBASE_PROJECT_ID` | ID del proyecto Firebase |
| `FIREBASE_CLIENT_EMAIL` | `firebase-adminsdk-xxx@tu-proyecto.iam.gserviceaccount.com` | Email de service account |
| `FIREBASE_PRIVATE_KEY` | `-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n` | Private key (con \n escapados) |

## 2. Comandos de Build

En Settings -> General, asegúrate de que los comandos sean:
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

## 3. Despliegue

Una vez configuradas las variables, realiza un nuevo despliegue desde la pestaña "Deployments".
