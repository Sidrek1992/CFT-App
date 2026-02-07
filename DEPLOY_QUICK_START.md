# ⚡ Guía Rápida de Deployment - Hostinger

## 🚀 Deploy en 5 minutos

### Paso 1: Configurar Variables de Entorno en Hostinger

Ve a: hPanel → **Node.js** → **Environment Variables**

Copia y pega estas variables (una por una):

```
GEMINI_API_KEY=AIzaSyBCCc5EsWW4PdN-F5FHwKpEvPpDJp_iZjM
```

```
GOOGLE_CLIENT_ID=105444466970-787jho21mvt0ehs2mbtmgioigu6m6ns9.apps.googleusercontent.com
```

```
GOOGLE_CLIENT_SECRET=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
```

```
GOOGLE_REDIRECT_URI=https://goldenrod-cormorant-780503.hostingersite.com/api/auth/google/callback
```

```
APP_BASE_URL=https://goldenrod-cormorant-780503.hostingersite.com
```

```
SESSION_SECRET=7f4a8d09e3b2c1a6f5e8d7c4b3a2e1f9d8c7b6a5e4d3c2b1a0f9e8d7c6b5a4e3
```

```
SUPABASE_URL=https://jfrrvxefpboginppevrb.supabase.co
```

```
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmcnJ2eGVmcGJvZ2lucHBldnJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzODAwNzcsImV4cCI6MjA4NTk1NjA3N30.I1qtybXUDfoudJM_gVKDPmE9M8Lj8RfZ88E3ToaZTP8
```

```
NODE_ENV=production
```

---

### Paso 2: Actualizar Google Cloud Console

1. Ve a: https://console.cloud.google.com/apis/credentials
2. Selecciona tu OAuth Client ID
3. En **Authorized redirect URIs**, agrega:
   ```
   https://goldenrod-cormorant-780503.hostingersite.com/api/auth/google/callback
   ```
4. En **Authorized JavaScript origins**, agrega:
   ```
   https://goldenrod-cormorant-780503.hostingersite.com
   ```
5. Guarda

---

### Paso 3: Deploy

Opción A - Git (si usas Git Deploy):
```bash
git add .
git commit -m "Configure for Hostinger deployment"
git push origin main
```

Opción B - Script Automatizado:
```bash
./deploy.sh
```

Opción C - Manual (SSH/FTP):
1. Sube el proyecto a Hostinger.
2. Ejecuta `npm install` y `npm run build`.
3. Inicia la app Node.js con `server/index.js`.

---

### Paso 4: Verificar

1. **Health Check**:
   ```
   https://goldenrod-cormorant-780503.hostingersite.com/api/health
   ```
   Debe devolver: `{"ok":true}`

2. **Autenticación**:
   - Abre: https://goldenrod-cormorant-780503.hostingersite.com
   - Click en "Conectar Gmail"
   - Autoriza con Google
   - ✅ ¡Funciona!

---

## ✅ Checklist

- [ ] Variables de entorno configuradas en Hostinger
- [ ] Google OAuth redirect URIs actualizados
- [ ] Deploy realizado
- [ ] Health check funciona
- [ ] Login con Gmail funciona

---

## 🆘 Problemas Comunes

### Error "redirect_uri_mismatch"

Verifica que en Google Cloud Console tengas exactamente:
```
https://goldenrod-cormorant-780503.hostingersite.com/api/auth/google/callback
```

### Error "This app's request is invalid"

1. Ve a Google Cloud Console → OAuth consent screen
2. Agrega tu email en Test Users
3. Guarda y vuelve a intentar

### Error 500 en API

1. Verifica que TODAS las variables de entorno estén en Hostinger
2. Reinicia la app en hPanel

---

## 📞 Necesitas ayuda?

Ver documentación completa:
- `VERCEL_SETUP.md` - Configuración detallada en Hostinger
- `GOOGLE_OAUTH_SETUP.md` - Configuración de Google OAuth

---

**¡Listo para producción en minutos!** ⚡
