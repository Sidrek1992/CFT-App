# 🚀 Guía Rápida - CFT Correos

## Ejecutar la aplicación en 3 pasos

### 1️⃣ Instalar dependencias
```bash
npm install
```

### 2️⃣ Iniciar la aplicación
```bash
npm start
```

Esto iniciará automáticamente:
- 🔵 **Backend** en `http://localhost:4000`
- 🟢 **Frontend** en `http://localhost:3000`

### 3️⃣ Abrir en el navegador
```
http://localhost:3000
```

---

## ✅ Todo está listo

✨ **No necesitas configurar nada más**. Todas las credenciales ya están incluidas en `.env.local`:

- ✅ Gemini API (IA)
- ✅ Google OAuth (Gmail)
- ✅ Supabase (Base de datos)
- ✅ Sesiones seguras

---

## 🔐 Primer uso

1. Abre `http://localhost:3000`
2. Haz clic en **"Conectar Gmail"**
3. Autoriza con tu cuenta de Google
4. ¡Ya puedes usar la aplicación!

---

## 📚 Comandos útiles

| Comando | Descripción |
|---------|-------------|
| `npm start` | Inicia frontend + backend |
| `npm run dev` | Solo frontend (puerto 3000) |
| `npm run server` | Solo backend (puerto 4000) |
| `npm run build` | Compila para producción |

---

## 🆘 ¿Problemas?

### El puerto 3000 o 4000 está ocupado

```bash
# Encuentra el proceso
lsof -i :3000
lsof -i :4000

# Detén el proceso
kill -9 [PID]
```

### Error de autenticación con Google

Verifica que en Google Cloud Console:
- La aplicación OAuth esté en modo **Testing** o **Production**
- Tu email esté agregado como **Test User** (si está en Testing)
- Los redirect URIs incluyan: `http://localhost:4000/api/auth/google/callback`

### Error de conexión con Supabase

Las credenciales de Supabase ya están configuradas. Si hay problemas:
1. Verifica tu conexión a internet
2. Revisa que el archivo `.env.local` esté presente

---

## 🌐 URL de la aplicación en Vercel

**Producción**: https://myappcftcorreo.vercel.app/

---

## 📧 Funcionalidades principales

- 📬 Envío masivo de correos personalizados
- 🤖 Generación de contenido con IA (Gemini)
- 👥 Gestión de contactos y funcionarios
- 📝 Plantillas de correo reutilizables
- 📎 Soporte para archivos adjuntos
- 📊 Historial de correos enviados
- 🔐 Autenticación segura con Google

---

**¡Disfruta usando CFT Correos!** 🎉
