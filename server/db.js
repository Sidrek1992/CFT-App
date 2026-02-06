import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.resolve(process.cwd(), 'data', 'app.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    google_id TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    name TEXT,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS databases (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS officials (
    id TEXT PRIMARY KEY,
    database_id TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    gender TEXT,
    title TEXT,
    department TEXT,
    position TEXT,
    stament TEXT,
    is_boss INTEGER DEFAULT 0,
    boss_name TEXT,
    boss_position TEXT,
    boss_email TEXT,
    FOREIGN KEY (database_id) REFERENCES databases(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS templates (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    subject TEXT,
    body TEXT,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS current_template (
    user_id INTEGER PRIMARY KEY,
    subject TEXT,
    body TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS sent_history (
    user_id INTEGER NOT NULL,
    official_id TEXT NOT NULL,
    sent_at INTEGER NOT NULL,
    PRIMARY KEY (user_id, official_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS user_settings (
    user_id INTEGER PRIMARY KEY,
    active_db_id TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

export const getOrCreateUser = (googleId, email, name) => {
  const existing = db.prepare('SELECT * FROM users WHERE google_id = ?').get(googleId);
  if (existing) return existing;

  const result = db.prepare(
    'INSERT INTO users (google_id, email, name, created_at) VALUES (?, ?, ?, ?)'
  ).run(googleId, email, name, Date.now());

  return db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
};

export const getUserById = (userId) => {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
};

export const getUserDatabases = (userId) => {
  return db.prepare('SELECT * FROM databases WHERE user_id = ? ORDER BY created_at DESC').all(userId);
};

export const createDatabase = (userId, dbId, name) => {
  return db.prepare(
    'INSERT INTO databases (id, user_id, name, created_at) VALUES (?, ?, ?, ?)'
  ).run(dbId, userId, name, Date.now());
};

export const updateDatabase = (dbId, name) => {
  return db.prepare('UPDATE databases SET name = ? WHERE id = ?').run(name, dbId);
};

export const deleteDatabase = (dbId) => {
  return db.prepare('DELETE FROM databases WHERE id = ?').run(dbId);
};

export const getOfficials = (databaseId) => {
  return db.prepare('SELECT * FROM officials WHERE database_id = ?').all(databaseId);
};

export const createOfficial = (official, databaseId) => {
  return db.prepare(`
    INSERT INTO officials (
      id, database_id, name, email, gender, title, department, position,
      stament, is_boss, boss_name, boss_position, boss_email
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    official.id,
    databaseId,
    official.name,
    official.email,
    official.gender,
    official.title,
    official.department,
    official.position,
    official.stament || '',
    official.isBoss ? 1 : 0,
    official.bossName || '',
    official.bossPosition || '',
    official.bossEmail || ''
  );
};

export const updateOfficial = (official) => {
  return db.prepare(`
    UPDATE officials SET
      name = ?, email = ?, gender = ?, title = ?, department = ?, position = ?,
      stament = ?, is_boss = ?, boss_name = ?, boss_position = ?, boss_email = ?
    WHERE id = ?
  `).run(
    official.name,
    official.email,
    official.gender,
    official.title,
    official.department,
    official.position,
    official.stament || '',
    official.isBoss ? 1 : 0,
    official.bossName || '',
    official.bossPosition || '',
    official.bossEmail || '',
    official.id
  );
};

export const deleteOfficial = (officialId) => {
  return db.prepare('DELETE FROM officials WHERE id = ?').run(officialId);
};

export const getSavedTemplates = (userId) => {
  return db.prepare('SELECT * FROM templates WHERE user_id = ? ORDER BY created_at DESC').all(userId);
};

export const createTemplate = (userId, template) => {
  return db.prepare(
    'INSERT INTO templates (id, user_id, name, subject, body, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(template.id, userId, template.name, template.subject, template.body, template.createdAt);
};

export const deleteTemplate = (templateId) => {
  return db.prepare('DELETE FROM templates WHERE id = ?').run(templateId);
};

export const getCurrentTemplate = (userId) => {
  return db.prepare('SELECT * FROM current_template WHERE user_id = ?').get(userId);
};

export const saveCurrentTemplate = (userId, subject, body) => {
  return db.prepare(`
    INSERT INTO current_template (user_id, subject, body) VALUES (?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET subject = ?, body = ?
  `).run(userId, subject, body, subject, body);
};

export const getSentHistory = (userId) => {
  return db.prepare('SELECT official_id FROM sent_history WHERE user_id = ?').all(userId)
    .map(row => row.official_id);
};

export const markAsSent = (userId, officialId) => {
  return db.prepare(`
    INSERT INTO sent_history (user_id, official_id, sent_at) VALUES (?, ?, ?)
    ON CONFLICT(user_id, official_id) DO UPDATE SET sent_at = ?
  `).run(userId, officialId, Date.now(), Date.now());
};

export const getUserSettings = (userId) => {
  return db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(userId);
};

export const saveUserSettings = (userId, activeDbId) => {
  return db.prepare(`
    INSERT INTO user_settings (user_id, active_db_id) VALUES (?, ?)
    ON CONFLICT(user_id) DO UPDATE SET active_db_id = ?
  `).run(userId, activeDbId, activeDbId);
};

export default db;
