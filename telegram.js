require('dotenv').config();
const { Telegraf } = require('telegraf');

const telegram = new Telegraf(process.env.BOT_TOKEN).telegram;

module.exports = telegram;
