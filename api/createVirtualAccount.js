// api/createVirtualAccount.js
const { Client, Databases } = require("appwrite");
const axios = require("axios");

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  const { userId, email, firstName, lastName, phone } = req.body;

  // Step 1: Create Paystack Customer
  const customerRes = await axios.post(
    "https://api.paystack.co/customer",
    {
      email,
      first_name: firstName,
      last_name: lastName,
      phone
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json"
      }
    }
  );

  const customerCode = customerRes.data.data.customer_code;

  // Step 2: Create Virtual Account
  const accountRes = await axios.post(
    "https://api.paystack.co/dedicated_account",
    {
      customer: customerCode,
      preferred_bank: "wema-bank"
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json"
      }
    }
  );

  const accountData = accountRes.data.data;

  // Step 3: Save to Appwrite
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const databases = new Databases(client);

  await databases.createDocument(
    process.env.APPWRITE_DATABASE_ID,
    process.env.APPWRITE_COLLECTION_ID,
    userId, // Use userId as document ID
    {
      email,
      account_name: accountData.account_name,
      account_number: accountData.account_number,
      bank_name: accountData.bank.name,
      customer_code: customerCode,
      assigned: true
    }
  );

  res.status(200).json({ success: true, account: accountData });
};