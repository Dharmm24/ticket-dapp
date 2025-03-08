const express = require('express');
const cors = require('cors');
const { Client, TokenCreateTransaction, TokenType, TokenMintTransaction, TransferTransaction, AccountId, PrivateKey } = require('@hashgraph/sdk');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json());
app.use(cors()); // Enable CORS for frontend at http://localhost:3000

// Hedera Testnet Configuration
const operatorId = AccountId.fromString(process.env.OPERATOR_ID);
const operatorKey = PrivateKey.fromString(process.env.OPERATOR_KEY);
const client = Client.forTestnet().setOperator(operatorId, operatorKey);

// Mint NFT Ticket Function
async function mintTicket(eventDetails, seatNumber) {
  try {
    // Create a new NFT token
    const tokenCreateTx = await new TokenCreateTransaction()
      .setTokenName("EventTicket")
      .setTokenSymbol("ETICKET")
      .setTokenType(TokenType.NonFungibleUnique)
      .setTreasuryAccountId(operatorId)
      .setAdminKey(operatorKey)
      .setSupplyKey(operatorKey)
      .execute(client);

    // Get the token ID from the receipt
    const tokenReceipt = await tokenCreateTx.getReceipt(client);
    const tokenId = tokenReceipt.tokenId;

    // Mint the NFT with metadata
    const mintTx = await new TokenMintTransaction()
      .setTokenId(tokenId)
      .setMetadata([Buffer.from(JSON.stringify({ event: eventDetails, seat: seatNumber }))])
      .execute(client);

    // Get the serial number from the mint receipt
    const mintReceipt = await mintTx.getReceipt(client);

    return {
      tokenId: tokenId.toString(),
      serialNumber: mintReceipt.serials[0].toString(),
    };
  } catch (error) {
    throw new Error(`Failed to mint ticket: ${error.message}`);
  }
}

// Prepare Transfer Transaction (Unsigned)
async function prepareTransferTransaction(tokenId, serialNumber, buyerAccountId) {
  try {
    const buyerId = AccountId.fromString(buyerAccountId);
    const tokenIdObj = AccountId.fromString(tokenId); // Convert string to TokenId

    // Create a transfer transaction
    const transferTx = new TransferTransaction()
      .addNftTransfer(tokenIdObj, parseInt(serialNumber), operatorId, buyerId, true)
      .freezeWith(client);

    // Return the transaction bytes for signing by MetaMask
    const transactionBytes = transferTx.toBytes();
    return { transactionBytes, tokenId, serialNumber, buyerAccountId };
  } catch (error) {
    throw new Error(`Failed to prepare transfer: ${error.message}`);
  }
}

// API to Mint a Ticket
app.post('/mint-ticket', async (req, res) => {
  const { eventDetails, seatNumber } = req.body;

  if (!eventDetails || !seatNumber) {
    return res.status(400).json({ success: false, error: 'Event details and seat number are required' });
  }

  try {
    const ticket = await mintTicket(eventDetails, seatNumber);
    res.json({ success: true, ticket });
  } catch (error) {
    console.error('Minting error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API to Prepare Transfer Transaction
app.post('/prepare-transfer', async (req, res) => {
  const { tokenId, serialNumber, buyerAccountId } = req.body;

  if (!tokenId || !serialNumber || !buyerAccountId) {
    return res.status(400).json({ success: false, error: 'Token ID, serial number, and buyer account ID are required' });
  }

  try {
    const transferData = await prepareTransferTransaction(tokenId, serialNumber, buyerAccountId);
    res.json({ success: true, ...transferData });
  } catch (error) {
    console.error('Transfer preparation error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API to Verify Ticket (Mock Implementation)
app.post('/verify-ticket', async (req, res) => {
  const { tokenId, serialNumber, userAccountId } = req.body;

  if (!tokenId || !serialNumber || !userAccountId) {
    return res.status(400).json({ success: false, error: 'Token ID, serial number, and user account ID are required' });
  }

  // Mock verification (replace with Mirror Node query in production)
  try {
    res.json({
      success: true,
      message: `Ownership verified for Token ID: ${tokenId}, Serial: ${serialNumber} (mock)`,
    });
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start Server
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});