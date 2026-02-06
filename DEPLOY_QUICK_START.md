# Guía de Despliegue Rápido - CFT CORREOS

Esta guía te ayudará a poner en marcha la aplicación en producción.

## 1. Supabase Setup

1. Crea un proyecto en [Supabase](https://supabase.com/).
2. Ejecuta el SQL de `supabase-schema.sql` en el Editor SQL de Supabase.
3. Obtén tu `SUPABASE_URL` y `SUPABASE_ANON_KEY`.

## 2. Google OAuth Setup

1. Ve a [Google Cloud Console](https://console.cloud.google.com/).
2. Crea un proyecto y configura la pantalla de consentimiento OAuth.
3. Crea credenciales de tipo "ID de cliente de OAuth 2.0" (Aplicación web).
4. Añade `https://tu-app.vercel.app/api/auth/google/callback` a los URIs de redireccionamiento autorizados.
5. Obtén tu `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`.

## 3. Gemini API Setup

1. Obtén tu API Key en [Google AI Studio](https://aistudio.google.com/).

## 4. Despliegue en Vercel

1. Sube tu código a GitHub.
2. Conecta tu repositorio a Vercel.
3. Configura las siguientes variables de entorno:

```
GEMINI_API_KEY=TU_GEMINI_API_KEY
GOOGLE_CLIENT_ID=TU_GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=TU_GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI=https://tu-app.vercel.app/api/auth/google/callback
APP_BASE_URL=https://tu-app.vercel.app
SESSION_SECRET=UNA_CADENA_ALEATORIA_LARGA
SUPABASE_URL=TU_SUPABASE_URL
SUPABASE_ANON_KEY=TU_SUPABASE_ANON_KEY
```

4. Haz clic en "Deploy".
