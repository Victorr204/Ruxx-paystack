// api/ebills/plans/electricity.js

import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const response = await axios.get(
      'https://api.ebills.africa/airvend/electricity/discos',
      {
        headers: {
          Authorization: `Bearer ${process.env.EBILLS_API_KEY}`,
        },
      }
    );

    const result = response.data;

    if (result?.status === 'success') {
      return res.status(200).json(result.data);
    } else {
      return res.status(400).json({ error: result?.message || 'Failed to fetch discos' });
    }
  } catch (err) {
    console.error('Fetch electricity discos error:', err.response?.data || err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
