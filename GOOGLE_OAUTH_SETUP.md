# 🔐 Configuración de Google OAuth - CFT Correos

## Configuración de Google Cloud Console

Para que la autenticación funcione correctamente en Vercel, necesitas actualizar las URIs autorizadas en Google Cloud Console.

---

## 📋 Pasos de Configuración

### 1. Acceder a Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Inicia sesión con tu cuenta de Google
3. Selecciona tu proyecto o crea uno nuevo

---

### 2. Habilitar Gmail API

1. En el menú lateral, ve a **APIs & Services** → **Library**
2. Busca "Gmail API"
3. Haz clic en **Gmail API**
4. Haz clic en **Enable** (si no está habilitada)

---

### 3. Configurar OAuth Consent Screen

1. Ve a **APIs & Services** → **OAuth consent screen**
2. Selecciona el tipo de usuario:
   - **Internal** (si es para una organización de Google Workspace)
   - **External** (para usuarios públicos)
3. Completa la información requerida:
   - **App name**: CFT Correos
   - **User support email**: Tu email
   - **Developer contact information**: Tu email
4. Haz clic en **Save and Continue**

#### Scopes (Alcances)

En la sección de Scopes, agrega:
- `https://www.googleapis.com/auth/gmail.send` - Enviar correos
- `https://www.googleapis.com/auth/userinfo.email` - Ver email
- `https://www.googleapis.com/auth/userinfo.profile` - Ver perfil

#### Test Users (Solo si está en modo Testing)

Si tu app está en modo **Testing**, agrega los emails de los usuarios que podrán usar la app:
1. Ve a la sección **Test users**
2. Haz clic en **Add Users**
3. Agrega los emails autorizados
4. Guarda

---

### 4. Crear OAuth 2.0 Client ID

#### Si ya tienes un Client ID:

1. Ve a **APIs & Services** → **Credentials**
2. Encuentra tu **OAuth 2.0 Client ID** existente
3. Haz clic en el nombre para editarlo

#### Si necesitas crear uno nuevo:

1. Ve a **APIs & Services** → **Credentials**
2. Haz clic en **Create Credentials** → **OAuth Client ID**
3. Selecciona **Web application**
4. Dale un nombre (ej: "CFT Correos Web Client")

---

### 5. Configurar URIs Autorizadas

#### Authorized JavaScript origins

Agrega las siguientes URLs:

```
http://localhost:3000
https://app-correo-ten.vercel.app
```

#### Authorized redirect URIs

Agrega las siguientes URLs:

```
http://localhost:4000/api/auth/google/callback
https://app-correo-ten.vercel.app/api/auth/google/callback
```

**⚠️ IMPORTANTE**: Asegúrate de que las URLs estén escritas exactamente como se muestra, sin espacios ni caracteres adicionales.

---

### 6. Obtener Credenciales

Después de guardar:
1. Verás tu **Client ID** y **Client Secret**
2. Copia estos valores
3. Úsalos en tus variables de entorno:
   - Local: `.env.local`
   - Vercel: Dashboard → Settings → Environment Variables

---

### 7. Configurar Variables de Entorno

#### Para desarrollo local (`.env.local`):

```env
GOOGLE_CLIENT_ID=tu-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=tu-client-secret
GOOGLE_REDIRECT_URI=http://localhost:4000/api/auth/google/callback
APP_BASE_URL=http://localhost:3000
```

#### Para producción (Vercel):

Ve a tu proyecto en Vercel → **Settings** → **Environment Variables**

Agrega:
```
GOOGLE_CLIENT_ID=tu-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=tu-client-secret
GOOGLE_REDIRECT_URI=https://app-correo-ten.vercel.app/api/auth/google/callback
APP_BASE_URL=https://app-correo-ten.vercel.app
```

---

## 🧪 Verificar Configuración

### 1. Test en Local

```bash
npm start
```

Abre http://localhost:3000 y haz clic en "Conectar Gmail"

### 2. Test en Producción

Abre https://app-correo-ten.vercel.app y haz clic en "Conectar Gmail"

---

## ❌ Troubleshooting

### Error: "redirect_uri_mismatch"

**Causa**: La URL de redirección no coincide con las configuradas en Google Cloud Console.

**Solución**:
1. Verifica que `GOOGLE_REDIRECT_URI` en Vercel sea exactamente:
   ```
   https://app-correo-ten.vercel.app/api/auth/google/callback
   ```
2. Verifica que esta URL esté agregada en **Authorized redirect URIs** en Google Cloud Console
3. Espera 5 minutos para que los cambios se propaguen
4. Limpia la caché del navegador y vuelve a intentar

### Error: "Access blocked: This app's request is invalid"

**Causa**: Falta configurar el OAuth Consent Screen o faltan scopes.

**Solución**:
1. Ve a **OAuth consent screen**
2. Completa toda la información requerida
3. Agrega los scopes necesarios
4. Si está en modo Testing, agrega tu email como Test User
5. Guarda y vuelve a intentar

### Error: "This app isn't verified"

**Causa**: Tu app está en modo Testing y el usuario no está en la lista de Test Users.

**Solución**:
1. Ve a **OAuth consent screen** → **Test users**
2. Agrega el email del usuario
3. O publica la app (solo si es necesario)

### Error: "Invalid client"

**Causa**: El Client ID o Client Secret son incorrectos.

**Solución**:
1. Verifica que `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` en Vercel coincidan con los de Google Cloud Console
2. No debe haber espacios extra al inicio o final
3. Redeploy en Vercel después de actualizar

---

## 📚 Recursos

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Gmail API Documentation](https://developers.google.com/gmail/api)
- [Google Cloud Console](https://console.cloud.google.com/)

---

## ✅ Checklist Final

- [ ] Gmail API habilitada
- [ ] OAuth Consent Screen configurado
- [ ] OAuth Client ID creado
- [ ] JavaScript origins configuradas (localhost + Vercel)
- [ ] Redirect URIs configuradas (localhost + Vercel)
- [ ] Test users agregados (si está en Testing)
- [ ] Variables de entorno configuradas en Vercel
- [ ] Autenticación probada en local
- [ ] Autenticación probada en producción

---

**¡Configuración completada!** 🎉
