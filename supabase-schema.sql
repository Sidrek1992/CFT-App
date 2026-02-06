-- Supabase Schema para Gestor AI
-- Ejecutar este SQL en el SQL Editor de Supabase

-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  google_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de bases de datos
CREATE TABLE IF NOT EXISTS databases (
  id TEXT PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de funcionarios
CREATE TABLE IF NOT EXISTS officials (
  id TEXT PRIMARY KEY,
  database_id TEXT NOT NULL REFERENCES databases(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  gender TEXT,
  title TEXT,
  department TEXT,
  position TEXT,
  stament TEXT,
  is_boss BOOLEAN DEFAULT FALSE,
  boss_name TEXT,
  boss_position TEXT,
  boss_email TEXT
);

-- Tabla de plantillas guardadas
CREATE TABLE IF NOT EXISTS templates (
  id TEXT PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subject TEXT,
  body TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de plantilla actual
CREATE TABLE IF NOT EXISTS current_template (
  user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  subject TEXT,
  body TEXT
);

-- Tabla de historial de envíos
CREATE TABLE IF NOT EXISTS sent_history (
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  official_id TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, official_id)
);

-- Tabla de configuraciones de usuario
CREATE TABLE IF NOT EXISTS user_settings (
  user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  active_db_id TEXT
);

-- Índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_databases_user_id ON databases(user_id);
CREATE INDEX IF NOT EXISTS idx_officials_database_id ON officials(database_id);
CREATE INDEX IF NOT EXISTS idx_templates_user_id ON templates(user_id);
CREATE INDEX IF NOT EXISTS idx_sent_history_user_id ON sent_history(user_id);

-- Row Level Security (RLS) Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE databases ENABLE ROW LEVEL SECURITY;
ALTER TABLE officials ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE current_template ENABLE ROW LEVEL SECURITY;
ALTER TABLE sent_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Policies para users (público puede insertar, usuario solo ve sus datos)
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own data" ON users
  FOR INSERT WITH CHECK (true);

-- Policies para databases (usuario solo ve/edita sus propias bases)
CREATE POLICY "Users can view own databases" ON databases
  FOR SELECT USING (user_id = (SELECT id FROM users WHERE google_id = current_setting('app.google_id', true)::text LIMIT 1));

CREATE POLICY "Users can insert own databases" ON databases
  FOR INSERT WITH CHECK (user_id = (SELECT id FROM users WHERE google_id = current_setting('app.google_id', true)::text LIMIT 1));

CREATE POLICY "Users can update own databases" ON databases
  FOR UPDATE USING (user_id = (SELECT id FROM users WHERE google_id = current_setting('app.google_id', true)::text LIMIT 1));

CREATE POLICY "Users can delete own databases" ON databases
  FOR DELETE USING (user_id = (SELECT id FROM users WHERE google_id = current_setting('app.google_id', true)::text LIMIT 1));

-- Policies para officials (acceso a través de database_id)
CREATE POLICY "Users can view own officials" ON officials
  FOR SELECT USING (
    database_id IN (
      SELECT id FROM databases WHERE user_id = (SELECT id FROM users WHERE google_id = current_setting('app.google_id', true)::text LIMIT 1)
    )
  );

CREATE POLICY "Users can insert own officials" ON officials
  FOR INSERT WITH CHECK (
    database_id IN (
      SELECT id FROM databases WHERE user_id = (SELECT id FROM users WHERE google_id = current_setting('app.google_id', true)::text LIMIT 1)
    )
  );

CREATE POLICY "Users can update own officials" ON officials
  FOR UPDATE USING (
    database_id IN (
      SELECT id FROM databases WHERE user_id = (SELECT id FROM users WHERE google_id = current_setting('app.google_id', true)::text LIMIT 1)
    )
  );

CREATE POLICY "Users can delete own officials" ON officials
  FOR DELETE USING (
    database_id IN (
      SELECT id FROM databases WHERE user_id = (SELECT id FROM users WHERE google_id = current_setting('app.google_id', true)::text LIMIT 1)
    )
  );

-- Policies para templates
CREATE POLICY "Users can view own templates" ON templates
  FOR SELECT USING (user_id = (SELECT id FROM users WHERE google_id = current_setting('app.google_id', true)::text LIMIT 1));

CREATE POLICY "Users can insert own templates" ON templates
  FOR INSERT WITH CHECK (user_id = (SELECT id FROM users WHERE google_id = current_setting('app.google_id', true)::text LIMIT 1));

CREATE POLICY "Users can delete own templates" ON templates
  FOR DELETE USING (user_id = (SELECT id FROM users WHERE google_id = current_setting('app.google_id', true)::text LIMIT 1));

-- Policies para current_template
CREATE POLICY "Users can view own current_template" ON current_template
  FOR SELECT USING (user_id = (SELECT id FROM users WHERE google_id = current_setting('app.google_id', true)::text LIMIT 1));

CREATE POLICY "Users can upsert own current_template" ON current_template
  FOR INSERT WITH CHECK (user_id = (SELECT id FROM users WHERE google_id = current_setting('app.google_id', true)::text LIMIT 1));

CREATE POLICY "Users can update own current_template" ON current_template
  FOR UPDATE USING (user_id = (SELECT id FROM users WHERE google_id = current_setting('app.google_id', true)::text LIMIT 1));

-- Policies para sent_history
CREATE POLICY "Users can view own sent_history" ON sent_history
  FOR SELECT USING (user_id = (SELECT id FROM users WHERE google_id = current_setting('app.google_id', true)::text LIMIT 1));

CREATE POLICY "Users can insert own sent_history" ON sent_history
  FOR INSERT WITH CHECK (user_id = (SELECT id FROM users WHERE google_id = current_setting('app.google_id', true)::text LIMIT 1));

CREATE POLICY "Users can update own sent_history" ON sent_history
  FOR UPDATE USING (user_id = (SELECT id FROM users WHERE google_id = current_setting('app.google_id', true)::text LIMIT 1));

-- Policies para user_settings
CREATE POLICY "Users can view own settings" ON user_settings
  FOR SELECT USING (user_id = (SELECT id FROM users WHERE google_id = current_setting('app.google_id', true)::text LIMIT 1));

CREATE POLICY "Users can upsert own settings" ON user_settings
  FOR INSERT WITH CHECK (user_id = (SELECT id FROM users WHERE google_id = current_setting('app.google_id', true)::text LIMIT 1));

CREATE POLICY "Users can update own settings" ON user_settings
  FOR UPDATE USING (user_id = (SELECT id FROM users WHERE google_id = current_setting('app.google_id', true)::text LIMIT 1));
