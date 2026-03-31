const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

initializeApp({ projectId: config.projectId });

const dbNamed = getFirestore(config.firestoreDatabaseId);
const dbDefault = getFirestore();

async function test() {
  try {
    await dbNamed.collection('users').limit(1).get();
    console.log('Named database works!');
  } catch (e) {
    console.error('Named database failed:', e.message);
  }
  
  try {
    await dbDefault.collection('users').limit(1).get();
    console.log('Default database works!');
  } catch (e) {
    console.error('Default database failed:', e.message);
  }
}

test();
