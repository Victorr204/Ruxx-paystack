// controllers/ebills/airtime.js
const axios = require('axios');

exports.buyAirtime = async (req, res) => {
  const { network, phone, amount } = req.body;

  // Validate input
  if (!network || !phone || !amount) {
    return res.status(400).json({ success: false, message: 'Missing required fields.' });
  }

  try {
    const response = await axios.post(
      `${process.env.EBILLS_BASE_URL}/airtime`,
      { network, phone, amount },
      {
        headers: {
          'Content-Type': 'application/json',
          'reseller-id': process.env.EBILLS_RESELLER_ID,
          'api-key': process.env.EBILLS_API_KEY
        }
      }
    );

    return res.status(200).json({
      success: true,
      message: 'Airtime purchase request sent.',
      data: response.data
    });
  } catch (error) {
    const errorMsg = error.response?.data || error.message;
    console.error('eBills airtime error:', errorMsg);
    return res.status(500).json({
      success: false,
      message: 'Airtime purchase failed.',
      error: errorMsg
    });
  }
};
