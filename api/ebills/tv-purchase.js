// api/ebills/tv-purchase.js
import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  const { provider, smartcard, amount, variation_code } = req.body;

  if (!provider || !smartcard || !amount || !variation_code) {
    return res.status(400).json({ success: false, message: 'Missing required fields.' });
  }

  try {
    const response = await axios.post(
      `${process.env.EBILLS_BASE_URL}/tv`,
      {
        provider,
        smartcard,
        amount,
        variation_code,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'reseller-id': process.env.EBILLS_RESELLER_ID,
          'api-key': process.env.EBILLS_API_KEY,
        },
      }
    );

    return res.status(200).json({
      success: true,
      message: 'TV subscription processed successfully.',
      data: response.data,
    });
  } catch (error) {
    console.error('TV subscription error:', error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      message: 'TV subscription failed.',
      error: error.response?.data || error.message,
    });
  }
}
