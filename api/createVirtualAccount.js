// api/createVirtualAccount.js
const { Client, Databases } = require("appwrite");
const axios = require("axios");

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  const { userId, email, firstName, lastName, phone } = req.body;

  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const databases = new Databases(client);

  // Step 0: Check if user already has a virtual account
  try {
    const existingDoc = await databases.getDocument(
      process.env.APPWRITE_DATABASE_ID,
      process.env.APPWRITE_COLLECTION_ID,
      userId
    );

    if (existingDoc.assigned) {
      return res.status(200).json({
        success: true,
        account: {
          account_name: existingDoc.account_name,
          account_number: existingDoc.account_number,
          bank_name: existingDoc.bank_name
        },
        message: "Virtual account already exists"
      });
    }
  } catch (err) {
    // If document doesn't exist, continue
  }

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
  await databases.createDocument(
    process.env.APPWRITE_DATABASE_ID,
    process.env.APPWRITE_COLLECTION_ID,
    userId,
    {
      email,
      account_name: accountData.account_name,
      account_number: accountData.account_number,
      bank_name: accountData.bank.name,
      customer_code: customerCode,
      assigned: true,
      balance: 0
    }
  );

  res.status(200).json({
  success: true,
  account: {
    account_name: "John Doe",
    account_number: "0123456789",
    bank: { name: "Wema Bank" }
  }
});
};