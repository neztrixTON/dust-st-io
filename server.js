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

// комиссия-получатель
const COMMISSION_ADDRESS = 'UQAy3S4qSu8Vxdl8EjHvc7nxvUDsM2mFn0q5e73G8Kg_47Dx';

// утилита для вычисления с учётом процента
function addCommission(amountNanotons, quantity) {
  // определяем процент
  let pct;
  if (quantity < 10_000) {
    pct = 0.20;       // 20%
  } else if (quantity < 100_000) {
    pct = 0.015;      // 1.5%
  } else {
    pct = 0.005;      // 0.5%
  }
  // рассчитываем комиссию (округляем вверх до целых nanotons)
  const commission = BigInt(Math.ceil(Number(amountNanotons) * pct));
  return {
    total: BigInt(amountNanotons) + commission,
    commission
  };
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
    // инициализация
    const init = await axios.post(
      `${TP}/initBuyStarsRequest`,
      new URLSearchParams({ recipient, quantity }).toString(),
      { headers: HEAD }
    );
    if (!init.data.ok) {
      return res.json({ ok: false, error: 'init failed' });
    }
    // базовая стоимость в nanotons (строка)
    const baseAmount = BigInt(init.data.amount);
    const { total, commission } = addCommission(baseAmount, quantity);
    res.json({
      ok: true,
      baseAmount: baseAmount.toString(),
      totalAmount: total.toString(),
      commission: commission.toString()
    });
  } catch (e) {
    console.error('Price error:', e);
    res.json({ ok: false, error: e.message });
  }
});

// подготовка параметров для покупки
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
    const baseAmount = BigInt(init.data.amount);

    // 2) getBuyStarsLink
    const link = await axios.post(
      `${TP}/getBuyStarsLink`,
      new URLSearchParams({ id: req_id }).toString(),
      { headers: HEAD }
    );
    if (!link.data.ok) {
      return res.status(400).json({ ok: false, error: 'link failed' });
    }
    const { address: destAddress, amount: linkAmount, payload } = link.data;
    const payloadB64 = payload;

    // 3) добавляем комиссию
    const { total, commission } = addCommission(baseAmount, quantity);

    // возвращаем фронту два сообщения
    return res.json({
      ok: true,
      validUntil: Math.floor(Date.now() / 1000) + 60,
      messages: [
        {
          address: destAddress,
          amount: baseAmount.toString(),   // плата за звезды
          payload: payloadB64
        },
        {
          address: COMMISSION_ADDRESS,
          amount: commission.toString()    // комиссия
          // payload не нужен
        }
      ]
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
