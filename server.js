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
  'accept-language': 'ru,en;q=0.9',
  'content-type': 'application/x-www-form-urlencoded',
  'origin': 'https://tpayer.net',
  'referer': 'https://tpayer.net/',
  'sec-ch-ua': '"Not A(Brand";v="8", "Chromium";v="132", "YaBrowser";v="25.2", "Yowser";v="2.5"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-site',
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 YaBrowser/25.2.0.0 Safari/537.36'
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
