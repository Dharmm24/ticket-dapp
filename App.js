import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { MetaMaskSDK } from '@metamask/sdk';
import './App.css';

function App() {
  const [eventDetails, setEventDetails] = useState('');
  const [seatNumber, setSeatNumber] = useState('');
  const [ticket, setTicket] = useState(null);
  const [verificationResult, setVerificationResult] = useState('');
  const [error, setError] = useState('');
  const [buyerAccountId, setBuyerAccountId] = useState('');
  const [transferResult, setTransferResult] = useState('');
  const [metamask, setMetamask] = useState(null);
  const [account, setAccount] = useState(null);

  useEffect(() => {
    const initMetaMask = async () => {
      try {
        const sdk = new MetaMaskSDK({
          dappMetadata: {
            name: "NFT Ticketing DApp",
            url: "http://localhost:3000",
          },
          injectProvider: true, // Ensure provider is injected
        });

        const ethereum = sdk.getProvider();
        if (!ethereum) {
          throw new Error('MetaMask provider not found. Ensure MetaMask is installed.');
        }

        setMetamask(ethereum);

        // Check if Hedera Snap is installed
        const snaps = await ethereum.request({
          method: 'wallet_getSnaps',
        });
        if (!snaps['npm:@hashgraph/hedera-snap']) {
          // Prompt the user to install the Hedera Snap
          const result = await ethereum.request({
            method: 'wallet_requestSnaps',
            params: {
              'npm:@hashgraph/hedera-snap': {},
            },
          });
          console.log('Hedera Snap installed:', result);
        }

        // Request account access
        const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
        setAccount(accounts[0]);
        console.log("Connected MetaMask account:", accounts[0]);
      } catch (err) {
        console.error("Error initializing MetaMask:", err);
        setError("Failed to initialize MetaMask. Ensure MetaMask with Hedera Snap is installed.");
      }
    };

    initMetaMask();
  }, []);

  const handleMintTicket = async () => {
    setError('');
    try {
      const response = await axios.post('http://localhost:3001/mint-ticket', {
        eventDetails,
        seatNumber,
      });
      console.log('Ticket received:', response.data.ticket);
      setTicket(response.data.ticket);
    } catch (error) {
      setError(error.response ? error.response.data.error : error.message);
      console.error('Error minting ticket:', error);
    }
  };

  const handleTransferTicket = async () => {
    setError('');
    if (!ticket || !buyerAccountId || !metamask || !account) {
      setError('Please connect MetaMask and provide a buyer account ID');
      return;
    }
    try {
      const response = await axios.post('http://localhost:3001/prepare-transfer', {
        tokenId: ticket.tokenId,
        serialNumber: ticket.serialNumber,
        buyerAccountId,
      });
      const { transactionBytes } = response.data;

      // Use Hedera Wallet Snap's custom method to sign the transaction
      const signedTx = await metamask.request({
        method: 'wallet_invokeSnap',
        params: {
          snapId: 'npm:@hashgraph/hedera-snap',
          request: {
            method: 'signTransaction',
            params: {
              transaction: Buffer.from(transactionBytes).toString('base64'),
            },
          },
        },
      });

      setTransferResult('Ticket transfer initiated. Check MetaMask for confirmation.');
      console.log('Signed transaction:', signedTx);
    } catch (error) {
      setError(error.message || 'Transaction failed. Check MetaMask.');
      console.error('Error transferring ticket:', error);
    }
  };

  const handleVerifyTicket = async () => {
    try {
      const userAccountId = account || '0.0.xxxx';
      const response = await axios.post('http://localhost:3001/verify-ticket', {
        tokenId: ticket.tokenId,
        serialNumber: ticket.serialNumber,
        userAccountId,
      });
      setVerificationResult(response.data.message);
    } catch (error) {
      console.error('Error verifying ticket:', error);
      setError(error.message);
    }
  };

  return (
    <div className="App">
      <h1>NFT Event Ticketing</h1>
      <div>
        <h2>Mint a Ticket</h2>
        <input
          type="text"
          placeholder="Event Details"
          value={eventDetails}
          onChange={(e) => setEventDetails(e.target.value)}
        />
        <input
          type="text"
          placeholder="Seat Number"
          value={seatNumber}
          onChange={(e) => setSeatNumber(e.target.value)}
        />
        <button onClick={handleMintTicket} disabled={!eventDetails || !seatNumber}>
          Mint Ticket
        </button>
        {ticket && (
          <p>Ticket Minted! Token ID: {ticket.tokenId}, Serial: {ticket.serialNumber}</p>
        )}
        {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      </div>
      <div>
        <h2>Transfer Ticket</h2>
        <input
          type="text"
          placeholder="Buyer Account ID (e.g., 0.0.xxxx)"
          value={buyerAccountId}
          onChange={(e) => setBuyerAccountId(e.target.value)}
        />
        <button onClick={handleTransferTicket} disabled={!ticket || !buyerAccountId || !account}>
          Transfer Ticket
        </button>
        {transferResult && <p>{transferResult}</p>}
      </div>
      <div>
        <h2>Verify Ticket</h2>
        <button onClick={handleVerifyTicket} disabled={!ticket}>
          Verify Ownership
        </button>
        {verificationResult && <p>{verificationResult}</p>}
      </div>
      {!account && <p>Please connect MetaMask with Hedera Snap to proceed.</p>}
    </div>
  );
}

export default App;