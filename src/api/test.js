import dotenv from "dotenv";
dotenv.config();

import axios from "axios";
import User from "../models/User.js";
import Chat from "../models/Chat.js";

const client = {
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
};

export default async function aiApi(userId, message) {
  try {
    // Retrieve user document
    let user = await User.findOne({ telegramId: userId });
    if (!user) return "تو کدوم خری هستی؟ باتو دوباره استارت بزن کصخل";

    // Retrieve or create a chat session for the user
    let chatSession = await getUserChatSession(user);

    // Send request to OpenRouter AI
    const response = await axios.post(
      `${client.baseURL}/chat/completions`,
      {
        model: "google/gemini-2.0-flash-001",
        messages: [
          {
            role: "system",
            content:
              "به پیامای مختلف واکنش نشون میده (به زبان فارسی محاوره‌ای صحبت میکنه) و به شدت بی‌ادبه و فحشای بد میده",
          },
          ...chatSession.messages,
          {
            role: "user",
            content: [{ type: "text", text: message }],
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${client.apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    const completion = response.data;
    let responseText =
      completion.choices?.[0]?.message?.content || "خطایی رخ داد";

    // 🔥 Save chat history
    await saveChatMessage(user, message, responseText);

    return responseText;
  } catch (error) {
    console.log("Ai Api problem:", error);
    return "یه لحظه کص نگو سرم شلوغه";
  }
}

async function getUserChatSession(user) {
  let chat = await Chat.findById(user.chatId);

  if (!chat) {
    chat = new Chat({ userId: user.telegramId, messages: [] });
    await chat.save();
    user.chatId = chat._id;
    await user.save();
  }

  return { messages: chat.messages };
}

async function saveChatMessage(user, userMessage, aiResponse) {
  let chat = await Chat.findById(user.chatId);
  if (!chat) return;

  chat.messages.push({
    role: "user",
    content: [{ type: "text", text: userMessage }],
  });
  chat.messages.push({
    role: "model",
    content: [{ type: "text", text: aiResponse }],
  });

  await chat.save();
}
