# ✅ Checklist Completo de Deployment - CFT Correos

## 📋 Pre-Deployment

### Código y Configuración
- [x] `server/index.js` listo para producción (sirve `dist/`)
- [x] Variables de entorno documentadas en `.env.production`
- [x] `.gitignore` actualizado para excluir archivos sensibles
- [x] Scripts de build creados (`deploy.sh`)
- [x] Documentación completa creada

### Archivos Clave Creados
- [x] `server/index.js` - Backend Node.js (Hostinger)
- [x] `.env.production` - Variables de entorno de producción
- [x] `VERCEL_SETUP.md` - Guía completa de setup en Hostinger
- [x] `GOOGLE_OAUTH_SETUP.md` - Configuración de Google OAuth
- [x] `DEPLOY_QUICK_START.md` - Guía rápida de deployment
- [x] `deploy.sh` - Script de build

---

## 🔧 Configuración en Hostinger

### 1. Variables de Entorno

Ve a: hPanel → **Node.js** → **Environment Variables**

| Variable | Valor | Status |
|----------|-------|--------|
| `GEMINI_API_KEY` | `YOUR_GEMINI_API_KEY` | ⏸️ Pendiente |
| `GOOGLE_CLIENT_ID` | `105444466970-...` | ⏸️ Pendiente |
| `GOOGLE_CLIENT_SECRET` | `YOUR_GOOGLE_CLIENT_SECRET` | ⏸️ Pendiente |
| `GOOGLE_REDIRECT_URI` | `https://myappcftcorreo.vercel.app/api/auth/google/callback` | ⏸️ Pendiente |
| `APP_BASE_URL` | `https://myappcftcorreo.vercel.app` | ⏸️ Pendiente |
| `SESSION_SECRET` | `7f4a8d09e3b2c1a6...` | ⏸️ Pendiente |
| `SUPABASE_URL` | `https://tu-proyecto.supabase.co` | ⏸️ Pendiente |
| `SUPABASE_SERVICE_ROLE_KEY` | `YOUR_SUPABASE_SERVICE_ROLE_KEY` | ⏸️ Pendiente |
| `NODE_ENV` | `production` | ⏸️ Pendiente |

### 2. Configuración de Build

Vercel debería auto-detectar, pero verifica:

| Setting | Value | Status |
|---------|-------|--------|
| Framework Preset | Vite | ⏸️ Pendiente |
| Build Command | `npm run build` | ⏸️ Pendiente |
| Output Directory | `dist` | ⏸️ Pendiente |
| Install Command | `npm install` | ⏸️ Pendiente |
| Node Version | 18.x | ⏸️ Pendiente |

---

## 🔐 Configuración de Google Cloud Console

### 1. Gmail API

| Tarea | Status |
|-------|--------|
| Gmail API habilitada | ⏸️ Pendiente |
| OAuth Consent Screen configurado | ⏸️ Pendiente |
| OAuth Client ID creado | ✅ Completo |

### 2. OAuth Redirect URIs

En **Authorized redirect URIs**, agrega:

| URI | Status |
|-----|--------|
| `http://localhost:4000/api/auth/google/callback` | ✅ Completo |
| `https://myappcftcorreo.vercel.app/api/auth/google/callback` | ⏸️ Pendiente |

### 3. JavaScript Origins

En **Authorized JavaScript origins**, agrega:

| Origin | Status |
|--------|--------|
| `http://localhost:3000` | ✅ Completo |
| `https://myappcftcorreo.vercel.app` | ⏸️ Pendiente |

### 4. Test Users (si OAuth está en Testing)

| Tarea | Status |
|-------|--------|
| Agregar emails de test users | ⏸️ Pendiente |

---

## 🚀 Deployment

### Opción A: Git Push (Recomendado)

```bash
# 1. Commit cambios
git add .
git commit -m "Configure Vercel deployment"

# 2. Push a main
git push origin main

# 3. Vercel desplegará automáticamente
```

| Paso | Status |
|------|--------|
| Cambios en git commiteados | ⏸️ Pendiente |
| Push a repositorio | ⏸️ Pendiente |
| Deploy automático iniciado | ⏸️ Pendiente |
| Deploy completado | ⏸️ Pendiente |

### Opción B: Vercel CLI

```bash
# 1. Instalar CLI
npm i -g vercel

# 2. Login
vercel login

# 3. Deploy
vercel --prod
```

| Paso | Status |
|------|--------|
| Vercel CLI instalado | ⏸️ Pendiente |
| Login completado | ⏸️ Pendiente |
| Deploy ejecutado | ⏸️ Pendiente |

---

## 🧪 Verificación Post-Deployment

