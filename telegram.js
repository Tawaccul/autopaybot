// telegram.js
const { Telegraf } = require('telegraf');

const bot = new Telegraf(process.env.BOT_TOKEN);

console.log('🤖 [Telegram] Telegraf bot client initialized for API calls.');

module.exports = {
  createChatInviteLink: async (chatId, options) => {
    try {
      const link = await bot.telegram.createChatInviteLink(chatId, options);
      console.log(`🔗 [Telegram] Invite link created for chat ${chatId}: ${link.invite_link}`);
      return link;
    } catch (error) {
      console.error('❌ [Telegram] Error creating chat invite link:', error.message, error.stack);
      throw error;
    }
  },

  sendMessage: async (chatId, text, extra) => {
    try {
      await bot.telegram.sendMessage(chatId, text, extra);
      console.log(`📨 [Telegram] Message sent to user ${chatId}`);
    } catch (error) {
      console.error('❌ [Telegram] Error sending message to user:', error.message, error.stack);
      throw error;
    }
  },

  kickChatMember: async (chatId, userId) => {
    try {
      await bot.telegram.kickChatMember(chatId, userId);
      console.log(`🚫 [Telegram] User ${userId} kicked from chat ${chatId}`);
    } catch (error) {
      console.error('❌ [Telegram] Error kicking chat member:', error.message, error.stack);
      throw error;
    }
  }
};