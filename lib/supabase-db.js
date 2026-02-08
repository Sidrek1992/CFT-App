import { getSupabaseAdmin } from './supabase-admin.js';

const nowMs = () => Date.now();

const run = async (query) => {
  const { data, error } = await query;
  if (error) throw error;
  return data;
};

const maybeSingle = async (query) => {
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data;
};

const mapOfficialIn = (official, databaseId) => ({
  id: String(official.id),
  database_id: String(databaseId),
  name: official.name,
  email: official.email,
  gender: official.gender,
  title: official.title,
  department: official.department || '',
  position: official.position || '',
  stament: official.stament || '',
  is_boss: Boolean(official.isBoss),
  boss_name: official.bossName || '',
  boss_position: official.bossPosition || '',
  boss_email: official.bossEmail || '',
});

export async function getOrCreateUser(googleId, email, name) {
  const supabase = getSupabaseAdmin();
  const googleIdStr = String(googleId);

  const existing = await maybeSingle(
    supabase
      .from('users')
      .select('*')
      .eq('google_id', googleIdStr)
  );

  if (!existing) {
    const inserted = await run(
      supabase
        .from('users')
        .insert({
          google_id: googleIdStr,
          email: email || '',
          name: name || '',
          created_at: nowMs(),
        })
        .select('*')
        .single()
    );
    return inserted;
  }

  if (existing.email !== (email || '') || existing.name !== (name || '')) {
    await run(
      supabase
        .from('users')
        .update({
          email: email || '',
          name: name || '',
          updated_at: nowMs(),
        })
        .eq('id', existing.id)
    );
    return { ...existing, email: email || '', name: name || '' };
  }

  return existing;
}

export async function getUserDatabases(userId) {
  const supabase = getSupabaseAdmin();
  return run(
    supabase
      .from('databases')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
  );
}

export async function createDatabase(userId, dbId, name) {
  const supabase = getSupabaseAdmin();
  await run(
    supabase.from('databases').insert({
      id: String(dbId),
      user_id: userId,
      name,
      created_at: nowMs(),
    })
  );
}

export async function updateDatabase(dbId, name) {
  const supabase = getSupabaseAdmin();
  await run(
    supabase
      .from('databases')
      .update({ name, updated_at: nowMs() })
      .eq('id', String(dbId))
  );
}

export async function deleteDatabase(dbId) {
  const supabase = getSupabaseAdmin();
  const id = String(dbId);

  const officials = await run(
    supabase.from('officials').select('id').eq('database_id', id)
  );

  const officialIds = officials.map((row) => row.id).filter(Boolean);
  if (officialIds.length > 0) {
    await run(
      supabase.from('sent_history').delete().in('official_id', officialIds)
    );
  }

  await run(supabase.from('officials').delete().eq('database_id', id));
  await run(supabase.from('databases').delete().eq('id', id));
}

export async function getOfficials(databaseId) {
  const supabase = getSupabaseAdmin();
  return run(supabase.from('officials').select('*').eq('database_id', String(databaseId)));
}

export async function createOfficial(official, databaseId) {
  const supabase = getSupabaseAdmin();
  await run(supabase.from('officials').insert(mapOfficialIn(official, databaseId)));
}

export async function updateOfficial(official) {
  const supabase = getSupabaseAdmin();
  await run(
    supabase
      .from('officials')
      .update({
        name: official.name,
        email: official.email,
        gender: official.gender,
        title: official.title,
        department: official.department || '',
        position: official.position || '',
        stament: official.stament || '',
        is_boss: Boolean(official.isBoss),
        boss_name: official.bossName || '',
        boss_position: official.bossPosition || '',
        boss_email: official.bossEmail || '',
        updated_at: nowMs(),
      })
      .eq('id', String(official.id))
  );
}

export async function deleteOfficial(officialId) {
  const supabase = getSupabaseAdmin();
  const id = String(officialId);
  await run(supabase.from('sent_history').delete().eq('official_id', id));
  await run(supabase.from('officials').delete().eq('id', id));
}

export async function getSavedTemplates(userId) {
  const supabase = getSupabaseAdmin();
  return run(
    supabase
      .from('templates')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
  );
}

export async function createTemplate(userId, template) {
  const supabase = getSupabaseAdmin();
  await run(
    supabase.from('templates').insert({
      id: String(template.id),
      user_id: userId,
      name: template.name,
      subject: template.subject,
      body: template.body,
      created_at: Number(template.createdAt) || nowMs(),
    })
  );
}

export async function deleteTemplate(templateId) {
  const supabase = getSupabaseAdmin();
  await run(supabase.from('templates').delete().eq('id', String(templateId)));
}

export async function getCurrentTemplate(userId) {
  const supabase = getSupabaseAdmin();
  return maybeSingle(supabase.from('current_template').select('*').eq('user_id', userId));
}

export async function saveCurrentTemplate(userId, subject, body) {
  const supabase = getSupabaseAdmin();
  await run(
    supabase.from('current_template').upsert(
      {
        user_id: userId,
        subject: subject || '',
        body: body || '',
        updated_at: nowMs(),
      },
      { onConflict: 'user_id' }
    )
  );
}

export async function getSentHistory(userId) {
  const supabase = getSupabaseAdmin();
  const rows = await run(
    supabase
      .from('sent_history')
      .select('official_id')
      .eq('user_id', userId)
  );
  return rows.map((row) => row.official_id).filter(Boolean);
}

export async function markAsSent(userId, officialId) {
  const supabase = getSupabaseAdmin();
  await run(
    supabase.from('sent_history').upsert(
      {
        user_id: userId,
        official_id: String(officialId),
        sent_at: nowMs(),
      },
      { onConflict: 'user_id,official_id' }
    )
  );
}

export async function getUserSettings(userId) {
  const supabase = getSupabaseAdmin();
  return maybeSingle(supabase.from('user_settings').select('*').eq('user_id', userId));
}

export async function saveUserSettings(userId, activeDbId) {
  const supabase = getSupabaseAdmin();
  await run(
    supabase.from('user_settings').upsert(
      {
        user_id: userId,
        active_db_id: activeDbId || null,
        updated_at: nowMs(),
      },
      { onConflict: 'user_id' }
    )
  );
}

export async function isDatabaseOwnedByUser(userId, databaseId) {
  const supabase = getSupabaseAdmin();
  const row = await maybeSingle(
    supabase
      .from('databases')
      .select('id')
      .eq('id', String(databaseId))
      .eq('user_id', userId)
  );
  return Boolean(row?.id);
}

export async function isOfficialOwnedByUser(userId, officialId) {
  const supabase = getSupabaseAdmin();
  const official = await maybeSingle(
    supabase
      .from('officials')
      .select('id,database_id')
      .eq('id', String(officialId))
  );

  if (!official?.database_id) return false;
  return isDatabaseOwnedByUser(userId, official.database_id);
}

export async function isTemplateOwnedByUser(userId, templateId) {
  const supabase = getSupabaseAdmin();
  const row = await maybeSingle(
    supabase
      .from('templates')
      .select('id')
      .eq('id', String(templateId))
      .eq('user_id', userId)
  );
  return Boolean(row?.id);
}
