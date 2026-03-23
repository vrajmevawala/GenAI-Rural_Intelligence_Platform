const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");
const { info, error } = require("../utils/logger");

const token = process.env.TELEGRAM_TOKEN;
const backendUrl = `http://localhost:5001`;

let bot;

function initTelegramBot() {
  if (!token) {
    error("TELEGRAM_TOKEN is not defined in .env. Telegram bot will not start.");
    return;
  }

  bot = new TelegramBot(token, { polling: true });

  bot.on("polling_error", (err) => {
    error("Telegram bot polling error:", err.message);
  });

  info("Telegram bot initialized and polling...");

  bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, "🌾 Send crop image for disease detection");
  });

  bot.on("photo", async (msg) => {
    const chatId = msg.chat.id;
    const photo = msg.photo[msg.photo.length - 1]; // Get highest resolution
    const fileId = photo.file_id;

    try {
      bot.sendMessage(chatId, "Analyzing image...");

      const file = await bot.getFile(fileId);
      const imageUrl = `https://api.telegram.org/file/bot${token}/${file.file_path}`;

      // Call backend API
      const response = await axios.post(`${backendUrl}/api/disease/detect-disease`, {
        image_url: imageUrl
      });

      const result = response.data.data;
      const message = result.full_result || result.advice;
      
      bot.sendMessage(chatId, `✅ **Disease Analysis Profile**\n\n${message}`, { parse_mode: "Markdown" });
    } catch (err) {
      error("Error processing Telegram photo:", err.message);
      bot.sendMessage(chatId, "❌ Sorry, I couldn't analyze the image. Please try again later.");
    }
  });
}

module.exports = { initTelegramBot };
