// api/bot.js
require('dotenv').config(); // Для локальной отладки, на Render не обязательно
const { Telegraf } = require('telegraf');
const express = require('express'); // Добавляем Express
const axios = require('axios');
const kv = require('../kv'); // Убедитесь, что путь правильный
const telegram = require('../telegram'); // Убедитесь, что путь правильный

const bot = new Telegraf(process.env.BOT_TOKEN);
const app = express(); // Инициализируем Express приложение
app.use(express.json()); // Для парсинга JSON тела запроса от Telegram

// --- Ваш существующий код бота ---

bot.command('start', (ctx) => {
  ctx.reply('Выберите подписку:', {
    reply_markup: {
      inline_keyboard: [
        [{ text: '1 месяц - 1600₽', callback_data: 'sub_1' }],
        [{ text: '2 месяца - 2800₽', callback_data: 'sub_2' }],
        [{ text: '3 месяца - 3600₽', callback_data: 'sub_3' }]
      ]
    }
  });
});

bot.command('status', async (ctx) => {
  const userId = ctx.from.id;
  const redisKey = `sub:${userId}`;
  const expiry = await kv.get(redisKey);

  if (!expiry) {
    return ctx.reply('❌ У вас нет активной подписки.');
  }

  const expiryDate = new Date(expiry);
  const now = new Date();

  if (now > expiryDate) {
    ctx.reply('⚠️ Ваша подписка истекла.');
    // Добавляем логику удаления из канала, если подписка истекла
    try {
      await telegram.kickChatMember(process.env.CHANNEL_ID, userId);
      console.log(`User ${userId} kicked from channel ${process.env.CHANNEL_ID}`);
    } catch (error) {
      console.error(`Failed to kick user ${userId}:`, error.message);
    }
    return;
  }

  ctx.reply(`✅ Ваша подписка активна до ${expiryDate.toLocaleDateString('ru-RU')}`);
});

bot.action(/sub_(\d+)/, async (ctx) => {
  const userId = ctx.from.id;
  const months = parseInt(ctx.match[1]);
  const prices = { 1: 1600, 2: 2800, 3: 3600 };

  try {
    const payment = await axios.post(
      'https://api.yookassa.ru/v3/payments',
      {
        amount: { value: prices[months].toFixed(2), currency: 'RUB' },
        capture: true,
        confirmation: { type: 'redirect', return_url: process.env.YOOKASSA_RETURN_URL },
        description: `Подписка на ${months} мес.`,
        metadata: { user_id: userId, months }
      },
      {
        auth: {
          username: process.env.YOOKASSA_SHOP_ID,
          password: process.env.YOOKASSA_SECRET
        },
        headers: {
          'Idempotence-Key': `sub-${userId}-${Date.now()}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const paymentData = payment.data;
    await ctx.reply(`Ссылка для оплаты: ${paymentData.confirmation.confirmation_url}`);
  } catch (error) {
    console.error('Ошибка при создании платежа:', error.response ? error.response.data : error.message);
    ctx.reply('Ошибка при создании платежа');
  }
});

// --- Конец вашего существующего кода бота ---

// **Важно для Render Web Service:**
// Обработчик вебхуков Telegram
app.post('/telegram-webhook', async (req, res) => {
  try {
    await bot.handleUpdate(req.body); // Telegraf обрабатывает входящее обновление
    res.status(200).send('OK');
  } catch (error) {
    console.error('❌ [Telegram Webhook] Error handling update:', error.message, error.stack);
    res.status(500).send('Internal Server Error');
  }
});

// Запуск Express сервера
const PORT = process.env.PORT || 3000; // Render предоставляет порт через process.env.PORT
app.listen(PORT, () => {
  console.log(`🚀 Telegram Bot Webhook server listening on port ${PORT}`);
});

// Удаляем bot.launch() из этого файла, так как он будет работать как вебхук
// if (process.env.NODE_ENV !== 'production') {
//   bot.launch().catch(console.error);
// }