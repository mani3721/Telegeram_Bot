const express = require('express');
const axios = require('axios');
const multer = require('multer');
const FormData = require('form-data');
require('dotenv').config();

const app = express();
app.use(express.json());

// Configure multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Get configuration from environment variables
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// Validate required environment variables
if (!TELEGRAM_BOT_TOKEN || !CHAT_ID) {
  console.error('Missing required environment variables: TELEGRAM_BOT_TOKEN and/or TELEGRAM_CHAT_ID');
  process.exit(1);
}

// API endpoint to send payment information with base64 image
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

    // Handle base64 image
    let photoData;
    if (paymentScreenshot.startsWith('data:image')) {
      // Extract the base64 data from the data URL
      const base64Data = paymentScreenshot.split(',')[1];
      photoData = Buffer.from(base64Data, 'base64');
    } else {
      photoData = paymentScreenshot;
    }

    // Send the payment screenshot
    const formData = new FormData();
    formData.append('chat_id', CHAT_ID);
    formData.append('photo', photoData, {
      filename: 'payment_screenshot.png',
      contentType: 'image/png'
    });
    formData.append('caption', 'Payment Screenshot');

    const response = await axios.post(`${TELEGRAM_API_URL}/sendPhoto`, formData, {
      headers: {
        ...formData.getHeaders()
      }
    });

    res.json({ success: true, telegramResponse: response.data });
  } catch (error) {
    console.error('Error sending payment information:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to send payment information' });
  }
});

// New endpoint for direct file upload
app.post('/upload-photo', upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const formData = new FormData();
    formData.append('chat_id', CHAT_ID);
    formData.append('photo', req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype
    });
    formData.append('caption', 'Payment Screenshot');

    const response = await axios.post(`${TELEGRAM_API_URL}/sendPhoto`, formData, {
      headers: {
        ...formData.getHeaders()
      }
    });

    res.json({ success: true, telegramResponse: response.data });
  } catch (error) {
    console.error('Error uploading photo:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to upload photo' });
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
