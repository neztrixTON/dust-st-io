// server.js
require('dotenv').config();
const express = require('express');
const axios   = require('axios');
const path    = require('path');
const app     = express();

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

const TP = 'https://api.tpayer.net';
const HEAD = {
  'accept': 'application/json, text/plain, */*',
  'content-type': 'application/x-www-form-urlencoded',
  'origin': 'https://tpayer.net',
  'referer': 'https://tpayer.net/'
};

// адрес для сбора комиссии
const COMMISSION_ADDRESS = 'UQAy3S4qSu8Vxdl8EjHvc7nxvUDsM2mFn0q5e73G8Kg_47Dx';

// вычисляем комиссию и общую сумму (в nanotons)
function computeCommission(nanoAmount, quantity) {
  let pct;
  if (quantity < 10_000) pct = 0.20;
  else if (quantity < 100_000) pct = 0.015;
  else pct = 0.005;
  const commission = BigInt(Math.ceil(Number(nanoAmount) * pct));
  return { commission, total: nanoAmount + commission };
}

// поиск получателя
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

// получение цены с учётом комиссии
app.post('/api/price', async (req, res) => {
  try {
    const { recipient, quantity } = req.body;
    // initBuyStarsRequest возвращает amount в TON (строка)
    const init = await axios.post(
      `${TP}/initBuyStarsRequest`,
      new URLSearchParams({ recipient, quantity }).toString(),
      { headers: HEAD }
    );
    if (!init.data.ok) return res.json({ ok: false, error: 'init failed' });
    // преобразуем к nanotons
    const baseNano = BigInt(Math.ceil(parseFloat(init.data.amount) * 1e9));
    const { commission, total } = computeCommission(baseNano, quantity);
    res.json({ ok: true, baseAmount: baseNano.toString(), commission: commission.toString(), totalAmount: total.toString() });
  } catch (e) {
    console.error('Price error:', e);
    res.json({ ok: false, error: e.message });
  }
});

// генерация транзакции покупки
app.post('/api/buy', async (req, res) => {
  try {
    const { recipient, quantity } = req.body;
    // 1) initBuyStarsRequest
    const init = await axios.post(
      `${TP}/initBuyStarsRequest`,
      new URLSearchParams({ recipient, quantity }).toString(),
      { headers: HEAD }
    );
    if (!init.data.ok) {
      return res.status(400).json({ ok: false, error: 'init failed' });
    }
    const req_id = init.data.req_id;
    // конвертация amount TON -> nanotons
    const baseNano = BigInt(Math.ceil(parseFloat(init.data.amount) * 1e9));

    // 2) getBuyStarsLink
    const link = await axios.post(
      `${TP}/getBuyStarsLink`,
      new URLSearchParams({ id: req_id }).toString(),
      { headers: HEAD }
    );
    if (!link.data.ok) {
      return res.status(400).json({ ok: false, error: 'link failed' });
    }
    const { address: destAddress, payload } = link.data;

    // 3) рассчитываем комиссию
    const { commission, total } = computeCommission(baseNano, quantity);

    // возвращаем два сообщения для TON Connect
    res.json({
      ok: true,
      validUntil: Math.floor(Date.now() / 1000) + 60,
      messages: [
        {
          address: destAddress,
          amount: baseNano.toString(),
          payload: payload
        },
        {
          address: COMMISSION_ADDRESS,
          amount: commission.toString()
        }
      ]
    });
  } catch (e) {
    console.error('Buy error:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
