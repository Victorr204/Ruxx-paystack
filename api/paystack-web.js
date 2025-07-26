app.post('/paystack/webhook', async (req, res) => {
  const event = req.body.event;
  const deposit = req.body.data;
 const Config = {
  endpoint: 'https://fra.cloud.appwrite.io/v1',
  Platform: 'com.victor.Ruxx',
  projectId: '684055920027597e8f4f',
  databaseId: '684067040021a0f7b59a',
  userCollectionId: '6840684e001b7e2a3190',
  kycCollectionId: '6866ca550022ff21e9dc',
  storageBucketId: '6866c562003d56c841dd',
  txnCollectionId: '6866caf00030b1c752a0',
  balanceCollectionId: '688485f60013ffff20c6',
};

  if (event === 'charge.success' && deposit.channel === 'bank_transfer') {
    const userId = findUserIdFromDeposit(deposit); // however you're mapping account numbers to user IDs

    // 1. Store transaction
    await databases.createDocument(
      Config.databaseId,
      Config.txnCollectionId,
      'unique()',
      {
        userId,
        amount: deposit.amount,
        status: 'Success',
        type: 'Deposit',
        provider: deposit.bank,
        reference: deposit.reference,
        recipient: deposit.customer.email,
      }
    );

    // 2. Update balance
    const balanceDoc = await databases.listDocuments(
      Config.databaseId,
      Config.balanceCollectionId,
      [Query.equal('userId', userId)]
    );

    const currentBalance = balanceDoc.documents[0]?.amount || 0;
    const balanceDocId = balanceDoc.documents[0]?.$id;

    await databases.updateDocument(
      Config.databaseId,
      Config.balanceCollectionId,
      balanceDocId,
      {
        amount: currentBalance + deposit.amount
      }
    );
  }

  res.sendStatus(200);
});