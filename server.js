require('dotenv').config();
const express = require('express');
const path    = require('path');
const axios   = require('axios');
const app     = express();

app.use(express.static(path.join(__dirname,'public')));
app.use(express.json());
app.get('/', (_,res)=>res.sendFile(path.join(__dirname,'public','index.html')));

const TP = 'https://api.tpayer.net';

// Получатель
app.post('/api/recipient', async (req, res) => {
  try {
    const { username } = req.body;
    const r = await axios.post(
      `${TP}/searchStarsRecipient`,
      new URLSearchParams({ username }).toString(),
      { headers:{ 'Content-Type':'application/x-www-form-urlencoded', 'origin':'https://tpayer.net', 'referer':'https://tpayer.net' } }
    );
    res.json(r.data);
  } catch(e) {
    res.json({ ok:false });
  }
});

// Цена
app.post('/api/price', async (req, res) => {
  try {
    const { recipient, quantity } = req.body;
    const init = await axios.post(
      `${TP}/initBuyStarsRequest`,
      new URLSearchParams({ recipient, quantity }).toString(),
      { headers:{ 'Content-Type':'application/x-www-form-urlencoded', 'origin':'https://tpayer.net', 'referer':'https://tpayer.net' } }
    );
    if(!init.data.ok) return res.json({ ok:false });
    const link = await axios.post(
      `${TP}/getBuyStarsLink`,
      new URLSearchParams({ id:init.data.req_id }).toString(),
      { headers:{ 'Content-Type':'application/x-www-form-urlencoded', 'origin':'https://tpayer.net', 'referer':'https://tpayer.net' } }
    );
    return res.json({ ok:link.data.ok, amount: Number(link.data.amount) });
  } catch(e) {
    res.json({ ok:false });
  }
});

const PORT = process.env.PORT||3000;
app.listen(PORT, ()=>console.log(`Server on ${PORT}`));
