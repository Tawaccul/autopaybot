require('dotenv').config();
const { Telegraf } = require('telegraf');
const axios = require('axios');
const kv = require('../kv');

const bot = new Telegraf(process.env.BOT_TOKEN);

if (process.env.VERCEL) {
    module.exports = async (req, res) => {
      try {
        await bot.handleUpdate(req.body, res);
        res.status(200).send('OK');
      } catch (err) {
        console.error(err);
        res.status(500).send('Error');
      }
    };
  } else {
    bot.launch().catch(console.error);
  }
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
    return ctx.reply('⚠️ Ваша подписка истекла.');
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

// Запускай бота локально, если нужно
if (process.env.NODE_ENV !== 'production') {
  bot.launch().catch(console.error);
}

module.exports = { bot };