### 1. Health Check

```bash
curl https://myappcftcorreo.vercel.app/api/health
```

**Respuesta esperada**: `{"ok":true}`

| Verificación | Status |
|--------------|--------|
| Health check responde | ⏸️ Pendiente |

### 2. Frontend

| Verificación | Status |
|--------------|--------|
| Página carga correctamente | ⏸️ Pendiente |
| No hay errores en consola | ⏸️ Pendiente |
| Assets cargan (CSS, JS, imágenes) | ⏸️ Pendiente |

### 3. Autenticación OAuth

| Verificación | Status |
|--------------|--------|
| Botón "Conectar Gmail" funciona | ⏸️ Pendiente |
| Redirección a Google funciona | ⏸️ Pendiente |
| Callback de Google funciona | ⏸️ Pendiente |
| Usuario se autentica correctamente | ⏸️ Pendiente |
| Sesión persiste en recargar | ⏸️ Pendiente |

### 4. Base de Datos (Supabase)

| Verificación | Status |
|--------------|--------|
| Conexión a Supabase funciona | ⏸️ Pendiente |
| Crear base de datos funciona | ⏸️ Pendiente |
| Agregar funcionarios funciona | ⏸️ Pendiente |
| Datos se guardan correctamente | ⏸️ Pendiente |

### 5. Gemini AI

| Verificación | Status |
|--------------|--------|
| Generación de correos funciona | ⏸️ Pendiente |
| API key funciona correctamente | ⏸️ Pendiente |

### 6. Gmail API

| Verificación | Status |
|--------------|--------|
| Envío de correos funciona | ⏸️ Pendiente |
| Correos se reciben correctamente | ⏸️ Pendiente |
| Adjuntos funcionan (si aplica) | ⏸️ Pendiente |

---

## 🐛 Troubleshooting

### Errores Comunes y Soluciones

| Error | Causa Probable | Solución | Status |
|-------|----------------|----------|--------|
| Error 500 en API | Variables de entorno faltantes | Verificar todas las variables en Vercel | ⏸️ N/A |
| `redirect_uri_mismatch` | URI no autorizada en Google | Agregar URI en Google Cloud Console | ⏸️ N/A |
| "This app's request is invalid" | Falta OAuth Consent Screen | Configurar OAuth Consent Screen | ⏸️ N/A |
| Sesiones no persisten | Cookie settings incorrectos | Verificar `secure: true` y `sameSite: 'none'` | ⏸️ N/A |
| Error de conexión a Supabase | Credenciales incorrectas | Verificar SUPABASE_URL y SERVICE_ROLE_KEY | ⏸️ N/A |

---

## 📊 Logs y Monitoreo

### Ver logs en Vercel

```bash
# CLI
vercel logs

# O en Dashboard
https://vercel.com/[tu-usuario]/app-correo-ten/logs
```

| Tarea | Status |
|-------|--------|
| Verificar logs de errores | ⏸️ Pendiente |
| Configurar alertas (opcional) | ⏸️ Pendiente |

---

## 🎯 Checklist Final

### Pre-Deployment
- [ ] Código revisado y funcional localmente
- [ ] Todas las dependencias instaladas
- [ ] Build local exitoso (`npm run build`)
- [ ] Archivos de configuración creados

### Configuración
- [ ] Variables de entorno configuradas en Vercel
- [ ] Google OAuth redirect URIs actualizados
- [ ] Gmail API habilitada
- [ ] Supabase conectado

### Deployment
- [ ] Deploy realizado (Git push o CLI)
- [ ] Deploy completado sin errores
- [ ] URL de producción accesible

### Verificación
- [ ] Health check funciona
- [ ] Frontend carga correctamente
- [ ] Autenticación OAuth funciona
- [ ] Base de datos funciona
- [ ] Gemini AI funciona
- [ ] Envío de correos funciona

### Post-Deployment
- [ ] Sin errores en logs
- [ ] Performance aceptable
- [ ] Todas las funcionalidades probadas
- [ ] Documentación actualizada

---

## 🎉 ¡Deployment Completado!

Una vez que todos los checks estén ✅, tu aplicación estará funcionando al 100% en:

**https://myappcftcorreo.vercel.app**

---

## 📚 Recursos y Documentación

- `README.md` - Documentación general
- `GUIA_RAPIDA.md` - Guía rápida local
- `VERCEL_SETUP.md` - Setup detallado de Vercel
- `GOOGLE_OAUTH_SETUP.md` - Configuración de OAuth
- `DEPLOY_QUICK_START.md` - Inicio rápido de deployment

---

**Fecha de última actualización**: Febrero 2026
**Versión**: 1.0.0
