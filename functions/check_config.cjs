const admin = require('firebase-admin/app');
const fstore = require('firebase-admin/firestore');

admin.initializeApp({ projectId: 'app-correo-cft' });
const db = fstore.getFirestore();

db.collection('databases').doc('shared_config').get()
    .then(snap => {
        if (!snap.exists) {
            console.log('shared_config: NO EXISTE en Firestore');
            return;
        }
        const data = snap.data();
        const saved = data.savedTemplates;
        console.log('shared_config: EXISTE en Firestore');
        if (!saved || saved.length === 0) {
            console.log('savedTemplates: VACIO (0 plantillas)');
        } else {
            console.log('savedTemplates: ' + saved.length + ' plantilla(s)');
            saved.forEach((t, i) => {
                console.log('  [' + (i + 1) + '] ' + t.name + ' | cat:' + t.category + ' | archivada:' + t.archived);
            });
        }
        const tmpl = data.template;
        console.log('template.subject: ' + (tmpl && tmpl.subject ? '"' + tmpl.subject + '"' : '(vacio)'));
    })
    .catch(e => { console.error('ERROR:', e.message); })
    .finally(() => process.exit(0));
