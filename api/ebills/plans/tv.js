// File: api/ebills/tv-purchase.js
import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { provider, smartcardNumber, variationCode, amount, phone } = req.body;

  if (!provider || !smartcardNumber || !variationCode || !amount || !phone) {
    return res.status(400).json({ success: false, message: 'Missing required fields.' });
  }

  try {
    const response = await axios.post(
      `${process.env.EBILLS_BASE_URL}/tv`,
      { network: provider, smartcard_number: smartcardNumber, variation_code: variationCode, amount, phone },
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
      message: 'TV subscription successful.',
      data: response.data,
    });
  } catch (error) {
    const errorMsg = error.response?.data || error.message;
    console.error('eBills TV subscription error:', errorMsg);
    return res.status(500).json({
      success: false,
      message: 'TV subscription failed.',
      error: errorMsg,
    });
  }
}
