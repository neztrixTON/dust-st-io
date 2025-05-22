// server.mjs
import 'dotenv/config';
import express from 'express';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

const TP = 'https://api.tpayer.net';

// Универсальная обёртка для POST form-data
async function postForm(path, data) {
  const res = await axios.post(
    TP + path,
    new URLSearchParams(data).toString(),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );
  return res.data;
}

// 1) Поиск получателя по username
app.post('/api/recipient', async (req, res) => {
  try {
    const { username } = req.body;
    const rec = await postForm('/searchStarsRecipient', { username });
    if (!rec.ok) {
      return res.status(404).json({ ok: false, error: 'Recipient not found' });
    }
    // Возвращаем id, имя и аватар (если есть)
    res.json({ ok: true, recipient: rec.recipient, name: rec.name, photo: rec.photo });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// 2) Расчёт цены (без комиссии) и подготовка payload
app.post('/api/price', async (req, res) => {
  try {
    const { recipient, quantity } = req.body;
    // initBuyStarsRequest возвращает amount (в TON)
    const init = await postForm('/initBuyStarsRequest', { recipient, quantity });
    if (!init.ok) {
      return res.status(400).json({ ok: false, error: 'init failed' });
    }
    const { amount } = init;
    // Возвращаем сумму в nanotons и TON для показа
    const nano = BigInt(Math.ceil(parseFloat(amount) * 1e9));
    res.json({ ok: true, amountTon: parseFloat(amount).toFixed(9), amountNano: nano.toString() });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// 3) Подготовка транзакции для Ton Connect
app.post('/api/buy', async (req, res) => {
  try {
    const { recipient, quantity } = req.body;
    // init → req_id
    const init = await postForm('/initBuyStarsRequest', { recipient, quantity });
    if (!init.ok) return res.status(400).json({ ok: false, error: 'init failed' });
    const req_id = init.req_id;

    // getBuyStarsLink → address, amount, payload
    const link = await postForm('/getBuyStarsLink', { id: req_id });
    if (!link.ok) return res.status(400).json({ ok: false, error: 'link failed' });

    // Отдаём фронту для Ton Connect
    res.json({
      ok: true,
      validUntil: Math.floor(Date.now() / 1000) + 3600,
      messages: [
        {
          to: link.address,
          amount: link.amount.toString(),
          payload: link.payload
        }
      ]
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
