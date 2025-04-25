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

// существующие маршруты /api/recipient и /api/price оставляем без изменений...

// Новый роут для генерации ссылки и payload для покупки
app.post('/api/buy', async (req, res) => {
  try {
    const { recipient, quantity } = req.body;
    // 1. Инициализируем запрос на покупку
    const init = await axios.post(
      `${TP}/initBuyStarsRequest`,
      new URLSearchParams({ recipient, quantity }).toString(),
      { headers: HEAD }
    );
    if (!init.data.ok) return res.status(400).json({ ok: false, error: 'init failed' });

    const req_id = init.data.req_id;
    // 2. Получаем параметры транзакции
    const link = await axios.post(
      `${TP}/getBuyStarsLink`,
      new URLSearchParams({ id: req_id }).toString(),
      { headers: HEAD }
    );
    if (!link.data.ok) return res.status(400).json({ ok: false, error: 'link failed' });

    // 3. Возвращаем фронту всё, что нужно
    return res.json({
      ok: true,
      address: link.data.address,
      amount: link.data.amount,    // строка в nanotons
      payload: link.data.payload,  // base64
      validUntil: Math.floor(Date.now() / 1000) + 60
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
