// server.js
require('dotenv').config();
const express = require('express');
const axios   = require('axios');
const path    = require('path');
const app     = express();

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

app.get('/', (_, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const TP = 'https://api.tpayer.net';
const HEAD = {
  'accept': 'application/json, text/plain, */*',
  'content-type': 'application/x-www-form-urlencoded',
  'origin': 'https://tpayer.net',
  'referer': 'https://tpayer.net/'
};

// Поиск получателя
app.post('/api/recipient', async (req, res) => {
  try {
    const { username } = req.body;
    const response = await axios.post(
      `${TP}/searchStarsRecipient`,
      new URLSearchParams({ username }).toString(),
      { headers: HEAD }
    );
    res.json(response.data);
  } catch (e) {
    console.error('Recipient error:', e);
    res.json({ ok: false, error: e.message });
  }
});

// Получение цены за заданное количество
app.post('/api/price', async (req, res) => {
  try {
    const { recipient, quantity } = req.body;
    const response = await axios.post(
      `${TP}/initBuyStarsRequest`,
      new URLSearchParams({ recipient, quantity }).toString(),
      { headers: HEAD }
    );
    if (!response.data.ok) {
      return res.json({ ok: false });
    }
    res.json({ ok: true, amount: response.data.amount });
  } catch (e) {
    console.error('Price error:', e);
    res.json({ ok: false, error: e.message });
  }
});

// Генерация параметров транзакции покупки
app.post('/api/buy', async (req, res) => {
  try {
    const { recipient, quantity } = req.body;

    // 1) Инициализация покупки
    const init = await axios.post(
      `${TP}/initBuyStarsRequest`,
      new URLSearchParams({ recipient, quantity }).toString(),
      { headers: HEAD }
    );
    if (!init.data.ok) {
      return res.status(400).json({ ok: false, error: 'init failed' });
    }
    const req_id = init.data.req_id;

    // 2) Получение ссылки и payload
    const link = await axios.post(
      `${TP}/getBuyStarsLink`,
      new URLSearchParams({ id: req_id }).toString(),
      { headers: HEAD }
    );
    if (!link.data.ok) {
      return res.status(400).json({ ok: false, error: 'link failed' });
    }

    // 3) Возвращаем фронту данные для формирования транзакции
    res.json({
      ok: true,
      address:    link.data.address,
      amount:     link.data.amount,    // в nanotons
      payload:    link.data.payload,   // base64
      validUntil: Math.floor(Date.now() / 1000) + 60
    });
  } catch (e) {
    console.error('Buy error:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
