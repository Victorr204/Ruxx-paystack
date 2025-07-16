// File: /api/paystack-webhook.js
import { Client, Databases, ID, Query } from 'node-appwrite';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Only POST allowed');

  const secret = req.headers['x-paystack-signature'];
  const rawBody = await buffer(req);
  const crypto = require('crypto');

  const hash = crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY).update(rawBody).digest('hex');
  if (hash !== secret) {
    return res.status(401).send('Unauthorized');
  }

  const event = JSON.parse(rawBody.toString());

  if (event.event === 'charge.success') {
    const data = event.data;
    const userId = data.metadata?.userId;
    const amount = data.amount / 100;

    if (!userId) return res.status(400).json({ message: 'Missing userId in metadata' });

    // Update Appwrite wallet
    const client = new Client()
      .setEndpoint(process.env.APPWRITE_ENDPOINT)
      .setProject(process.env.APPWRITE_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY);

    const databases = new Databases(client);
    const dbId = process.env.APPWRITE_DB_ID;
    const userCol = process.env.APPWRITE_USERS_COLLECTION;
    const txCol = process.env.APPWRITE_TX_COLLECTION;

    try {
      // Fetch user doc
      const userDocs = await databases.listDocuments(dbId, userCol, [Query.equal('userId', userId)]);
      if (!userDocs.total) throw new Error('User not found');
      const userDoc = userDocs.documents[0];

      const currentBalance = Number(userDoc.balance || 0);
      const newBalance = currentBalance + amount;

      // Update balance
      await databases.updateDocument(dbId, userCol, userDoc.$id, { balance: newBalance });

      // Save transaction
      await databases.createDocument(dbId, txCol, ID.unique(), {
        userId,
        amount,
        type: 'credit',
        status: 'success',
        reference: data.reference,
        method: 'virtual_account',
        time: new Date().toISOString()
      });

      return res.status(200).send('OK');
    } catch (error) {
      console.error('Webhook error:', error.message);
      return res.status(500).json({ message: 'Failed to update wallet' });
    }
  }

  return res.status(200).send('Ignored');
}

// Required to parse raw body
export const config = {
  api: {
    bodyParser: false,
  },
};

import { buffer } from 'micro'; // install micro
