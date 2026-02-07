# 🔧 Troubleshooting - CFT Correos

## ❌ Error 500 después de Login con Google

### Síntoma
Después de autorizar con Google, recibes:
```
Esta página no funciona
localhost no puede procesar esta solicitud en este momento.
HTTP ERROR 500
```

### ✅ Solución Aplicada

He corregido el código para:
1. **Usar `await` correctamente** en `getOrCreateUser()`
2. **Guardar la sesión explícitamente** antes de redirigir
3. **Agregar logging detallado** para debugging
4. **Validar que el usuario se creó correctamente**

---

## 🔍 Cómo Diagnosticar Problemas

### 1. Revisar Logs del Servidor

El servidor ahora imprime logs detallados:

```bash
# Iniciar servidor en una terminal
npm run server
```

Busca mensajes como:
- ✅ `OAuth callback: Getting tokens...`
- ✅ `OAuth callback: Getting user info...`
- ✅ `OAuth callback: Creating/getting user from database...`
- ✅ `OAuth callback: User retrieved: [ID]`
- ✅ `OAuth callback: Saving session...`
- ✅ `Session saved successfully`
- ✅ `OAuth callback: Redirecting to app...`

Si ves un error, te mostrará exactamente dónde falló.

---

## 🛠️ Problemas Comunes y Soluciones

### Error: "Failed to create or retrieve user"

**Causa:** Problema con Firebase

**Solución:**
1. Verifica que las credenciales de Firebase estén correctas en `.env.local`:
   ```bash
   FIREBASE_PROJECT_ID=https://jfrrvxefpboginppevrb.firebase.co
   FIREBASE_CLIENT_EMAIL=eyJhbGci...
   ```

2. Verifica que las tablas existan en Firebase:
   ```bash
   # Ve a Firebase Dashboard → SQL Editor
   # Ejecuta: firebase-schema.sql
   ```

3. Verifica la conexión:
   ```bash
   curl -H "apikey: TU_FIREBASE_CLIENT_EMAIL" \
        "https://jfrrvxefpboginppevrb.firebase.co/rest/v1/users"
   ```

---

### Error: "Session save error"

**Causa:** Problema con express-session

**Solución:**
1. Reinicia el servidor:
   ```bash
   pkill -f "node server/index.js"
   npm run server
   ```

2. Verifica que `SESSION_SECRET` esté configurado en `.env.local`

3. Limpia las cookies del navegador:
   - Chrome/Edge: F12 → Application → Cookies → localhost
   - Firefox: F12 → Storage → Cookies → localhost
   - Elimina todas las cookies de localhost

---

### Error: "redirect_uri_mismatch"

**Causa:** La URL de callback no coincide

**Solución:**
1. Verifica en Google Cloud Console que tengas:
   ```
   http://localhost:4000/api/auth/google/callback
   ```

2. Verifica en `.env.local`:
   ```
   GOOGLE_REDIRECT_URI=http://localhost:4000/api/auth/google/callback
   ```

3. Deben ser EXACTAMENTE iguales

---

### Error: "invalid_client"

**Causa:** Credenciales de Google incorrectas

**Solución:**
1. Verifica en `.env.local`:
   ```
   GOOGLE_CLIENT_ID=105444466970-...apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=GOCSPX-...
   ```

2. Ve a Google Cloud Console → Credentials
3. Copia nuevamente el Client ID y Client Secret
4. Pégalos en `.env.local`
5. Reinicia el servidor

---

### Sesión no persiste / Se pierde después de login

**Causa:** Problema con cookies

**Solución:**

1. **Limpia todas las cookies:**
   - F12 → Application/Storage → Cookies
   - Elimina todas las cookies de localhost

2. **Verifica la configuración de sesiones:**
   El archivo `server/index.js` debe tener:
   ```javascript
   session({
     secret: SESSION_SECRET,
     resave: false,
     saveUninitialized: false,
     cookie: {
       httpOnly: true,
       sameSite: 'lax',
       secure: false,  // false para localhost
     },
   })
   ```

