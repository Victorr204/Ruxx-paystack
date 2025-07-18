const { Client, Databases } = require("node-appwrite"); // ✅ correct SDK
const axios = require("axios");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method Not Allowed" });
  }

  const { userId, email, firstName, lastName, phone } = req.body;

  // Validate required fields
  if (!userId || !email || !firstName || !lastName || !phone) {
    return res.status(400).json({
      success: false,
      message: "Missing required fields"
    });
  }

  try {
    // Initialize Appwrite client
    const client = new Client()
      .setEndpoint(process.env.APPWRITE_ENDPOINT)
      .setProject(process.env.APPWRITE_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY);

    const databases = new Databases(client);

    // Check if user already has a virtual account
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
            bank: { name: existingDoc.bank_name }
          },
          message: "Virtual account already exists"
        });
      }
    } catch (err) {
      // Document not found — continue to create
    }

    // Create Paystack customer
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

    // Create virtual account
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

    // Save to Appwrite
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

    // Return success response
    return res.status(200).json({
      success: true,
      account: {
        account_name: accountData.account_name,
        account_number: accountData.account_number,
        bank: { name: accountData.bank.name }
      },
      message: "Virtual account created successfully"
    });
  } catch (error) {
    console.error("❌ Server error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error: " + error.message
    });
  }
};