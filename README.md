<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1GIJBjciX20cFpLqJ70Y9W13BpAYTSFXf

## Run Locally

**Prerequisites:**  Node.js 18+

1. **Instalar dependencias**:
   ```bash
   npm install
   ```

2. **Configurar variables de entorno**:
   - Copia el archivo `.env.local.example` a `.env.local`
   - Todas las credenciales ya están configuradas y listas para usar
   - El archivo `.env.local` incluye:
     - ✅ **GEMINI_API_KEY**: API key de Gemini AI (ya configurada)
     - ✅ **GOOGLE_CLIENT_ID**: ID de cliente OAuth de Google (ya configurado)
     - ✅ **GOOGLE_CLIENT_SECRET**: Secret de cliente OAuth de Google (ya configurado)
     - ✅ **FIREBASE_PROJECT_ID**: ID de tu proyecto Firebase
     - ✅ **FIREBASE_CLIENT_EMAIL**: Email de la service account
     - ✅ **FIREBASE_PRIVATE_KEY**: Private key de la service account
     - ✅ **SESSION_SECRET**: Secreto para sesiones (ya configurado)

3. **Ejecutar la aplicación**:
   ```bash
   npm start
   ```
   Este comando inicia automáticamente:
   - 🔵 **Backend** (Express) en `http://localhost:4000`
   - 🟢 **Frontend** (Vite) en `http://localhost:3000`

4. **Acceder a la aplicación**:
   - Abre tu navegador en `http://localhost:3000`
   - Haz clic en "Conectar Gmail" para autenticarte
   - ¡Listo! Ya puedes usar la aplicación

### Comandos disponibles

- `npm start` - Ejecuta frontend y backend simultáneamente (recomendado)
- `npm run dev` - Solo frontend en puerto 3000
- `npm run server` - Solo backend en puerto 4000
- `npm run build` - Construye la aplicación para producción
- `npm run preview` - Vista previa de la build de producción

## Características de la Aplicación

### 🔐 Sistema Multi-Usuario con Firebase

Esta aplicación utiliza Gmail API para autenticación y envío de correos a través de un backend Node/Express con **Firebase Firestore**.

#### ✨ Funcionalidades principales:

- 📧 **Envío de correos**: Integración completa con Gmail API
- 👥 **Multi-usuario**: Cada usuario tiene sus propias bases de datos, plantillas e historial
- 🔒 **Seguridad**: acceso autenticado y cookies de sesión JWT
- 🤖 **IA Integrada**: Generación de contenido con Gemini AI
- 📊 **Gestión de contactos**: Organiza funcionarios y destinatarios
- 📝 **Plantillas personalizadas**: Crea y guarda plantillas de correos
- 📎 **Adjuntos**: Soporte para archivos adjuntos
- 📈 **Historial**: Seguimiento de correos enviados

### 🔧 Configuración (Ya lista para usar)

Todas las credenciales y configuraciones ya están incluidas en el archivo `.env.local`:

- ✅ **Firebase**: Firestore listo y configurado
- ✅ **Google OAuth**: Autenticación configurada con Gmail API
- ✅ **Gemini AI**: API key configurada para generación de contenido
- ✅ **Sesiones**: Configuración de seguridad lista

### 📚 Información Adicional

#### Primer inicio de sesión:
1. Abre `http://localhost:3000`
2. Haz clic en "Conectar Gmail"
3. Autentica con tu cuenta de Google
4. Tu perfil de usuario se crea automáticamente en Firebase
5. Los datos de localStorage se migran a tu cuenta (solo una vez)

#### Arquitectura:
- **Frontend**: React + TypeScript + Vite
- **Backend**: Serverless Functions en Vercel (`/api/*`)
- **Base de datos**: Firebase Firestore
- **APIs**: Gmail API + Gemini AI
- **Autenticación**: Google OAuth 2.0
- **Hosting**: Vercel

---

## 🌐 Deployment en Vercel

### URL de Produccion
**https://tu-app.vercel.app**

### Deployment

1. Conecta el repositorio en Vercel.
2. En **Project Settings -> Environment Variables** configura las variables (ver abajo).
3. Deploy en `main` (automatico) o con CLI:
   ```bash
   vercel --prod
   ```

### Configuracion Requerida en Vercel

En Vercel -> **Project Settings -> Environment Variables**, agrega:

- `GEMINI_API_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI` = `https://tu-app.vercel.app/api/auth/google/callback`
- `APP_BASE_URL` = `https://tu-app.vercel.app`
- `SESSION_SECRET`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `NODE_ENV` = `production`

Ver `VERCEL_SETUP.md` para instrucciones detalladas.

### Verificar Deployment

```bash
# Health check
curl https://tu-app.vercel.app/api/health
# Debe retornar: {"ok":true}
```
