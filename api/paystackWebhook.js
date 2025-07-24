const express = require('express');
const crypto = require('crypto');
const { Client, Databases, Query } = require('node-appwrite');

const app = express();
app.use(express.json());

const PAYSTACK_SECRET = 'sk_live_4157e5986dcb96e197e7389abef337ef90f12541';

const client = new Client()
  .setEndpoint('https://fra.cloud.appwrite.io/v1')
  .setProject('684055920027597e8f4f')
  .setKey('standard_8da2e51a320f01e7deb537c6b51bae9c9922db0fca101b83c7128920507e339951c1ce484bb92f5b25bc27e0df24411b06a559cc357b849be71f1f26a43e6ce03f581dd51e030742fad7f1b2c8af82acc1aa0688ce92d2dff6e10ea784e2170ed31083d4083814aa73b39ea9a399032aea59a037a04ab70c6e9f78889482b704');

const databases = new Databases(client);

app.post('/webhook/paystack', async (req, res) => {
  const signature = crypto
    .createHmac('sha512', PAYSTACK_SECRET)
    .update(JSON.stringify(req.body))
    .digest('hex');

  if (signature !== req.headers['x-paystack-signature']) {
    return res.status(403).send('Invalid signature');
  }

  const { event, data } = req.body;

  if (event === 'charge.success') {
    const accountNumber = data.recipient?.account_number;

    if (!accountNumber) {
      return res.status(400).send('Missing account number');
    }

    try {
      // Find user with matching account number
      const userList = await databases.listDocuments(
        '684067040021a0f7b59a',
        '6840684e001b7e2a3190',
        [Query.equal('virtualAccount.accountNumber', accountNumber)]
      );

      if (userList.documents.length === 0) {
        return res.status(404).send('User not found');
      }

      const userDoc = userList.documents[0];
      const newBalance = userDoc.balance + data.amount / 100;

      await databases.updateDocument(
        '684067040021a0f7b59a',
        '6840684e001b7e2a3190',
        userDoc.$id,
        { balance: newBalance }
      );

      console.log(`✅ Balance updated for account ${accountNumber}`);
      return res.status(200).send('Success');
    } catch (err) {
      console.error('❌ Appwrite error:', err.message);
      return res.status(500).send('Internal error');
    }
  } else {
    return res.status(400).send('Unsupported event');
  }
});

app.listen(3000, () => console.log('🚀 Webhook active on port 3000'));