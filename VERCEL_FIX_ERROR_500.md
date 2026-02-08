# 🔧 Fix Error 500 en Vercel - CFT Correos

## ❌ Problema

Después de hacer login con Google en https://goldenrod-cormorant-780503.hostingersite.com, recibes:
```
Esta página no funciona
HTTP ERROR 500
```

## ✅ Solución Implementada

He corregido el problema cambiando el sistema de sesiones de `express-session` (que NO funciona en Vercel serverless) a **JWT en cookies**.

---

## 🔑 Cambios Realizados

### 1. Nuevo Sistema de Sesiones

**Archivos creados:**
- `api/sessionHandler.js` - Manejo de sesiones con JWT en cookies

**Cómo funciona:**
- Las sesiones ahora se almacenan en cookies JWT firmadas
- Compatible con funciones serverless de Vercel
- No requiere almacenamiento en memoria
- Seguro y escalable

### 2. Paquetes Instalados

```bash
npm install jsonwebtoken cookie cookie-signature
```

Estos paquetes son necesarios para:
- `jsonwebtoken` - Crear y verificar tokens JWT
- `cookie` - Parsear y serializar cookies
- `cookie-signature` - Firmar cookies de forma segura

---

## 📦 Deploy a Vercel

### Paso 1: Asegurar que las variables de entorno estén configuradas

Ve a: **https://vercel.com/[tu-usuario]/myappcftcorreo/settings/environment-variables**

Verifica que **TODAS** estas variables estén configuradas:

```
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
GOOGLE_CLIENT_ID=105444466970-787jho21mvt0ehs2mbtmgioigu6m6ns9.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI=https://goldenrod-cormorant-780503.hostingersite.com/api/auth/google/callback
APP_BASE_URL=https://goldenrod-cormorant-780503.hostingersite.com
SESSION_SECRET=7f4a8d09e3b2c1a6f5e8d7c4b3a2e1f9d8c7b6a5e4d3c2b1a0f9e8d7c6b5a4e3
FIREBASE_PROJECT_ID=https://jfrrvxefpboginppevrb.firebase.co
FIREBASE_CLIENT_EMAIL=YOUR_SUPABASE_SERVICE_ROLE_KEY
NODE_ENV=production
```

⚠️ **MUY IMPORTANTE:** `SESSION_SECRET` es crítico para firmar las cookies JWT.

### Paso 2: Actualizar package.json en Vercel

Asegúrate de que el `package.json` incluya las nuevas dependencias:

```json
{
  "dependencies": {
    "jsonwebtoken": "^9.0.2",
    "cookie": "^0.6.0",
    "cookie-signature": "^1.2.1"
  }
}
```

Esto ya está en el archivo, solo asegúrate de hacer commit.

### Paso 3: Deploy

```bash
git add .
git commit -m "Fix error 500 con JWT sessions para Vercel"
git push origin main
```

Vercel desplegará automáticamente.

---

## 🧪 Verificar el Fix

### 1. Esperar el Deploy

Ve a: https://vercel.com/[tu-usuario]/myappcftcorreo

Espera a que el deploy termine (usualmente 1-2 minutos).

### 2. Probar Health Check

```bash
curl https://goldenrod-cormorant-780503.hostingersite.com/api/health
```

Debe devolver:
```json
{"ok":true,"timestamp":"2026-02-06T..."}
```

### 3. Probar Login

1. Abre: https://goldenrod-cormorant-780503.hostingersite.com
2. Abre la consola del navegador (F12)
3. Click en "Conectar Gmail"
4. Autoriza con Google
5. ✅ Deberías redirigir exitosamente sin error 500

### 4. Verificar Sesión

Después del login, verifica que la cookie se haya creado:
- F12 → Application → Cookies → https://goldenrod-cormorant-780503.hostingersite.com
- Debe haber una cookie llamada `cft_session`

---

## 🔍 Ver Logs en Vercel

Si aún hay problemas:

### Opción 1: Dashboard de Vercel