3. **Verifica que las cookies se estén enviando:**
   - F12 → Network
   - Haz login
   - Mira la request a `/api/auth/status`
   - Debe incluir header `Cookie: connect.sid=...`

---

## 🧪 Probar Paso a Paso

### 1. Verificar que el servidor esté corriendo
```bash
curl http://localhost:4000/api/health
# Debe devolver: {"ok":true}
```

### 2. Verificar estado de autenticación
```bash
curl http://localhost:4000/api/auth/status
# Debe devolver: {"authenticated":false,"userId":null,"email":"","name":""}
```

### 3. Probar OAuth flow

1. **Inicia el servidor:**
   ```bash
   npm run server
   ```

2. **En otra terminal, inicia el frontend:**
   ```bash
   npm run dev
   ```

3. **Abre el navegador:**
   ```
   http://localhost:3000
   ```

4. **Abre la consola del navegador (F12)**

5. **Abre Network tab**

6. **Click en "Conectar Gmail"**

7. **Observa las requests:**
   - ✅ GET `/api/auth/google` → Redirect a Google
   - ✅ Autorizas en Google
   - ✅ GET `/api/auth/google/callback?code=...` → Redirect a app
   - ✅ GET `/?gmail=connected`
   - ✅ GET `/api/auth/status` → Debe devolver `authenticated: true`

---

## 📊 Verificar Base de Datos

### Conectarse a Firebase

1. Ve a: https://firebase.com/dashboard
2. Selecciona tu proyecto
3. Ve a **Table Editor** → **users**
4. Deberías ver tu usuario después de hacer login

### Query Manual

```sql
-- Ver todos los usuarios
SELECT * FROM users;

-- Ver un usuario específico
SELECT * FROM users WHERE email = 'tu@email.com';

-- Ver bases de datos de un usuario
SELECT * FROM databases WHERE user_id = 1;
```

---

## 🔄 Reiniciar Todo

Si nada funciona, reinicia completamente:

```bash
# 1. Detener todos los procesos
pkill -f "node server/index.js"
pkill -f "vite"

# 2. Limpiar caché
rm -rf node_modules/.vite
rm -rf dist

# 3. Reinstalar dependencias
npm install

# 4. Reiniciar servidor
npm run server

# 5. En otra terminal, reiniciar frontend
npm run dev

# 6. Limpiar cookies del navegador
# F12 → Application → Clear storage → Clear site data

# 7. Volver a intentar login
```

---

## 📝 Logs Útiles

### Ver logs del servidor
```bash
# Terminal donde corre el servidor
npm run server

# Verás logs como:
# OAuth callback: Getting tokens...
# OAuth callback: Getting user info...
# etc.
```

### Ver logs del frontend
- F12 → Console
- Busca errores en rojo

### Ver requests HTTP
- F12 → Network
- Filtra por "Fetch/XHR"
- Mira status codes y responses

---

## ✅ Checklist de Verificación

Antes de hacer login, verifica:

- [ ] Servidor corriendo en puerto 4000
- [ ] Frontend corriendo en puerto 3000
- [ ] Health check funciona: `http://localhost:4000/api/health`
- [ ] Variables de entorno en `.env.local` correctas
- [ ] Google OAuth URIs configurados correctamente
- [ ] Cookies del navegador limpias
- [ ] Tablas de Firebase creadas

---

## 🆘 Si Nada Funciona

1. **Revisa los logs del servidor** (terminal donde corre `npm run server`)
2. **Revisa la consola del navegador** (F12 → Console)
3. **Revisa Network tab** (F12 → Network)
4. **Copia el error completo** que ves
5. **Busca en los logs** qué paso falló exactamente

El servidor ahora imprime logs muy detallados que te dirán exactamente dónde está el problema.

---

## 📞 Información de Debug

Si necesitas más ayuda, proporciona:
1. **Logs del servidor** (lo que imprime `npm run server`)
2. **Mensaje de error completo** del navegador
3. **Screenshot del Network tab** (F12 → Network)
4. **Configuración de `.env.local`** (sin exponer secrets)

---

**¡El error 500 ya está corregido!** El código ahora maneja correctamente las sesiones y la creación de usuarios. 🎉
