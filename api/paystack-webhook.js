// File: api/paystack-webhook.js

const { Client, Databases } = require('node-appwrite');
const crypto = require('crypto');

const axios = require('axios');

// Appwrite setup
const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);

// Webhook secret from Paystack dashboard
const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_WEBHOOK_SECRET = process.env.PAYSTACK_WEBHOOK_SECRET;

// Your Appwrite DB & Collection IDs
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
const VIRTUAL_ACCOUNT_COLLECTION = 'virtual_accounts';
const USERS_COLLECTION = 'users';

module.exports = async (req, res) => {
  // 1. Verify signature
  const hash = crypto
    .createHmac('sha512', PAYSTACK_WEBHOOK_SECRET)
    .update(JSON.stringify(req.body))
    .digest('hex');

  if (hash !== req.headers['x-paystack-signature']) {
    return res.status(401).json({ message: 'Invalid webhook signature' });
  }

  const event = req.body;

  if (event.event === 'charge.success') {
    const tx = event.data;
    const amount = tx.amount / 100; // Convert kobo to Naira
    const customerCode = tx.customer?.customer_code;

    if (!customerCode) {
      console.log('No customer_code found in webhook.');
      return res.status(400).json({ message: 'Missing customer code' });
    }

    try {
      // 2. Find virtual account by customer_code
      const list = await databases.listDocuments(
        DATABASE_ID,
        VIRTUAL_ACCOUNT_COLLECTION,
        [ // Appwrite Query
          Appwrite.Query.equal('customer_code', customerCode)
        ]
      );

      if (!list.total || list.documents.length === 0) {
        return res.status(404).json({ message: 'No virtual account matched' });
      }

      const virtualAccount = list.documents[0];
      const userId = virtualAccount.userId;

      // 3. Update user balance
      const userDoc = await databases.getDocument(DATABASE_ID, USERS_COLLECTION, userId);
      const currentBalance = userDoc.balance || 0;

      await databases.updateDocument(DATABASE_ID, USERS_COLLECTION, userId, {
        balance: currentBalance + amount
      });

      console.log(`Balance updated for user: ${userId} | +₦${amount}`);
      return res.status(200).json({ message: 'Balance updated' });

    } catch (error) {
      console.error('Error handling webhook:', error);
      return res.status(500).json({ message: 'Error updating balance', error: error.message });
    }
  }

  return res.status(200).json({ message: 'Webhook received (ignored event)' });
};
