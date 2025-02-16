import dotenv from "dotenv";
import bot from "./src/bot/bot.js";
import connectDB from './src/config/db.js';


dotenv.config();

// Connect to MongoDB
connectDB();

// Start Telegram Bot
bot.launch().then(() => {
  console.log("🤖 Bot is running...");
});

// Graceful shutdown handling
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