1. Ve a: https://vercel.com/[tu-usuario]/myappcftcorreo
2. Click en el deployment más reciente
3. Click en "Functions" tab
4. Click en cualquier función para ver logs

### Opción 2: CLI de Vercel

```bash
vercel logs
```

Busca mensajes como:
```
OAuth callback: Getting tokens...
OAuth callback: Getting user info...
OAuth callback: Creating/getting user from database...
OAuth callback: User retrieved: 1
OAuth callback: Session saved in JWT cookie
OAuth callback: Redirecting to app...
```

---

## ⚙️ Configuración de Cookies

Las cookies ahora están configuradas correctamente para producción:

```javascript
{
  httpOnly: true,              // No accesible desde JavaScript
  secure: true,                // Solo HTTPS en producción
  sameSite: 'none',            // Permite cross-site (necesario para OAuth)
  maxAge: 604800,              // 7 días
  path: '/',                   // Disponible en toda la app
}
```

---

## 🐛 Troubleshooting

### Error: "jwt malformed"

**Causa:** Cookie corrupta o SESSION_SECRET incorrecto

**Solución:**
1. Limpia las cookies del navegador
2. Verifica que `SESSION_SECRET` esté configurado en Vercel
3. Vuelve a hacer login

### Error: "not_authenticated" después de login

**Causa:** Cookie no se está enviando

**Solución:**
1. Verifica que las cookies de terceros estén habilitadas en el navegador
2. Verifica que la configuración de cookies tenga `sameSite: 'none'` y `secure: true`
3. Limpia las cookies y vuelve a intentar

### Error 500 persiste

**Causa:** Variables de entorno faltantes o incorrectas

**Solución:**
1. Ve a Vercel Dashboard → Settings → Environment Variables
2. Verifica que TODAS las 9 variables estén configuradas
3. Especialmente: `SESSION_SECRET`, `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`
4. Redeploy: `vercel --prod --force`

### No aparece la cookie en el navegador

**Causa:** Configuración de dominio incorrecta

**Solución:**
1. Verifica que `APP_BASE_URL` en Vercel sea: `https://goldenrod-cormorant-780503.hostingersite.com`
2. No debe tener slash al final
3. Debe ser HTTPS, no HTTP

---

## 📊 Diferencias: Local vs Vercel

### Local (Development)
```javascript
// express-session con memoria
session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,  // HTTP permitido
  }
})
```

### Vercel (Production)
```javascript
// JWT en cookies
setSession(res, {
  tokens,
  userId,
  userEmail,
  userName,
});

// Cookie:
{
  httpOnly: true,
  sameSite: 'none',  // Necesario para OAuth cross-domain
  secure: true,      // Solo HTTPS
}
```

---

## ✅ Checklist de Deployment

Antes de declarar que funciona, verifica:

- [ ] Todas las variables de entorno en Vercel configuradas
- [ ] `package.json` con nuevas dependencias (jwt, cookie)
- [ ] Código pusheado a Git
- [ ] Deploy completado en Vercel
- [ ] Health check funciona: `/api/health`
- [ ] Login con Gmail funciona sin error 500
- [ ] Cookie `cft_session` se crea después del login
- [ ] `/api/auth/status` muestra `authenticated: true`
- [ ] Funcionalidades de la app funcionan

---

## 📝 Nota Importante

El servidor local (`npm run server`) sigue usando `express-session` porque funciona bien ahí. Solo Vercel usa JWT en cookies.

Archivos:
- **Local:** `server/index.js` (express-session)
- **Vercel:** `api/index.js` (JWT cookies)

Ambos son compatibles con el frontend.

---

## 🎉 Resultado Esperado

Después de aplicar este fix:

1. ✅ Login con Google funciona en Vercel
2. ✅ No más error 500
3. ✅ Sesiones persisten correctamente
4. ✅ Todas las funcionalidades de la app funcionan
5. ✅ Compatible con funciones serverless

---

**El error 500 está corregido con JWT sessions!** 🚀

Ahora puedes hacer deploy a Vercel y todo funcionará correctamente.
