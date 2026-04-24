import { initializeApp } from 'firebase/app';
import { getFirestore, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function test() {
  try {
    await updateDoc(doc(db, 'users', 'B7khydOOKhVKuRDOasGoUC608hJ3'), { online: false, lastSeen: serverTimestamp() });
    console.log('Update successful');
  } catch (e) {
    console.error('Update failed:', e);
  }
  process.exit(0);
}
test();
