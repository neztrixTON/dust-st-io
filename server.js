require('dotenv').config();
const express = require('express');
const axios   = require('axios');
const path    = require('path');
const app     = express();

app.use(express.static(path.join(__dirname,'public')));
app.use(express.json());

const TP = 'https://api.tpayer.net';
const COMMON = {
  'accept': 'application/json, text/plain, */*',
  'accept-language': 'ru,en;q=0.9',
  'content-type': 'application/x-www-form-urlencoded',
  'origin': 'https://tpayer.net',
  'referer': 'https://tpayer.net/',
  'user-agent': 'Mozilla/5.0'
};

app.get('/', (_,res) => res.sendFile(path.join(__dirname,'public','index.html')));

// recipient lookup
app.post('/api/recipient', async (req,res) => {
  try {
    const { username } = req.body;
    const r = await axios.post(
      `${TP}/searchStarsRecipient`,
      new URLSearchParams({ username }).toString(),
      { headers: COMMON }
    );
    return res.json(r.data);
  } catch (e) {
    return res.json({ ok:false, error:e.message });
  }
});

// price fetch (returns NANOTON, client divides by 1e9)
app.post('/api/price', async (req,res) => {
  try {
    const { recipient, quantity } = req.body;
    const init = await axios.post(
      `${TP}/initBuyStarsRequest`,
      new URLSearchParams({ recipient, quantity }).toString(),
      { headers: COMMON }
    );
    if (!init.data.ok) return res.json({ ok:false });
    const link = await axios.post(
      `${TP}/getBuyStarsLink`,
      new URLSearchParams({ id: init.data.req_id }).toString(),
      { headers: COMMON }
    );
    return res.json({ ok: link.data.ok, amount: Number(link.data.amount) });
  } catch (e) {
    return res.json({ ok:false, error:e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=>console.log(`Listening on ${PORT}`));
