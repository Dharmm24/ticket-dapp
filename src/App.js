import React, { useState } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [eventDetails, setEventDetails] = useState('');
  const [seatNumber, setSeatNumber] = useState('');
  const [ticket, setTicket] = useState(null);
  const [verificationResult, setVerificationResult] = useState('');

  // Mint Ticket
  const handleMintTicket = async () => {
    try {
      const response = await axios.post('http://localhost:3001/mint-ticket', {
        eventDetails,
        seatNumber,
      });
      setTicket(response.data.ticket);
    } catch (error) {
      console.error('Error minting ticket:', error);
    }
  };

  // Verify Ticket (mock HashPack wallet integration)
  const handleVerifyTicket = async () => {
    try {
      const response = await axios.post('http://localhost:3001/verify-ticket', {
        tokenId: ticket.tokenId,
        serialNumber: ticket.serialNumber,
        userAccountId: '0.0.xxxx', // Replace with actual HashPack account ID
      });
      setVerificationResult(response.data.message);
    } catch (error) {
      console.error('Error verifying ticket:', error);
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
        <button onClick={handleMintTicket}>Mint Ticket</button>
        {ticket && (
          <p>
            Ticket Minted! Token ID: {ticket.tokenId}, Serial: {ticket.serialNumber}
          </p>
        )}
      </div>
      <div>
        <h2>Verify Ticket</h2>
        <button onClick={handleVerifyTicket} disabled={!ticket}>
          Verify Ownership
        </button>
        {verificationResult && <p>{verificationResult}</p>}
      </div>
    </div>
  );
}

export default App;