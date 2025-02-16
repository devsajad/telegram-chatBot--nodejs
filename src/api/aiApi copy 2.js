import dotenv from "dotenv";
dotenv.config();

import { GoogleGenerativeAI } from "@google/generative-ai";
import User from "../models/User.js";
import Chat from "../models/Chat.js";

// 🔥 Multiple API Keys (ROTATION ENABLED)
const API_KEYS = [
  process.env.GOOGLE_API_KEY_1,
  process.env.GOOGLE_API_KEY_2,
  process.env.GOOGLE_API_KEY_3,
];

let currentKeyIndex = 0; // Start with the first key

// ✅ Function to get the current API key and rotate it every X minutes
function getNextApiKey() {
  currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
  console.log(`🔄 Switching to API Key: ${currentKeyIndex}`);
  return API_KEYS[currentKeyIndex];
}

// 🔥 Create GenerativeAI Model (with Dynamic API Key)
function createModel() {
  return new GoogleGenerativeAI(getNextApiKey()).getGenerativeModel({
    model: "gemini-2.0-pro-exp-02-05",
    systemInstruction:
      "به پیامای مختلف واکنش نشون میده ( به زبان فارسی محاوره ای صحبت میکنه ) و به شدت بی ادبه و فحشای بد میده",
  });
}

// ✅ Auto-Rotate API Key Every 5 Minutes
setInterval(() => {
  getNextApiKey();
}, 5 * 60 * 1000); // 5 minutes

export default async function aiApi(userId, message) {
  try {
    let user = await User.findOne({ telegramId: userId });
    if (!user) return "تو کدوم خری هستی ؟ باتو دوباره استارت بزن کصخل";

    let chatSession = await getUserChatSession(user);

    let responseText = await sendMessageWithRetry(chatSession, message);

    await saveChatMessage(user, message, responseText);
    return responseText;
  } catch (error) {
    console.error("Ai Api problem:", error);
    return "یه لحظه کص نگو سرم شلوغه";
  }
}

// ✅ **Handles API Rate Limit (429) & Retries with API Rotation**
async function sendMessageWithRetry(chatSession, message, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      let result = await chatSession.sendMessageStream(message);
      let responseText = "";

      for await (const chunk of result.stream) {
        responseText += chunk.text();
      }

      return responseText;
    } catch (error) {
      if (error.status === 429) {
        console.log(`🔥 Rate limited! Switching API Key and Retrying...`);
        getNextApiKey(); // Rotate API key
        chatSession = createModel().startChat(); // Reinitialize with new key
        await new Promise((resolve) => setTimeout(resolve, (attempt + 1) * 1000));
      } else {
        throw error;
      }
    }
  }
  return "اوووف! یه کم استراحت بده، سرم شلوغه 😵‍💫";
}

// ✅ **Retrieve or Create Chat Session**
async function getUserChatSession(user) {
  let chat = user.chatId ? await Chat.findById(user.chatId) : null;

  if (!chat) {
    chat = new Chat({ userId: user.telegramId, messages: [] });
    await chat.save();
    user.chatId = chat._id;
    await user.save();
  }

  return createModel().startChat({ history: chat.messages });
}

// ✅ **Save Messages to MongoDB**
async function saveChatMessage(user, userMessage, aiResponse) {
  let chat = await Chat.findById(user.chatId);
  if (!chat) return;

  chat.messages.push({ role: "user", parts: [{ text: userMessage }] });
  chat.messages.push({ role: "model", parts: [{ text: aiResponse }] });

  await chat.save();
}
