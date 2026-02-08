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
| `SUPABASE_URL` | `https://xxxx.supabase.co` | URL del proyecto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | `TU_SUPABASE_SERVICE_ROLE_KEY` | Service role key para backend |

## 2. Comandos de Build

En Settings -> General, asegúrate de que los comandos sean:
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

## 3. Despliegue

Una vez configuradas las variables, realiza un nuevo despliegue desde la pestaña "Deployments".
