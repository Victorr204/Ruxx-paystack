// controllers/ebills/purchase-data.js
const axios = require('axios');

exports.buyData = async (req, res) => {
  const { network, phone, plan } = req.body;

  if (!network || !phone || !plan) {
    return res.status(400).json({ success: false, message: 'Missing required fields.' });
  }

  try {
    const response = await axios.post(
      `${process.env.EBILLS_BASE_URL}/data`,
      { network, phone, plan },
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
      message: 'Data purchase request sent.',
      data: response.data
    });
  } catch (error) {
    const errorMsg = error.response?.data || error.message;
    console.error('eBills data error:', errorMsg);
    return res.status(500).json({
      success: false,
      message: 'Data purchase failed.',
      error: errorMsg
    });
  }
};
