import sdk from 'node-appwrite';
import express from 'express';
import crypto from 'crypto';

const app = express();
app.use(express.json());

const client = new sdk.Client();
client
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new sdk.Databases(client);
const Query = sdk.Query;

app.post('/api/paystack-webhook', async (req, res) => {
  const secret = process.env.PAYSTACK_WEBHOOK_SECRET;

  const hash = crypto
    .createHmac('sha512', secret)
    .update(JSON.stringify(req.body))
    .digest('hex');

  if (hash !== req.headers['x-paystack-signature']) {
    return res.status(401).send('Unauthorized');
  }

  const event = req.body;
  console.log('Webhook received:', event.event);

  if (event.event === 'transfer.success' || event.event === 'charge.success') {
    const customerCode = event.data?.customer?.customer_code;

    try {
      // 1. Find user with matching virtualAccount
      const users = await databases.listDocuments(
        process.env.APPWRITE_DATABASE_ID,
        process.env.USER_COLLECTION_ID,
        [Query.equal('paystackCustomerCode', customerCode)]
      );

      if (users.total === 0) {
        console.log('No user found for customer code:', customerCode);
        return res.sendStatus(404);
      }

      const user = users.documents[0];
      const userId = user.userId;
      const depositAmount = parseFloat(event.data.amount) / 100;

      // 2. Check if balance document already exists
      const balances = await databases.listDocuments(
        process.env.APPWRITE_DATABASE_ID,
        process.env.BALANCE_COLLECTION_ID,
        [Query.equal('userId', userId)]
      );

      if (balances.total > 0) {
        const balanceDoc = balances.documents[0];
        const newBalance = (parseFloat(balanceDoc.amount) || 0) + depositAmount;

        await databases.updateDocument(
          process.env.APPWRITE_DATABASE_ID,
          process.env.BALANCE_COLLECTION_ID,
          balanceDoc.$id,
          { amount: newBalance }
        );
      } else {
        // Create new balance document
        await databases.createDocument(
          process.env.APPWRITE_DATABASE_ID,
          process.env.BALANCE_COLLECTION_ID,
          'unique()',
          {
            userId,
            amount: depositAmount
          }
        );
      }

      // 3. Save notification document
      await databases.createDocument(
        process.env.APPWRITE_DATABASE_ID,
        process.env.NOTIFICATIONS_COLLECTION_ID, // make sure this is defined in your env
        'unique()',
        {
          userId: userId,
          title: 'Deposit Successful',
          message: `Your wallet was credited with ₦${depositAmount}`,
          type: 'deposit',
          createdAt: new Date().toISOString()
        }
      );

      return res.sendStatus(200);
    } catch (err) {
      console.error('Webhook processing error:', err);
      return res.sendStatus(500);
    }
  }

  return res.sendStatus(200);
});

export default app;
