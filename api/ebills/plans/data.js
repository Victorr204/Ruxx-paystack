// controllers/ebills/data.js
const axios = require('axios');

exports.getDataPlans = async (req, res) => {
  try {
    const response = await axios.get(`${process.env.EBILLS_BASE_URL}/plans/data`, {
      headers: {
        'reseller-id': process.env.EBILLS_RESELLER_ID,
        'api-key': process.env.EBILLS_API_KEY
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Data plans fetched successfully.',
      data: response.data
    });
  } catch (error) {
    const errorMsg = error.response?.data || error.message;
    console.error('eBills data plans error:', errorMsg);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch data plans.',
      error: errorMsg
    });
  }
};
