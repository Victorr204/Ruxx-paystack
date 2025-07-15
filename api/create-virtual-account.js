// File: api/create-virtual-account.js

const axios = require('axios');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Only POST allowed' });
  }

  const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
  const { email, first_name, last_name, userId } = req.body;

  if (!email || !userId) {
    return res.status(400).json({ message: 'Missing email or userId' });
  }

  try {
    // 1. Create customer on Paystack
    const customerRes = await axios.post(
      'https://api.paystack.co/customer',
      {
        email,
        first_name,
        last_name,
        metadata: { userId },
      },
      {
        headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` },
      }
    );

    const customerCode = customerRes.data.data.customer_code;

    // 2. Create dedicated virtual account
    const accountRes = await axios.post(
      'https://api.paystack.co/dedicated_account',
      {
        customer: customerCode,
        preferred_bank: 'wema-bank',
      },
      {
        headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` },
      }
    );

    const account = accountRes.data.data;

    return res.status(200).json({
      virtualAccount: {
        bank_name: account.bank.name,
        account_number: account.account_number,
        account_name: account.account_name,
        customer_code: customerCode,
      },
    });
  }  catch (error) {
  console.error('Paystack error:', error.response?.data || error.message); // 👈 Add this!
  return res.status(500).json({
  message: 'Paystack account creation failed',
  error: error.response?.data || error.message || 'Unknown error',
});

}

};
