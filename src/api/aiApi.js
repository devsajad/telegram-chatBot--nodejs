import dotenv from "dotenv";
dotenv.config();
import OpenAI from "openai";
import User from "../models/User.js";
import Chat from "../models/Chat.js";

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.GOOGLE_API_KEY_1,
  defaultHeaders: {
    "HTTP-Referer": "<YOUR_SITE_URL>", // Optional. Replace with your site URL.
    "X-Title": "<YOUR_SITE_NAME>", // Optional. Replace with your site name.
  },
});

export default async function aiApi(userId, message) {
  try {
    // Retrieve user document
    let user = await User.findOne({ telegramId: userId });
    if (!user) return "تو کدوم خری هستی ؟ باتو دوباره استارت بزن کصخل";

    // Retrieve or create a chat session for the user
    let chatSession = await getUserChatSession(user);
    console.log("Formatted chat history:", chatSession);

    // Send request to OpenRouter using the OpenAI API interface
    const completion = await openai.chat.completions.create({
      model: "google/gemini-2.0-flash-001",
      messages: [
        {
          role: "system",
          content:
            "به شدت هورنیه ( فارسی محاوره ای صحبت میکنه ) خیلی هورنیه و همیشه بالاست",
        },
        ...chatSession, // Append previous chat history (in the proper format)
        { role: "user", content: message },
      ],
    });
    const responseText = completion.choices[0].message.content;

    // Save chat history
    await saveChatMessage(user, message, responseText);

    return responseText;
  } catch (error) {
    console.error("Ai Api problem:", error);
    return "یه لحظه کص نگو سرم شلوغه";
  }
}

async function getUserChatSession(user) {
  // Use lean() to get a plain object instead of a Mongoose document
  let chat = user.chatId ? await Chat.findById(user.chatId).lean() : null;

  if (!chat) {
    // Create a new chat document if it doesn't exist
    chat = await new Chat({ userId: user.telegramId, messages: [] }).save();
    user.chatId = chat._id;
    await user.save();
    // Retrieve as plain object for consistency
    chat = await Chat.findById(user.chatId).lean();
  }

  // Convert stored messages to the expected format: { role, content }
  // Using destructuring and ternary operator for conciseness and performance.
  const formattedMessages = chat.messages.map(({ role, parts, content }) => {
    const finalRole = role === "model" ? "assistant" : role;
    if (typeof content === "string") {
      return { role: finalRole, content };
    } else if (Array.isArray(parts)) {
      return { role: finalRole, content: parts.map((p) => p.text).join("") };
    }
    return { role: finalRole, content: "" };
  });

  return formattedMessages;
}
async function saveChatMessage(user, userMessage, aiResponse) {
  let chat = await Chat.findById(user.chatId);
  if (!chat) return;
  // Save messages using your current schema (with parts)
  chat.messages.push({ role: "user", parts: [{ text: userMessage }] });
  chat.messages.push({ role: "model", parts: [{ text: aiResponse }] });
  await chat.save();
}
