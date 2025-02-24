import dotenv from "dotenv";
import OpenAI from "openai";
import User from "../models/User.js";
import Chat from "../models/Chat.js";
import {
  userNotFoundMessagesexy,
  userNotFoundMessageFight,
  fightErrorMessages,
  sexyErrorMessages,
  defaultSexyMessages,
  defaultFightMessages,
  sexySystemInstruct,
  fightSystemInstruct,
} from "../bot/messages/messages.js";

dotenv.config();

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.GOOGLE_API_KEY_1,
  defaultHeaders: {
    "HTTP-Referer": "safe", // Optional. Replace with your site URL.
    "X-Title": "safe", // Optional. Replace with your site name.
  },
});
const aiModel = "google/gemini-2.0-flash-001";
const safety = [
  { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
];

export default async function aiApi(userId, message, state) {
  try {
    // Retrieve user document
    let user = await User.findOne({ telegramId: userId });
    if (!user)
      return state === "fight"
        ? userNotFoundMessageFight
        : userNotFoundMessagesexy;

    // Retrieve or create a chat session for the user
    let chatSession = await getUserChatSession(user, state);

    // Send request to OpenRouter using the OpenAI API interface
    const completion = await openai.chat.completions.create({
      model: aiModel,
      messages: [
        {
          role: "system",
          content: state === "fight" ? fightSystemInstruct : sexySystemInstruct,
        },
        ...chatSession,
        { role: "user", content: message },
      ],
      safety_settings: safety,
    });
    console.log(completion);
    const responseText = completion.choices[0].message.content;

    // Save chat history
    await saveChatMessage(user, message, responseText, state);

    return responseText;
  } catch (error) {
    console.log("Ai Api problem:", error);
    return getRandomMessage(
      state === "fight" ? fightErrorMessages : sexyErrorMessages
    );
  }
}

async function getUserChatSession(user, state) {
  // Use lean() to get a plain object instead of a Mongoose document
  let chat = user.chatId ? await Chat.findById(user.chatId).lean() : null;

  if (!chat) {
    // Create a new chat document if it doesn't exist

    chat = await new Chat({
      userId: user.telegramId,
      fightMessages: defaultFightMessages,
      sexMessages: defaultSexyMessages,
    }).save();

    user.chatId = chat._id;
    await user.save();
    // Retrieve as plain object for consistency
    chat = await Chat.findById(user.chatId).lean();
  }

  // Convert stored messages to the expected format: { role, content }
  // Using destructuring and ternary operator for conciseness and performance.
  const messages = state === "fight" ? chat.fightMessages : chat.sexMessages;
  const formattedMessages = messages.map(({ role, parts, content }) => {
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

async function saveChatMessage(user, userMessage, aiResponse, state) {
  let chat = await Chat.findById(user.chatId);
  if (!chat) return;
  // Save messages using your current schema (with parts)
  if (state === "fight") {
    chat.fightMessages.push({ role: "user", parts: [{ text: userMessage }] });
    chat.fightMessages.push({ role: "model", parts: [{ text: aiResponse }] });
  } else {
    chat.sexMessages.push({ role: "user", parts: [{ text: userMessage }] });
    chat.sexMessages.push({ role: "model", parts: [{ text: aiResponse }] });
  }

  await chat.save();
}

function getRandomMessage(messages) {
  const randomIndex = Math.floor(Math.random() * messages.length);
  return messages[randomIndex];
}
