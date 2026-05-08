const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const GHL_API_KEY = process.env.GHL_API_KEY;

app.post('/webhook', async (req, res) => {
  try {
    const { contactName, message, contactId, locationId } = req.body;

    const businessContext = req.body.businessContext || 
      'You are a helpful business assistant. Be friendly, professional, and concise.';

    const aiResponse = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        system: `${businessContext} 
          You are responding to a lead or customer message on behalf of this business.
          Keep replies under 2 sentences. Be warm and helpful.
          Always end with a clear next step (book, call, or reply).`,
        messages: [
          { role: 'user', content: `Customer name: ${contactName}\nMessage: ${message}` }
        ]
      },
      {
        headers: {
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json'
        }
      }
    );

    const reply = aiResponse.data.content[0].text;

    await axios.post(
      `https://services.leadconnectorhq.com/conversations/messages`,
      {
        type: 'SMS',
        contactId: contactId,
        message: reply
      },
      {
        headers: {
          'Authorization': `Bearer ${GHL_API_KEY}`,
          'Version': '2021-04-15',
          'Content-Type': 'application/json'
        }
      }
    );

    res.json({ success: true, reply });

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/', (req, res) => {
  res.json({ status: 'NexaAI server running' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`NexaAI running on port ${PORT}`));
