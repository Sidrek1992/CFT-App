import { getFirebaseDb } from './firebase-admin.js';

const toData = (doc) => ({ id: doc.id, ...doc.data() });

const now = () => Date.now();

const deleteByQuery = async (query) => {
  const snapshot = await query.get();
  if (snapshot.empty) return;

  const db = getFirebaseDb();
  const docs = snapshot.docs;
  for (let i = 0; i < docs.length; i += 500) {
    const batch = db.batch();
    docs.slice(i, i + 500).forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }
};

export async function getOrCreateUser(googleId, email, name) {
  const db = getFirebaseDb();
  const userId = String(googleId);
  const ref = db.collection('users').doc(userId);
  const snap = await ref.get();

  if (!snap.exists) {
    const user = {
      google_id: userId,
      email: email || '',
      name: name || '',
      created_at: now(),
    };
    await ref.set(user);
    return { id: userId, ...user };
  }

  const current = snap.data() || {};
  if (current.email !== email || current.name !== name) {
    await ref.set(
      {
        email: email || '',
        name: name || '',
        updated_at: now(),
      },
      { merge: true }
    );
  }

  return toData(snap);
}

export async function getUserDatabases(userId) {
  const db = getFirebaseDb();
  const snapshot = await db.collection('databases').where('user_id', '==', userId).get();
  return snapshot.docs.map(toData).sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
}

export async function createDatabase(userId, dbId, name) {
  const db = getFirebaseDb();
  await db.collection('databases').doc(String(dbId)).set({
    user_id: userId,
    name,
    created_at: now(),
  });
}

export async function updateDatabase(dbId, name) {
  const db = getFirebaseDb();
  await db.collection('databases').doc(String(dbId)).set({ name, updated_at: now() }, { merge: true });
}

export async function deleteDatabase(dbId) {
  const db = getFirebaseDb();
  const id = String(dbId);
  await deleteByQuery(db.collection('officials').where('database_id', '==', id));
  await db.collection('databases').doc(id).delete();
}

export async function getOfficials(databaseId) {
  const db = getFirebaseDb();
  const snapshot = await db.collection('officials').where('database_id', '==', databaseId).get();
  return snapshot.docs.map(toData);
}

export async function createOfficial(official, databaseId) {
  const db = getFirebaseDb();
  await db.collection('officials').doc(String(official.id)).set({
    database_id: String(databaseId),
    name: official.name,
    email: official.email,
    gender: official.gender,
    title: official.title,
    department: official.department,
    position: official.position,
    stament: official.stament || '',
    is_boss: Boolean(official.isBoss),
    boss_name: official.bossName || '',
    boss_position: official.bossPosition || '',
    boss_email: official.bossEmail || '',
    created_at: now(),
  });
}

export async function updateOfficial(official) {
  const db = getFirebaseDb();
  await db.collection('officials').doc(String(official.id)).set(
    {
      name: official.name,
      email: official.email,
      gender: official.gender,
      title: official.title,
      department: official.department,
      position: official.position,
      stament: official.stament || '',
      is_boss: Boolean(official.isBoss),
      boss_name: official.bossName || '',
      boss_position: official.bossPosition || '',
      boss_email: official.bossEmail || '',
      updated_at: now(),
    },
    { merge: true }
  );
}

export async function deleteOfficial(officialId) {
  const db = getFirebaseDb();
  const id = String(officialId);
  await deleteByQuery(db.collection('sent_history').where('official_id', '==', id));
  await db.collection('officials').doc(id).delete();
}

export async function getSavedTemplates(userId) {
  const db = getFirebaseDb();
  const snapshot = await db.collection('templates').where('user_id', '==', userId).get();
  return snapshot.docs.map(toData).sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
}

export async function createTemplate(userId, template) {
  const db = getFirebaseDb();
  await db.collection('templates').doc(String(template.id)).set({
    user_id: userId,
    name: template.name,
    subject: template.subject,
    body: template.body,
    created_at: Number(template.createdAt) || now(),
  });
}

export async function deleteTemplate(templateId) {
  const db = getFirebaseDb();
  await db.collection('templates').doc(String(templateId)).delete();
}

export async function getCurrentTemplate(userId) {
  const db = getFirebaseDb();
  const snap = await db.collection('current_template').doc(String(userId)).get();
  if (!snap.exists) return null;
  return toData(snap);
}

export async function saveCurrentTemplate(userId, subject, body) {
  const db = getFirebaseDb();
  await db.collection('current_template').doc(String(userId)).set(
    {
      user_id: userId,
      subject: subject || '',
      body: body || '',
      updated_at: now(),
    },
    { merge: true }
  );
}

export async function getSentHistory(userId) {
  const db = getFirebaseDb();
  const snapshot = await db.collection('sent_history').where('user_id', '==', userId).get();
  return snapshot.docs.map((doc) => doc.data().official_id).filter(Boolean);
}

export async function markAsSent(userId, officialId) {
  const db = getFirebaseDb();
  const id = `${userId}__${officialId}`;
  await db.collection('sent_history').doc(id).set({
    user_id: userId,
    official_id: String(officialId),
    sent_at: now(),
  });
}

export async function getUserSettings(userId) {
  const db = getFirebaseDb();
  const snap = await db.collection('user_settings').doc(String(userId)).get();
  if (!snap.exists) return null;
  return toData(snap);
}

export async function saveUserSettings(userId, activeDbId) {
  const db = getFirebaseDb();
  await db.collection('user_settings').doc(String(userId)).set(
    {
      user_id: userId,
      active_db_id: activeDbId || null,
      updated_at: now(),
    },
    { merge: true }
  );
}
