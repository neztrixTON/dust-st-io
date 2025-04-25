// server.js
require('dotenv').config();
const express    = require('express');
const path       = require('path');
const axios      = require('axios');
const cors       = require('cors');
const bodyParser = require('body-parser');

const app = express();

// 1) Статика: public/index.html, manifest, svg и т.д.
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (_,res)=>res.sendFile(path.join(__dirname,'public','index.html')));

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const TPAYER = 'https://api.tpayer.net';
const STAR_PACKAGES = [50,75,100,150,250,350,500,750,1000,1500,2500,5000,10000,25000,35000,50000,100000,150000,500000,1000000];

// Proxy recipient lookup
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
    res.status(500).json({ ok:false, error:e.message });
  }
});

// Proxy single-price calculation
app.post('/api/price', async (req, res) => {
  try {
    const { recipient, quantity } = req.body;
    const init  = await axios.post(
      `${TPAYER}/initBuyStarsRequest`,
      new URLSearchParams({ recipient, quantity }).toString(),
      { headers:{'Content-Type':'application/x-www-form-urlencoded'} }
    );
    if(!init.data.ok) return res.status(400).json(init.data);

    const req_id = init.data.req_id;
    const link   = await axios.post(
      `${TPAYER}/getBuyStarsLink`,
      new URLSearchParams({ id:req_id }).toString(),
      { headers:{'Content-Type':'application/x-www-form-urlencoded'} }
    );
    if(!link.data.ok) return res.status(400).json(link.data);

    // возвращаем в тонах (делим нанотоны на 1e9)
    const priceTON = link.data.amount / 1e9;
    res.json({ ok:true, amount: priceTON });
  } catch (e) {
    res.status(500).json({ ok:false, error:e.message });
  }
});

// Bulk package pricing: параллельно (Promise.all)
app.get('/api/packages', async (req, res) => {
  try {
    const results = await Promise.all(
      STAR_PACKAGES.map(async stars => {
        const init  = await axios.post(
          `${TPAYER}/initBuyStarsRequest`,
          new URLSearchParams({ recipient:'', quantity:stars }).toString(),
          { headers:{'Content-Type':'application/x-www-form-urlencoded'} }
        );
        if(!init.data.ok) return { stars, price:null };

        const link  = await axios.post(
          `${TPAYER}/getBuyStarsLink`,
          new URLSearchParams({ id:init.data.req_id }).toString(),
          { headers:{'Content-Type':'application/x-www-form-urlencoded'} }
        );
        const priceTON = link.data.ok
          ? link.data.amount / 1e9
          : null;
        return { stars, price: priceTON };
      })
    );
    res.json({ ok:true, packages: results });
  } catch (e) {
    res.status(500).json({ ok:false, error:e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=>console.log(`Server listening on port ${PORT}`));
