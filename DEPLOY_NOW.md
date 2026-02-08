# ⚡ DEPLOY AHORA - 3 Pasos Simples

## Tu app está en: https://myappcftcorreo.vercel.app

---

## 🚀 Paso 1: Variables de Entorno en Hostinger (2 min)

### Abre:
En hPanel → **Node.js** → **Environment Variables**

### Copia el contenido del archivo `VERCEL_ENV_VARIABLES.txt`
- Abre el archivo `VERCEL_ENV_VARIABLES.txt`
- Copia cada línea `NOMBRE=valor`
- Pégala en Hostinger
- Hostinger detectará automáticamente nombre y valor
- Haz clic en "Add"

**Total: 9 variables**

---

## 🔐 Paso 2: Google OAuth (1 min)

### Abre:
```
https://console.cloud.google.com/apis/credentials
```

### Edita tu OAuth Client ID:
1. Click en tu OAuth Client ID
2. En **Authorized redirect URIs**, agrega:
   ```
   https://myappcftcorreo.vercel.app/api/auth/google/callback
   ```
3. En **Authorized JavaScript origins**, agrega:
   ```
   https://myappcftcorreo.vercel.app
   ```
4. SAVE

---

## 📦 Paso 3: Deploy (2-3 minutos)

### Pasos:
1. Sube el proyecto a Hostinger (Git/SSH/FTP).
2. Ejecuta:
   ```bash
   npm install
   npm run build
   ```
3. Configura la app Node.js con **startup file**: `server/index.js`.
4. Inicia o reinicia la aplicación.

---

## ✅ Verificar (30 segundos)

### 1. Health Check:
Abre en tu navegador:
```
https://myappcftcorreo.vercel.app/api/health
```
Debe mostrar: `{"ok":true}`

### 2. Test Completo:
```
https://myappcftcorreo.vercel.app
```
1. Click en "Conectar Gmail"
2. Autoriza con Google
3. ✅ ¡Listo!

---

## ❌ Si algo falla:

### Error en Health Check
→ Revisa que las 9 variables estén en Hostinger
→ Reinicia la app

### Error de OAuth
→ Verifica la URL en Google Cloud Console:
```
https://myappcftcorreo.vercel.app/api/auth/google/callback
```
→ Espera 5 minutos
→ Vuelve a intentar

---

## 📚 Más Info:

- `DEPLOY_QUICK_START.md` - Guía detallada
- `GOOGLE_OAUTH_UPDATE.md` - Config OAuth paso a paso
- `VERCEL_SETUP.md` - Configuración completa en Hostinger

---

**¡Tu app estará en producción en menos de 5 minutos!** ⚡
