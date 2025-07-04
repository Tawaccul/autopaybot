require('dotenv').config();
const express = require('express');
const app = express();
const telegram = require('../telegram');
const kv = require('../kv');

app.use(express.json());

app.post('/yookassa_webhook', async (req, res) => {
  const { event, object } = req.body;
  if (event !== 'payment.succeeded') {
    return res.status(200).send('Ignored');
  }

  const metadata = object.metadata || {};
  const userId = metadata.user_id;
  const durationSec = parseInt(metadata.durationSec, 10);

  if (!userId || !durationSec) {
    return res.status(400).send('Missing metadata');
  }

  // вычисляем момент истечения
  const expiryDate = new Date(Date.now() + durationSec * 1000);

  // сохраняем в Redis и даём ключу TTL
  const redisKey = `sub:${userId}`;
  try {
    await kv.set(redisKey, expiryDate.toISOString());
    // если у вашего kv есть метод expire:
    await kv.expire(redisKey, durationSec);
    // или, если нет — используйте SETEX
    // await kv.set(redisKey, expiryDate.toISOString(), 'EX', durationSec);
  } catch (err) {
    console.error('Redis error:', err);
    return res.status(500).send('Redis error');
  }

  // создаем инвайт-ссылку, которая автоматически истекает
  const expireTs = Math.floor(expiryDate.getTime() / 1000);
  let invite;
  try {
    invite = await telegram.createChatInviteLink(process.env.CHANNEL_ID, {
      expire_date: expireTs,
      member_limit: 1
    });
  } catch (err) {
    console.error('Ошибка создания invite link:', err);
    return res.status(500).send('Invite link error');
  }

  // шлём пользователю ссылку
  try {
    await telegram.sendMessage(
      userId,
      `✅ Платёж подтверждён!\n` +
      `Вот ваша ссылка (действует ${durationSec} сек):\n` +
      `${invite.invite_link}`,
      { disable_web_page_preview: true }
    );
  } catch (err) {
    console.error('Ошибка отправки инфоуказания:', err);
    // не фатально — двигаемся дальше
  }

  // запланируем «кик» по таймауту
  setTimeout(async () => {
    try {
      await telegram.kickChatMember(process.env.CHANNEL_ID, userId);
      console.log(`User ${userId} kicked after ${durationSec} seconds`);
      // опционально удаляем из Redis
      await kv.del(redisKey);
    } catch (err) {
      console.error('Failed to kick user:', err);
    }
  }, durationSec * 1000);

  return res.status(200).send('OK');
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`YooKassa webhook on port ${PORT}`);
});
