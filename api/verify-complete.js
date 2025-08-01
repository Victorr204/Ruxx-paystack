import { Client, Account } from 'appwrite';

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT) 
  .setProject(process.env.APPWRITE_PROJECT_ID);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).send('Method Not Allowed');
  }

  const { userId, secret } = req.query;

  if (!userId || !secret) {
    res.setHeader('Content-Type', 'text/html');
    return res.status(400).send(`
      <html>
        <body style="text-align:center; padding-top:50px;">
          <h1>❌ Verification Failed</h1>
          <p>⚠️ Missing verification details. The link may be invalid or expired.</p>
        </body>
      </html>
    `);
  }

  try {
    const account = new Account(client);
    await account.updateVerification(userId, secret);

    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(`
      <html>
        <body style="text-align:center; padding-top:50px;">
          <h1>✅ Verification Complete</h1>
          <p>Your email address has been verified successfully. You can now return to the app and log in.</p>
        </body>
      </html>
    `);
  } catch (error) {
    res.setHeader('Content-Type', 'text/html');
    return res.status(400).send(`
      <html>
        <body style="text-align:center; padding-top:50px;">
          <h1>❌ Verification Failed</h1>
          <p>⚠️ Reason: ${error.message}</p>
        </body>
      </html>
    `);
  }
}
