// server.js
require('dotenv').config();
const express    = require('express');
const axios      = require('axios');
const cors       = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const TPAYER = 'https://api.tpayer.net';

// Recipient lookup
app.post('/api/recipient', async (req, res) => {
  try {
    const { username } = req.body;
    const result = await axios.post(
      `${TPAYER}/searchStarsRecipient`,
      new URLSearchParams({ username }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    res.json(result.data);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Price calculation
app.post('/api/price', async (req, res) => {
  try {
    const { recipient, quantity } = req.body;
    const initRes = await axios.post(
      `${TPAYER}/initBuyStarsRequest`,
      new URLSearchParams({ recipient, quantity }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    if (!initRes.data.ok) return res.status(400).json(initRes.data);

    const req_id  = initRes.data.req_id;
    const linkRes = await axios.post(
      `${TPAYER}/getBuyStarsLink`,
      new URLSearchParams({ id: req_id }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    if (!linkRes.data.ok) return res.status(400).json(linkRes.data);

    res.json({ ok: true, amount: linkRes.data.amount });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server on :${PORT}`));
