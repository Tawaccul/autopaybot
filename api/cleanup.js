    // api/cleanup.js
require('dotenv').config();
const kv = require('../kv');
const telegram = require('../telegram');

module.exports = async () => { // Для Cron Job не нужен req, res
  console.log('🧹 [Cleanup] Starting subscription cleanup at:', new Date().toISOString());

  try {
    const keys = await kv.keys('sub:*'); // Получаем все ключи подписок
    console.log(`🧹 [Cleanup] Found ${keys.length} subscription keys.`);

    for (const key of keys) {
      const userId = key.split(':')[1];
      const expiry = await kv.get(key);

      if (!expiry) {
        console.log(`🧹 [Cleanup] No expiry found for ${key}, skipping.`);
        continue;
      }

      const expiryDate = new Date(expiry);
      const now = new Date();

      if (now > expiryDate) {
        console.log(`🧹 [Cleanup] Subscription for user ${userId} expired. Expired on: ${expiryDate.toISOString()}`);
        try {
          // Удаляем пользователя из канала
          await telegram.kickChatMember(process.env.CHANNEL_ID, userId);
          console.log(`✅ [Cleanup] User ${userId} kicked from channel ${process.env.CHANNEL_ID}.`);

          // Удаляем запись из Redis
          await kv.del(key);
          console.log(`✅ [Cleanup] Subscription for ${userId} removed from Redis.`);
        } catch (kickError) {
          console.error(`❌ [Cleanup] Failed to kick user ${userId} or delete from Redis:`, kickError.message, kickError.stack);
        }
      } else {
        console.log(`🧹 [Cleanup] Subscription for user ${userId} is still active. Expires on: ${expiryDate.toISOString()}`);
      }
    }

    console.log('🧹 [Cleanup] Subscription cleanup completed.');
    // Cron Job не возвращает HTTP ответ, просто завершает выполнение
  } catch (error) {
    console.error('🔥 [Cleanup] UNCAUGHT ERROR during cleanup:', error.message, error.stack);
    // В случае ошибки, логируем ее
  }
};