import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY in environment variables');
}

// Cliente base (sin autenticación específica)
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Helper para crear cliente con contexto de usuario (para RLS)
export const getSupabaseWithUser = (googleId) => {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  // Set user context for RLS
  if (googleId) {
    client.rpc('set_config', {
      setting: 'app.google_id',
      value: googleId
    }).then(() => {}).catch(() => {});
  }
  return client;
};

export const getOrCreateUser = async (googleId, email, name) => {
  const { data: existing, error: selectError } = await supabase
    .from('users')
    .select('*')
    .eq('google_id', googleId)
    .single();

  if (existing) return existing;

  const { data: newUser, error: insertError } = await supabase
    .from('users')
    .insert({ google_id: googleId, email, name })
    .select()
    .single();

  if (insertError) throw insertError;
  return newUser;
};

export const getUserById = async (userId) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
};

export const getUserDatabases = async (userId) => {
  const { data, error } = await supabase
    .from('databases')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const createDatabase = async (userId, dbId, name) => {
  const { data, error } = await supabase
    .from('databases')
    .insert({ id: dbId, user_id: userId, name });

  if (error) throw error;
  return data;
};

export const updateDatabase = async (dbId, name) => {
  const { data, error } = await supabase
    .from('databases')
    .update({ name })
    .eq('id', dbId);

  if (error) throw error;
  return data;
};

export const deleteDatabase = async (dbId) => {
  const { data, error } = await supabase
    .from('databases')
    .delete()
    .eq('id', dbId);

  if (error) throw error;
  return data;
};

export const getOfficials = async (databaseId) => {
  const { data, error } = await supabase
    .from('officials')
    .select('*')
    .eq('database_id', databaseId);

  if (error) throw error;
  return data || [];
};

export const createOfficial = async (official, databaseId) => {
  const { data, error } = await supabase
    .from('officials')
    .insert({
      id: official.id,
      database_id: databaseId,
      name: official.name,
      email: official.email,
      gender: official.gender,
      title: official.title,
      department: official.department,
      position: official.position,
      stament: official.stament || '',
      is_boss: official.isBoss || false,
      boss_name: official.bossName || '',
      boss_position: official.bossPosition || '',
      boss_email: official.bossEmail || ''
    });

  if (error) throw error;
  return data;
};

export const updateOfficial = async (official) => {
  const { data, error } = await supabase
    .from('officials')
    .update({
      name: official.name,
      email: official.email,
      gender: official.gender,
      title: official.title,
      department: official.department,
      position: official.position,
      stament: official.stament || '',
      is_boss: official.isBoss || false,
      boss_name: official.bossName || '',
      boss_position: official.bossPosition || '',
      boss_email: official.bossEmail || ''
    })
    .eq('id', official.id);

  if (error) throw error;
  return data;
};

export const deleteOfficial = async (officialId) => {
  const { data, error } = await supabase
    .from('officials')
    .delete()
    .eq('id', officialId);

  if (error) throw error;
  return data;
};

export const getSavedTemplates = async (userId) => {
  const { data, error } = await supabase
    .from('templates')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const createTemplate = async (userId, template) => {
  const { data, error } = await supabase
    .from('templates')
    .insert({
      id: template.id,
      user_id: userId,
      name: template.name,
      subject: template.subject,
      body: template.body,
      created_at: new Date(template.createdAt).toISOString()
    });

  if (error) throw error;
  return data;
};

export const deleteTemplate = async (templateId) => {
  const { data, error } = await supabase
    .from('templates')
    .delete()
    .eq('id', templateId);

  if (error) throw error;
  return data;
};

export const getCurrentTemplate = async (userId) => {
  const { data, error } = await supabase
    .from('current_template')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
  return data;
};

export const saveCurrentTemplate = async (userId, subject, body) => {
  const { data, error } = await supabase
    .from('current_template')
    .upsert({ user_id: userId, subject, body }, { onConflict: 'user_id' });

  if (error) throw error;
  return data;
};

export const getSentHistory = async (userId) => {
  const { data, error } = await supabase
    .from('sent_history')
    .select('official_id')
    .eq('user_id', userId);

  if (error) throw error;
  return (data || []).map(row => row.official_id);
};

export const markAsSent = async (userId, officialId) => {
  const { data, error } = await supabase
    .from('sent_history')
    .upsert(
      { user_id: userId, official_id: officialId, sent_at: new Date().toISOString() },
      { onConflict: 'user_id,official_id' }
    );

  if (error) throw error;
  return data;
};

export const getUserSettings = async (userId) => {
  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
};

export const saveUserSettings = async (userId, activeDbId) => {
  const { data, error } = await supabase
    .from('user_settings')
    .upsert({ user_id: userId, active_db_id: activeDbId }, { onConflict: 'user_id' });

  if (error) throw error;
  return data;
};
