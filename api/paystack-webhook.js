const crypto = require('crypto');
const { Client, Databases, Query } = require('node-appwrite');

// Load env
const PAYSTACK_WEBHOOK_SECRET = process.env.PAYSTACK_SECRET_KEY;
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID;
const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT;
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
const USERS_COLLECTION = 'users';

module.exports = async (req, res) => {
  const rawBody = JSON.stringify(req.body);
  const signature = req.headers['x-paystack-signature'];

  const hash = crypto
    .createHmac('sha512', PAYSTACK_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');

  if (hash !== signature) {
    return res.status(401).send('Invalid signature');
  }

  const event = req.body;

  if (event.event === 'charge.success') {
    const customerCode = event.data.customer?.customer_code;
    const amount = event.data.amount / 100; // kobo to NGN

    if (!customerCode) return res.status(400).json({ message: 'Missing customer code' });

    // Appwrite setup
    const client = new Client()
      .setEndpoint(APPWRITE_ENDPOINT)
      .setProject(APPWRITE_PROJECT_ID)
      .setKey(APPWRITE_API_KEY);

    const databases = new Databases(client);

    try {
      // 1. Find user with matching customer_code
      const userDocs = await databases.listDocuments(
        DATABASE_ID,
        USERS_COLLECTION,
        [Query.equal('customer_code', customerCode)]
      );

      if (userDocs.total === 0) {
        return res.status(404).json({ message: 'User not found for this customer code' });
      }

      const userDoc = userDocs.documents[0];
      const currentBalance = userDoc.balance || 0;

      // 2. Update balance
      await databases.updateDocument(
        DATABASE_ID,
        USERS_COLLECTION,
        userDoc.$id,
        {
          balance: currentBalance + amount,
        }
      );

      return res.status(200).json({ message: 'Balance updated' });

    } catch (err) {
      console.error('Appwrite error:', err.message);
      return res.status(500).json({ error: 'Internal error updating balance' });
    }
  }

  return res.status(200).send('OK');
};
