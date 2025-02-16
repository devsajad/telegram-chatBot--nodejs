import dotenv from "dotenv";
dotenv.config();

import { GoogleGenerativeAI } from "@google/generative-ai";
import User from "../models/User.js";
import Chat from "../models/Chat.js";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY_3);

const model = genAI.getGenerativeModel({
  model: "gemini-2.0-pro-exp-02-05",
  systemInstruction:
    "به پیامای مختلف واکنش نشون میده ( به زبان فارسی محاوره ای صحبت میکنه ) و به شدت بی ادبه و فحشای بد میده",
});

export default async function aiApi(userId, message) {
  try {
    // Retrieve user document
    let user = await User.findOne({ telegramId: userId });
    if (!user) return "تو کدوم خری هستی ؟ باتو دوباره استارت بزن کصخل";

    // Retrieve or create a chat session for the user
    let chatSession = await getUserChatSession(user);

    let result = await chatSession.sendMessageStream(message);

    let responseText = "";
    for await (const chunk of result.stream) {
      responseText += chunk.text();
    }

    // 🔥 Save chat history
    await saveChatMessage(user, message, responseText);

    return responseText;
  } catch (error) {
    console.log("Ai Api problem:", error);
    return "یه لحظه کص نگو سرم شلوغه";
  }
}

async function getUserChatSession(user) {
  let chat;

  if (user.chatId) {
    chat = await Chat.findById(user.chatId);
  }

  if (!chat) {
    chat = new Chat({ userId: user.telegramId, messages: [] });
    await chat.save();
    user.chatId = chat._id;
    await user.save();
  }

  // 🔥 Reinitialize the chat session with previous messages
  return model.startChat({ history: chat.messages });
}

async function saveChatMessage(user, userMessage, aiResponse) {
  let chat = await Chat.findById(user.chatId);
  if (!chat) return;

  chat.messages.push({ role: "user", parts: [{ text: userMessage }] });
  chat.messages.push({ role: "model", parts: [{ text: aiResponse }] });

  await chat.save();
}
