import dotenv from "dotenv";
dotenv.config();

import { Mongo } from "@telegraf/session/mongodb";
import { session, Telegraf } from "telegraf";
import aiApi from "../api/aiApi.js";
import createUserToDB from "../utils/createUser.js";
import {botMessages} from "./messages/messages.js";
import { StartBtn } from "./keyboard/markupKeyboard.js";

// MongoDB session store
const store = Mongo({
  url: process.env.MONGODB_URI,
  database: "chatBot",
  collection: "sessions",
});

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// Use session middleware
bot.use(session({ store }));

// Middleware to make sure session exists
bot.use((ctx, next) => {
  if (!ctx.session) ctx.session = {}; // Ensure session is always initialized
  return next();
});

bot.start((ctx) => {
  const {
    id,
    first_name: firstName,
    last_name: lastName,
    username,
  } = ctx.message.from;

  ctx.reply(botMessages.welcome(firstName), StartBtn());
  createUserToDB(id, firstName, lastName, username);

  if (!ctx.session.state) {
    ctx.session.state = "";
  }
});

bot.action("start", (ctx) => {
  ctx.session.state = "start"; // Update session state
  ctx.reply("You clicked the start button!", AnotherBtn());
});

bot.hears("لا چاکت 🥸🔪", (ctx) => {
  ctx.session.state = "fight";
  ctx.reply("سلام من غلامم اینجام تا لاچاکتو باز کنم 🥸 کصت رو بگو ...");
});

bot.hears("هات چاکلت 🍫🔥", (ctx) => {
  ctx.session.state = "sexy";
  ctx.reply(
    "سلام من هات چاکلتم 😋 اینجام تا آبتو بیارم 💦\nبگو ببینم دوست داری چجوری خیست کنم 😈"
  );
});

// Example to check state on text message
bot.on("text", async (ctx) => {
  try {
    await ctx.sendChatAction("typing");

    const userMessage = ctx.message.text;
    const userId = ctx.message.from.id;

    const aiResponse = await aiApi(userId, userMessage, ctx.session.state);

    // Indicate typing action

    ctx.reply(aiResponse);
  } catch (error) {
    console.error("Error:", error);
    ctx.reply("مشکلی پیش اومد، لطفاً دوباره امتحان کن.");
  }
});

export default bot;
