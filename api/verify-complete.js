import { Client, Account } from 'appwrite';

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID);

const account = new Account(client);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { userId, secret } = req.query;

  if (!userId || !secret) {
    return res.status(400).send('Missing verification details');
  }

  try {
    await account.updateVerification(userId, secret);
    // ✅ Serve your success HTML here
    res.setHeader('Content-Type', 'text/html');
    res.send(`
      <html>
        <body style="text-align:center; padding-top:50px;">
          <h1>Email Verified 🎉</h1>
          <p>You may now return to the app and log in.</p>
        </body>
      </html>
    `);
  } catch (error) {
    res.status(400).send(`Verification failed: ${error.message}`);
  }
}
