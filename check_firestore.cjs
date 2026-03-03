const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

initializeApp({ projectId: 'app-correo-cft' });
const db = getFirestore();

db.collection('databases').doc('shared_config').get().then(snap => {
    if (!snap.exists) {
        console.log('RESULTADO: shared_config NO existe en Firestore');
        process.exit(0);
    }
    const data = snap.data();
    const saved = data.savedTemplates;
    console.log('RESULTADO: shared_config EXISTE en Firestore');
    if (!saved || saved.length === 0) {
        console.log('savedTemplates: VACIO (0 plantillas guardadas)');
    } else {
        console.log('savedTemplates: ' + saved.length + ' plantilla(s) guardadas');
        saved.forEach(function (t, i) {
            console.log('  [' + (i + 1) + '] "' + t.name + '" | categoria: ' + (t.category || 'N/A') + ' | archivada: ' + t.archived + ' | id: ' + t.id);
        });
    }
    var tmpl = data.template;
    if (tmpl) {
        console.log('\nPlantilla activa guardada:');
        console.log('  Asunto: "' + (tmpl.subject || '(vacío)') + '"');
        console.log('  Cuerpo: ' + (tmpl.body ? tmpl.body.length + ' caracteres' : '(vacío)'));
    } else {
        console.log('\nPlantilla activa: NO guardada en shared_config');
    }
    process.exit(0);
}).catch(function (err) {
    console.error('ERROR al conectar Firestore:', err.message);
    process.exit(1);
});
