import dotenv from "dotenv";
dotenv.config();

import { Telegraf } from "telegraf";

import aiApi from "../api/aiApi.js";
import createUserToDB from "../utils/createUser.js";

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

bot.start((ctx) => {
  const { id, first_name, last_name, username } = ctx.message.from;
  ctx.reply(
    "سلام من غلامم ، کصت رو بگو"
  );

  createUserToDB(id, first_name, last_name, username);
});

bot.on("text", async (ctx) => {
  try {
    const userMessage = ctx.message.text;
    const userId = ctx.message.from.id; // Get user ID

    const aiResponse = await aiApi(userId, userMessage);

    ctx.reply(aiResponse);
  } catch (error) {
    console.error("Error:", error);
    ctx.reply("مشکلی پیش اومد، لطفاً دوباره امتحان کن.");
  }
});

export default bot;
