// server.js
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

// Простая обёртка для form-запросов к tpayer
async function postForm(path, data) {
  const res = await axios.post(
    TP + path,
    new URLSearchParams(data),
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
    // возвращаем recipient-id (и можно отдавать имя/аватар, если нужно)
    res.json({ ok: true, recipient: rec.recipient, name: rec.name, photo: rec.photo });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// 2) Генерация payload для покупки; подписывать и отправлять будет кошелёк клиента
app.post('/api/buy', async (req, res) => {
  try {
    const { recipient, quantity } = req.body;

    // initBuyStarsRequest → req_id
    const init = await postForm('/initBuyStarsRequest', { recipient, quantity });
    if (!init.ok) {
      return res.status(400).json({ ok: false, error: 'initBuyStarsRequest failed' });
    }
    const req_id = init.req_id;

    // getBuyStarsLink → адрес, amount, payload
    const link = await postForm('/getBuyStarsLink', { id: req_id });
    if (!link.ok) {
      return res.status(400).json({ ok: false, error: 'getBuyStarsLink failed' });
    }

    // Формируем ответ, который передаст фронтенду Ton Connect
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
