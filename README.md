<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1GIJBjciX20cFpLqJ70Y9W13BpAYTSFXf

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Gmail Integration & Multi-User System (Supabase)

This app uses Gmail API for authentication and email sending via a Node/Express backend with **Supabase (PostgreSQL)**.

### Setup

1. **Supabase**:
   - Create a project at https://supabase.com
   - Go to SQL Editor and run `supabase-schema.sql` (creates tables + RLS policies)
   - Get your **Project URL** and **anon public key** from Settings → API

2. **Google Cloud Console**:
   - Create a project and enable **Gmail API**
   - Configure **OAuth consent screen** (add test users if Testing mode)
   - Create **OAuth Client ID (Web)**:
     - Authorized JavaScript origins: `http://localhost:3000`
     - Authorized redirect URIs: `http://localhost:4000/api/auth/google/callback`

3. **Environment Variables** (`.env.local`):
   ```env
   GEMINI_API_KEY=your_gemini_api_key
   GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your_client_secret
   GOOGLE_REDIRECT_URI=http://localhost:4000/api/auth/google/callback
   APP_BASE_URL=http://localhost:3000
   SESSION_SECRET=random_long_string_here
   SUPABASE_URL=https://xxx.supabase.co
   SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Install & Run**:
   ```bash
   npm install
   npm run server   # Terminal 1 (backend on port 4000)
   npm run dev      # Terminal 2 (frontend on port 3000)
   ```

5. **First Login**:
   - Open `http://localhost:3000`
   - Click "Conectar Gmail" → authenticate with Google
   - Your user profile is created automatically in Supabase
   - Data from localStorage is migrated to your account (one-time)

### Multi-User Features

- Each user has their own databases, templates, and sent history
- Data is stored in **Supabase (PostgreSQL)** with Row Level Security
- Login required to access the app
- Gmail credentials are per-user session
- Scalable to hundreds of users
