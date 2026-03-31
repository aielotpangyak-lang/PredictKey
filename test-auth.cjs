const { GoogleAuth } = require('google-auth-library');

async function main() {
  const auth = new GoogleAuth({
    scopes: 'https://www.googleapis.com/auth/cloud-platform'
  });
  const client = await auth.getClient();
  const projectId = await auth.getProjectId();
  console.log('Project ID:', projectId);
  
  // Try to get service account email
  try {
    const credentials = await auth.getCredentials();
    console.log('Credentials:', credentials);
  } catch (e) {
    console.log('Error getting credentials:', e.message);
  }
}

main().catch(console.error);
