require('dotenv').config();
const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;

// Route to create virtual account
app.post('/create-virtual-account', async (req, res) => {
  const { email, first_name, last_name, userId } = req.body;

  if (!email || !userId) {
    return res.status(400).json({ message: 'Missing email or userId' });
  }

  try {
    // Step 1: Create Customer on Paystack
    const customerRes = await axios.post(
      'https://api.paystack.co/customer',
      { email, first_name, last_name, metadata: { userId } },
      { headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` } }
    );

    const customerCode = customerRes.data.data.customer_code;

    // Step 2: Assign Dedicated Virtual Account
    const accountRes = await axios.post(
      'https://api.paystack.co/dedicated_account',
      {
        customer: customerCode,
        preferred_bank: 'wema-bank',
      },
      { headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` } }
    );

    const account = accountRes.data.data;

    // Return virtual account details
    return res.json({
      virtualAccount: {
        bank_name: account.bank.name,
        account_number: account.account_number,
        account_name: account.account_name,
        customer_code: customerCode,
      },
    });
  } catch (error) {
    console.error(error.response?.data || error.message);
    return res.status(500).json({ message: 'Failed to create virtual account' });
  }
});

app.get('/', (req, res) => {
  res.send('Paystack Backend Running 🚀');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend listening on port ${PORT}`));
