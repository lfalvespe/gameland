import admin from 'firebase-admin';
admin.initializeApp();
const db = admin.firestore();
db.collection('test').doc('test').set({ test: true }).then(() => console.log('success')).catch(e => console.error(e));
