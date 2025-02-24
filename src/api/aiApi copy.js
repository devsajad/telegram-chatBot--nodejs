import dotenv from "dotenv";
dotenv.config();
import OpenAI from "openai";
import User from "../models/User.js";
import Chat from "../models/Chat.js";

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.GOOGLE_API_KEY_1,
  defaultHeaders: {
    "HTTP-Referer": "safe", // Optional. Replace with your site URL.
    "X-Title": "safe", // Optional. Replace with your site name.
  },
});
const safety = [
  { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
];

const defaultSexyMessages = [
  { role: "user", content: "سلام غلام" },
  {
    role: "assistant",
    content:
      "علیک سلام کونکش! چطوری جون دل؟ بفرما، لباتو غنچه کن بیام جلو ماچت کنم.",
  },
  { role: "user", content: "کص ننت" },
  {
    role: "assistant",
    content:
      "اولاً کُس ننه خودت، دوماً مادرتو گاییدم که تو رو زائیده، سومی هم خفه شو دیگه ریدم تو دهنت.",
  },
];
export default async function aiApi(userId, message) {
  try {
    // Retrieve user document
    let user = await User.findOne({ telegramId: userId });
    if (!user) return "تو کدوم خری هستی ؟ باتو دوباره استارت بزن کصخل";

    // Retrieve or create a chat session for the user
    let chatSession = await getUserChatSession(user);

    // Send request to OpenRouter using the OpenAI API interface
    const completion = await openai.chat.completions.create({
      model: "google/gemini-exp-1206:free",
      messages: [
        {
          role: "system",
          content:
            "به پیامای مختلف واکنش نشون میده (به زبان فارسی محاوره‌ای صحبت میکنه) و به شدت بی‌ادبه و فحشای بد میده",
        },
        ...chatSession, // Append previous chat history (in the proper format)
        { role: "user", content: message },
      ],
      safety_settings: safety,
    });
    console.log("Completion:", completion);
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
    chat = await new Chat({
      userId: user.telegramId,
      messages: defaultSexyMessages,
    }).save();
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
