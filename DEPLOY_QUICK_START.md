# ⚡ Guía Rápida de Deployment - Hostinger

## 🚀 Deploy en 5 minutos

### Paso 1: Configurar Variables de Entorno en Hostinger

Ve a: hPanel → **Node.js** → **Environment Variables**

Copia y pega estas variables (una por una):

```
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
```

```
GOOGLE_CLIENT_ID=105444466970-787jho21mvt0ehs2mbtmgioigu6m6ns9.apps.googleusercontent.com
```

```
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET
```

```
GOOGLE_REDIRECT_URI=https://goldenrod-cormorant-780503.hostingersite.com/api/auth/google/callback
```

```
APP_BASE_URL=https://goldenrod-cormorant-780503.hostingersite.com
```

```
SESSION_SECRET=YOUR_SESSION_SECRET
```

```
SUPABASE_URL=https://tu-proyecto.supabase.co
```

```
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
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
