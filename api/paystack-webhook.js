// File: api/paystack-webhook.js

const crypto = require('crypto');
const { Client, Databases, Query } = require("node-appwrite");

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
const WEBHOOK_SECRET = process.env.PAYSTACK_WEBHOOK_SECRET;

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  // 🔍 Debug: Log the full webhook body
  console.log('📥 Webhook received:', JSON.stringify(req.body, null, 2));

  // Step 1: Verify Webhook Signature
  const signature = req.headers['x-paystack-signature'];
  const hash = crypto
    .createHmac('sha512', WEBHOOK_SECRET)
    .update(JSON.stringify(req.body))
    .digest('hex');

  if (hash !== signature) {
    console.warn('❌ Signature mismatch');
    return res.status(401).send('Unauthorized - Invalid Signature');
  }

  const event = req.body.event;
  const data = req.body.data;

  if (event === 'charge.success' && data.status === 'success') {
    const customerCode = data.customer.customer_code;
    const amountInKobo = data.amount;

    console.log('✅ charge.success for customer:', customerCode, '| Amount:', amountInKobo);

    // Connect to Appwrite
    const client = new Client()
      .setEndpoint(process.env.APPWRITE_ENDPOINT)
      .setProject(process.env.APPWRITE_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY);

    const databases = new Databases(client);
    const databaseId = process.env.APPWRITE_DATABASE_ID;
    const collectionId = 'users'; // Replace with your actual collection

    try {
      // Step 2: Search user by customer code in nested field
      const userDocs = await databases.listDocuments(
        databaseId,
        collectionId,
        [Query.equal("virtualAccount.customer_code", customerCode)]
      );

      if (userDocs.total === 0) {
        console.warn('⚠️ No matching user for customer_code:', customerCode);
        return res.status(404).send('User not found');
      }

      const user = userDocs.documents[0];
      const newBalance = (user.balance || 0) + amountInKobo / 100;

      console.log(`💰 Updating balance for user ${user.$id}: Old: ${user.balance || 0}, New: ${newBalance}`);

      // Step 3: Update user balance
      await databases.updateDocument(
        databaseId,
        collectionId,
        user.$id,
        { balance: newBalance }
      );

      return res.status(200).send('Balance updated');
    } catch (error) {
      console.error('🔥 Error updating balance:', error.message || error);
      return res.status(500).send('Server error');
    }
  }

  console.log(`ℹ️ Event received but not processed: ${event}`);
  return res.status(200).send('Event received');
};
