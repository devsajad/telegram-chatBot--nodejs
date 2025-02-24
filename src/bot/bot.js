import dotenv from "dotenv";
dotenv.config();

import { Mongo } from "@telegraf/session/mongodb";
import { session, Telegraf } from "telegraf";
import aiApi from "../api/aiApi.js";
import createUserToDB from "../utils/createUser.js";
import {
  backButtonMessage,
  botMessages,
  fightStartMessage,
  generalProblemMessage,
  incorrectTextMessage,
  newChatMessage,
  rulesMessage,
  sexyStartMessage,
} from "./messages/messages.js";
import { chatBotBtn, StartBtn } from "./keyboard/markupKeyboard.js";
import clearChatSession from "../utils/clearChatSession.js";

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

  ctx.session.state = "";
});

bot.action("start", (ctx) => {
  ctx.session.state = "start"; // Update session state
  ctx.reply("You clicked the start button!", AnotherBtn());
});

bot.hears("لا چاکت 🥸🔪", (ctx) => {
  ctx.session.state = "fight";
  ctx.reply(fightStartMessage, chatBotBtn());
});

bot.hears("هات چاکلت 🍫🔥", (ctx) => {
  ctx.session.state = "sexy";
  ctx.reply(sexyStartMessage, chatBotBtn());
});

bot.hears("درباره چت‌بات 🤖", (ctx) => {
  ctx.reply(rulesMessage);
});

bot.hears("بازگشت 🔙", (ctx) => {
  ctx.session.state = "";
  ctx.reply(backButtonMessage, StartBtn());
});

bot.hears("چت جدید  🆕", async (ctx) => {
  try {
    // Indicate loading action
    const loadingMessage = await ctx.reply("در حال پردازش...");

    await clearChatSession(ctx.message.from.id, ctx.session.state);

    // Edit the loading message to the final response
    await ctx.telegram.editMessageText(
      ctx.chat.id,
      loadingMessage.message_id,
      null,
      newChatMessage
    );
  } catch (error) {
    console.error("Error:", error);
    ctx.telegram.editMessageText(
      ctx.chat.id,
      loadingMessage.message_id,
      null,
      generalProblemMessage
    );
  }
});

// Example to check state on text message
bot.on("text", async (ctx) => {
  try {
    // Indicate typing action
    await ctx.sendChatAction("typing");
    if (ctx.session.state === "fight" || ctx.session.state === "sexy") {
      const userMessage = ctx.message.text;
      const userId = ctx.message.from.id;

      const initialMessage = await ctx.reply("در حال تایپ ...");

      await aiApi(
        userId,
        userMessage,
        ctx.session.state,
        initialMessage.message_id,
        ctx
      );
    } else {
      ctx.reply(incorrectTextMessage, chatBotBtn());
    }
  } catch (error) {
    console.error("Error:", error);
    ctx.reply(generalProblemMessage);
  }
});

export default bot;
