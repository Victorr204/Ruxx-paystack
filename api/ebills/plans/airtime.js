// File: api/ebills/plans/airtime.js
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const response = await fetch('https://api.ebills.africa/airtime/plans', {
      headers: {
        Authorization: `Bearer ${process.env.EBILLS_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errData = await response.json();
      return res.status(response.status).json({ error: errData.message });
    }

    const data = await response.json();
    res.status(200).json(data); // return real airtime plans
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
