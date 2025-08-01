// api/ebills/electricity-purchase.js

import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { disco, meter_number, amount, type } = req.body;

  if (!disco || !meter_number || !amount || !type) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const response = await axios.post(
      'https://api.ebills.africa/airvend/electricity/purchase',
      {
        disco,
        meter_number,
        amount,
        type, // "prepaid" or "postpaid"
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.EBILLS_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const result = response.data;

    if (result?.status === 'success') {
      return res.status(200).json({ message: 'Electricity purchase successful', data: result });
    } else {
      return res.status(400).json({ error: result?.message || 'Failed to purchase electricity' });
    }
  } catch (err) {
    console.error('Electricity purchase error:', err.response?.data || err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
