const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(express.json());

// Get configuration from environment variables
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// Validate required environment variables
if (!TELEGRAM_BOT_TOKEN || !CHAT_ID) {
  console.error('Missing required environment variables: TELEGRAM_BOT_TOKEN and/or TELEGRAM_CHAT_ID');
  process.exit(1);
}

// API endpoint to send payment information
app.post('/send-message', async (req, res) => {
  const { userId, planType, timestamp, paymentScreenshot } = req.body;

  if (!userId || !planType || !timestamp || !paymentScreenshot) {
    return res.status(400).json({ 
      error: 'All fields are required: userId, planType, timestamp, and paymentScreenshot' 
    });
  }

  try {
    // Format the message
    const message = `🔔 New Payment Received!\n\n` +
                   `👤 User ID: ${userId}\n` +
                   `📦 Plan Type: ${planType}\n` +
                   `⏰ Timestamp: ${timestamp}\n\n` +
                   `📸 Payment Screenshot:`;

    // Send the message first
    await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
      chat_id: CHAT_ID,
      text: message,
      parse_mode: 'HTML'
    });

    // Send the payment screenshot
    const response = await axios.post(`${TELEGRAM_API_URL}/sendPhoto`, {
      chat_id: CHAT_ID,
      photo: paymentScreenshot,
      caption: 'Payment Screenshot'
    });

    res.json({ success: true, telegramResponse: response.data });
  } catch (error) {
    console.error('Error sending payment information:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to send payment information' });
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
