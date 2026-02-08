# 🔐 Actualizar Google OAuth para Hostinger

## ⚡ Configuración Rápida (3 minutos)

Tu aplicación en Hostinger está en: **https://goldenrod-cormorant-780503.hostingersite.com**

Necesitas actualizar Google Cloud Console para autorizar este dominio.

---

## 📋 Pasos

### 1️⃣ Acceder a Google Cloud Console

Ve a: **https://console.cloud.google.com/apis/credentials**

### 2️⃣ Seleccionar tu OAuth Client ID

1. Busca tu **OAuth 2.0 Client ID** en la lista
2. Haz clic en el nombre para editar
3. Si no tienes uno, crea uno nuevo:
   - Click en **+ CREATE CREDENTIALS** → **OAuth client ID**
   - Application type: **Web application**
   - Name: **CFT Correos**

### 3️⃣ Configurar URIs Autorizadas

#### Authorized JavaScript origins

Agrega estas 2 URLs:

```
http://localhost:3000
```

```
https://goldenrod-cormorant-780503.hostingersite.com
```

#### Authorized redirect URIs

Agrega estas 2 URLs:

```
http://localhost:4000/api/auth/google/callback
```

```
https://goldenrod-cormorant-780503.hostingersite.com/api/auth/google/callback
```

⚠️ **IMPORTANTE**: Las URLs deben estar escritas EXACTAMENTE como se muestran arriba.

### 4️⃣ Guardar

1. Haz clic en **SAVE**
2. Espera 5 minutos para que los cambios se propaguen

---

## ✅ Verificar Configuración

### Captura de pantalla de lo que deberías ver:

**Authorized JavaScript origins:**
- ✅ http://localhost:3000
- ✅ https://goldenrod-cormorant-780503.hostingersite.com

**Authorized redirect URIs:**
- ✅ http://localhost:4000/api/auth/google/callback
- ✅ https://goldenrod-cormorant-780503.hostingersite.com/api/auth/google/callback

---

## 🧪 Probar Autenticación

### En Local:
1. `npm start`
2. Abre: http://localhost:3000
3. Click en "Conectar Gmail"
4. Autoriza con Google
5. ✅ Funciona!

### En producción (Hostinger):
1. Abre: https://goldenrod-cormorant-780503.hostingersite.com
2. Click en "Conectar Gmail"
3. Autoriza con Google
4. ✅ Funciona!

---

## ❌ Problemas Comunes

### Error: "redirect_uri_mismatch"

**Mensaje completo:**
```
Error: redirect_uri_mismatch
The redirect URI in the request, https://goldenrod-cormorant-780503.hostingersite.com/api/auth/google/callback, 
does not match the ones authorized for the OAuth client.
```

**Solución:**
1. Verifica que agregaste EXACTAMENTE:
   ```
   https://goldenrod-cormorant-780503.hostingersite.com/api/auth/google/callback
   ```
2. NO debe tener espacios extra, slash al final, o mayúsculas diferentes
3. Espera 5 minutos después de guardar
4. Limpia la caché del navegador (Ctrl+Shift+Del)
5. Vuelve a intentar

### Error: "Access blocked: This app's request is invalid"

**Causa:** Falta configurar OAuth Consent Screen

**Solución:**
1. Ve a: https://console.cloud.google.com/apis/credentials/consent
2. Completa la información:
   - App name: **CFT Correos**
   - User support email: tu email
   - Developer contact: tu email
3. En **Scopes**, agrega:
   - `https://www.googleapis.com/auth/gmail.send`
   - `https://www.googleapis.com/auth/userinfo.email`
   - `https://www.googleapis.com/auth/userinfo.profile`
4. Guarda

### Error: "This app isn't verified"

**Causa:** Tu app está en modo Testing y el usuario no está autorizado

**Solución:**
1. Ve a: https://console.cloud.google.com/apis/credentials/consent
2. Scroll hasta **Test users**
3. Click en **+ ADD USERS**
4. Agrega tu email y otros emails que necesiten acceso
5. Guarda

**Alternativa (para app pública):**
1. En OAuth consent screen, click **PUBLISH APP**
2. Sigue el proceso de verificación de Google
3. Nota: Esto puede tomar varios días

---

## 📝 Checklist Final

- [ ] OAuth Client ID creado o existente
- [ ] JavaScript origins agregados (localhost + Hostinger)
- [ ] Redirect URIs agregados (localhost + Hostinger)
- [ ] Cambios guardados
- [ ] Esperado 5 minutos
- [ ] OAuth Consent Screen configurado
- [ ] Test users agregados (si está en Testing)
- [ ] Autenticación probada en local
- [ ] Autenticación probada en Hostinger

---

## 🔑 Credenciales

Tus credenciales OAuth ya están en el proyecto:

```
GOOGLE_CLIENT_ID=105444466970-787jho21mvt0ehs2mbtmgioigu6m6ns9.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET
```

✅ Ya están configuradas en `.env.local` y en Hostinger

---

## 📞 Recursos

- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Gmail API Quickstart](https://developers.google.com/gmail/api/quickstart/nodejs)
- [OAuth Consent Screen Guide](https://support.google.com/cloud/answer/10311615)

---

**¡Configuración completada!** 🎉

Ahora tu app puede autenticar usuarios tanto en local como en Hostinger.
