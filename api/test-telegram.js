// api/test-telegram.js
module.exports = async (req, res) => {
    console.log('🚀 [Test] Starting Telegram API test at:', new Date().toISOString());
    const { Telegraf } = require('telegraf');
    const telegram = new Telegraf(process.env.BOT_TOKEN).telegram;
  
    console.log('📌 [Test] BOT_TOKEN:', process.env.BOT_TOKEN ? 'Present' : 'Missing');
    console.log('📌 [Test] CHANNEL_ID:', process.env.CHANNEL_ID);
  
    try {
      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + 1);
      const expiryTimestamp = Math.floor(expiryDate.getTime() / 1000);
      console.log('⏳ [Test] Expiry timestamp:', expiryTimestamp);
  
      const inviteLink = await telegram.createChatInviteLink(
        process.env.CHANNEL_ID,
        {
          expire_date: expiryTimestamp,
          member_limit: 1
        }
      );
      console.log('🔗 [Test] Invite link created:', inviteLink.invite_link);
  
      await telegram.sendMessage(
        '964765596',
        `Тестовая инвайт-ссылка: ${inviteLink.invite_link}`
      );
      console.log('📨 [Test] Message sent to user');
      res.status(200).send('Test successful');
    } catch (err) {
      console.error('❌ [Test] Error:', err.message, err.stack);
      res.status(500).send(`Test failed: ${err.message}`);
    }
  };