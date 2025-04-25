require('dotenv').config();
const express = require('express');
const axios   = require('axios');
const path    = require('path');
const app     = express();

app.use(express.static(path.join(__dirname,'public')));
app.use(express.json());

app.get('/', (_, res) => {
  res.sendFile(path.join(__dirname,'public','index.html'));
});

const TP   = 'https://api.tpayer.net';
const HEAD = {
  'accept': 'application/json, text/plain, */*',
  'content-type': 'application/x-www-form-urlencoded',
  'origin': 'https://tpayer.net',
  'referer': 'https://tpayer.net/'
};

app.post('/api/recipient', async (req, res) => {
  try {
    const { username } = req.body;
    const r = await axios.post(
      `${TP}/searchStarsRecipient`,
      new URLSearchParams({ username }).toString(),
      { headers: HEAD }
    );
    return res.json(r.data);
  } catch (e) {
    return res.json({ ok:false, error:e.message });
  }
});

app.post('/api/price', async (req, res) => {
  try {
    const { recipient, quantity } = req.body;
    const init = await axios.post(
      `${TP}/initBuyStarsRequest`,
      new URLSearchParams({ recipient, quantity }).toString(),
      { headers: HEAD }
    );
    if (!init.data.ok) return res.json({ ok:false });
    return res.json({ ok:true, amount: init.data.amount });
  } catch (e) {
    return res.json({ ok:false, error:e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
