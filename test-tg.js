// test-telegram.js
require('dotenv').config();
const { Telegraf } = require('telegraf');
const telegram = new Telegraf(process.env.BOT_TOKEN).telegram;

async function testInviteLink() {
  try {
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + 1);
    const expiryTimestamp = Math.floor(expiryDate.getTime() / 1000);
    console.log('⏳ Expiry timestamp:', expiryTimestamp);

    const inviteLink = await telegram.createChatInviteLink(
      process.env.CHANNEL_ID,
      {
        expire_date: expiryTimestamp,
        member_limit: 1
      }
    );
    console.log('🔗 Invite link created:', inviteLink.invite_link);

    await telegram.sendMessage(
      '964765596',
      `Тестовая инвайт-ссылка: ${inviteLink.invite_link}`
    );
    console.log('📨 Message sent to user');
  } catch (err) {
    console.error('❌ Ошибка:', err.message, err.stack);
  }
}

testInviteLink();