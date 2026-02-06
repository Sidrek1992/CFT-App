# ⚡ DEPLOY AHORA - 3 Pasos Simples

## Tu app está en: https://myappcftcorreo.vercel.app

---

## 🚀 Paso 1: Variables de Entorno en Vercel (2 min)

### Abre:
```
https://vercel.com/[tu-usuario]/myappcftcorreo/settings/environment-variables
```

### Copia el contenido del archivo `VERCEL_ENV_VARIABLES.txt`
- Abre el archivo `VERCEL_ENV_VARIABLES.txt`
- Copia cada línea `NOMBRE=valor`
- Pégala en Vercel
- Vercel detectará automáticamente nombre y valor
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

## 📦 Paso 3: Deploy (30 segundos)

### Opción A - Git Push:
```bash
git add .
git commit -m "Deploy to Vercel"
git push origin main
```

### Opción B - Vercel CLI:
```bash
vercel --prod
```

### Opción C - Vercel Dashboard:
- Ve a tu proyecto en Vercel
- Click en "Redeploy"

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
→ Revisa que las 9 variables estén en Vercel
→ Redeploy

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
- `VERCEL_SETUP.md` - Configuración completa

---

**¡Tu app estará en producción en menos de 5 minutos!** ⚡
