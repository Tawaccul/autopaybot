// api/yookassa_webhook.js
require('dotenv').config(); // Для локальной отладки, на Render не обязательно
const telegram = require('../telegram'); // Убедитесь, что путь правильный
const kv = require('../kv'); // Убедитесь, что путь правильный
const express = require('express'); // Добавляем Express
const app = express();
app.use(express.json()); // Для парсинга JSON тела запроса от Yookassa

console.log('📌 [Webhook] Module loaded at:', new Date().toISOString());

// **Важно для Render Web Service:**
// Определяем маршрут, по которому Yookassa будет отправлять запросы
app.post('/yookassa_webhook', async (req, res) => {
  console.log('🚀 [Webhook] Start processing at:', new Date().toISOString());
  console.log('📌 [Webhook] Request body:', JSON.stringify(req.body, null, 2));

  try {
    console.log('📌 [Step 1] Parsing webhook body');
    const { event, object } = req.body;

    if (event !== 'payment.succeeded') {
      console.log('ℹ️ [Step 1] Ignored event:', event);
      return res.status(200).send('Ignored');
    }

    console.log('📌 [Step 2] Extracting metadata');
    const metadata = object.metadata || {};
    console.log('📦 [Step 2] Metadata:', metadata);

    const { user_id: userId, months } = metadata;
    if (!userId || !months) {
      console.error('❌ [Step 2] Missing metadata:', metadata);
      return res.status(400).send('Missing metadata');
    }

    console.log(`✅ [Step 2] userId=${userId}, months=${months}`);

    console.log('📌 [Step 3] Calculating expiry date');
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + parseInt(months, 10));
    console.log('⏳ [Step 3] Calculated expiryDate:', expiryDate.toISOString());

    console.log('📌 [Step 4] Saving to Redis');
    const redisKey = `sub:${userId}`;
    try {
      await kv.set(redisKey, expiryDate.toISOString());
      console.log(`🗄️ [Step 4] Subscription stored under ${redisKey}`);
    } catch (redisError) {
      console.error('❌ [Step 4] Redis error:', redisError.message, redisError.stack);
      return res.status(500).send(`Redis error: ${redisError.message}`);
    }

    console.log('📌 [Step 5] Initializing Telegram API');
    console.log('📌 [Step 5] BOT_TOKEN:', process.env.BOT_TOKEN ? 'Present' : 'Missing');
    console.log('📌 [Step 5] CHANNEL_ID:', process.env.CHANNEL_ID);

    let inviteLink;
    try {
      const expiryTimestamp = Math.floor(expiryDate.getTime() / 1000);
      console.log('⏳ [Step 5] Expiry timestamp:', expiryTimestamp, 'Current timestamp:', Math.floor(Date.now() / 1000));
      inviteLink = await telegram.createChatInviteLink(
        process.env.CHANNEL_ID,
        {
          expire_date: expiryTimestamp,
          member_limit: 1
        }
      );
      console.log('🔗 [Step 5] Invite link created:', inviteLink.invite_link);
    } catch (err) {
      console.error('❌ [Step 5] Error creating invite link:', err.message, err.stack);
      return res.status(500).send(`Failed to create invite link: ${err.message}`);
    }

    console.log('📌 [Step 6] Sending message to user');
    try {
      await telegram.sendMessage(
        userId,
        `✅ Платёж подтверждён!\n🔗 Ваша инвайт‑ссылка: ${inviteLink.invite_link}\n` +
        `⏳ Действует до ${expiryDate.toLocaleDateString('ru-RU')}`,
        { disable_web_page_preview: true }
      );
      console.log('📨 [Step 6] Invite sent to user:', userId);
    } catch (err) {
      console.error('❌ [Step 6] Error sending message to user:', err.message, err.stack);
      return res.status(500).send(`Failed to send invite link: ${err.message}`);
    }

    console.log('📌 [Step 7] Webhook completed successfully');
    return res.status(200).send('OK');
  } catch (error) {
    console.error('🔥 [Webhook] UNCAUGHT ERROR:', error.message, error.stack);
    return res.status(500).send(`Internal error: ${error.message}`);
  }
});

// Запуск Express сервера
const PORT = process.env.PORT || 3001; // Используем другой порт, чтобы не конфликтовать с ботом
app.listen(PORT, () => {
  console.log(`🚀 Yookassa Webhook server listening on port ${PORT}`);
});

// Удаляем module.exports = async (req, res) => { ... } так как Express сам обрабатывает запросы