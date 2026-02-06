import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

let supabase = null;

function getSupabase() {
  if (!supabase) {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY');
    }
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return supabase;
}

export async function getOrCreateUser(googleId, email, name) {
  const db = getSupabase();
  
  const { data: existing } = await db
    .from('users')
    .select('*')
    .eq('google_id', googleId)
    .single();

  if (existing) return existing;

  const { data: newUser, error } = await db
    .from('users')
    .insert({ google_id: googleId, email, name })
    .select()
    .single();

  if (error) throw error;
  return newUser;
}

export async function getUserDatabases(userId) {
  const db = getSupabase();
  const { data, error } = await db
    .from('databases')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createDatabase(userId, dbId, name) {
  const db = getSupabase();
  const { error } = await db
    .from('databases')
    .insert({ id: dbId, user_id: userId, name });

  if (error) throw error;
}

export async function updateDatabase(dbId, name) {
  const db = getSupabase();
  const { error } = await db
    .from('databases')
    .update({ name })
    .eq('id', dbId);

  if (error) throw error;
}

export async function deleteDatabase(dbId) {
  const db = getSupabase();
  const { error } = await db
    .from('databases')
    .delete()
    .eq('id', dbId);

  if (error) throw error;
}

export async function getOfficials(databaseId) {
  const db = getSupabase();
  const { data, error } = await db
    .from('officials')
    .select('*')
    .eq('database_id', databaseId);

  if (error) throw error;
  return data || [];
}

export async function createOfficial(official, databaseId) {
  const db = getSupabase();
  const { error } = await db
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
}

export async function updateOfficial(official) {
  const db = getSupabase();
  const { error } = await db
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
}

export async function deleteOfficial(officialId) {
  const db = getSupabase();
  const { error } = await db
    .from('officials')
    .delete()
    .eq('id', officialId);

  if (error) throw error;
}

export async function getSavedTemplates(userId) {
  const db = getSupabase();
  const { data, error } = await db
    .from('templates')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createTemplate(userId, template) {
  const db = getSupabase();
  const { error } = await db
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
}

export async function deleteTemplate(templateId) {
  const db = getSupabase();
  const { error } = await db
    .from('templates')
    .delete()
    .eq('id', templateId);

  if (error) throw error;
}

export async function getCurrentTemplate(userId) {
  const db = getSupabase();
  const { data, error } = await db
    .from('current_template')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function saveCurrentTemplate(userId, subject, body) {
  const db = getSupabase();
  const { error } = await db
    .from('current_template')
    .upsert({ user_id: userId, subject, body }, { onConflict: 'user_id' });

  if (error) throw error;
}

export async function getSentHistory(userId) {
  const db = getSupabase();
  const { data, error } = await db
    .from('sent_history')
    .select('official_id')
    .eq('user_id', userId);

  if (error) throw error;
  return (data || []).map(row => row.official_id);
}

export async function markAsSent(userId, officialId) {
  const db = getSupabase();
  const { error } = await db
    .from('sent_history')
    .upsert(
      { user_id: userId, official_id: officialId, sent_at: new Date().toISOString() },
      { onConflict: 'user_id,official_id' }
    );

  if (error) throw error;
}

export async function getUserSettings(userId) {
  const db = getSupabase();
  const { data, error } = await db
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function saveUserSettings(userId, activeDbId) {
  const db = getSupabase();
  const { error } = await db
    .from('user_settings')
    .upsert({ user_id: userId, active_db_id: activeDbId }, { onConflict: 'user_id' });

  if (error) throw error;
}
