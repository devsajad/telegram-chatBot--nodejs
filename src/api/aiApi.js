import dotenv from "dotenv";
dotenv.config();

import OpenAI from "openai";
import User from "../models/User.js";
import Chat from "../models/Chat.js";
import {
  userNotFoundMessagesexy,
  userNotFoundMessageFight,
  defaultSexyMessages,
  defaultFightMessages,
  sexySystemInstruct,
  fightSystemInstruct,
  sendingProblemMessage,
  watingSecondMessage,
} from "../bot/messages/messages.js";
import { selectApi, getTimeUntilNextAvailable } from "../api/selectApiPool.js";

// Constants
const AI_MODEL = "google/gemini-exp-1206:free";
const SAFETY_SETTINGS = [
  { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
];

// Function to configure OpenAI client using a given API key.
function openAiConfig(apiKey) {
  return new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: apiKey,
    defaultHeaders: {
      "HTTP-Referer": "safe", // Replace with your site URL if needed.
      "X-Title": "safe", // Replace with your site name if needed.
    },
  });
}

// Main API function
export default async function aiApi(
  userId,
  message,
  state,
  sex,
  messageId,
  ctx
) {
  let selectedApi;
  try {
    const user = await getUser(userId);
    if (!user) return getUserNotFoundMessage(state);

    selectedApi = selectApi();
    if (!selectedApi) return getWaitTimeMessage();

    const openai = openAiConfig(selectedApi.key);
    incrementApiCounters(selectedApi);

    const chatSession = await getUserChatSession(user, state, sex);
    const responseText = await getAiResponse(
      openai,
      chatSession,
      message,
      state,
      messageId,
      ctx
    );

    await saveChatMessage(user, message, responseText, state);

    return responseText;
  } catch (error) {
    handleApiError(error, selectedApi);
    return sendingProblemMessage;
  }
}

// Helper functions
async function getUser(userId) {
  return await User.findOne({ telegramId: userId });
}

function getUserNotFoundMessage(state) {
  return state === "fight" ? userNotFoundMessageFight : userNotFoundMessagesexy;
}

function getWaitTimeMessage() {
  const waitTime = getTimeUntilNextAvailable();
  return watingSecondMessage(Math.ceil(waitTime));
}

function incrementApiCounters(selectedApi) {
  selectedApi.requestsThisMinute++;
  selectedApi.requestsToday++;
}

async function getAiResponse(
  openai,
  chatSession,
  message,
  state,
  messageId,
  ctx
) {
  const completion = await openai.chat.completions.create({
    model: AI_MODEL,
    messages: [
      {
        role: "system",
        content: state === "fight" ? fightSystemInstruct : sexySystemInstruct,
      },
      ...chatSession,
      { role: "user", content: message },
    ],
    safety_settings: SAFETY_SETTINGS,
    stream: true,
  });

  let responseText = "";
  for await (const chunk of completion) {
    responseText += chunk.choices[0].delta.content || "";

    await updateMessage(ctx, messageId, responseText);
  }
  return responseText;
}

async function updateMessage(ctx, messageId, responseText) {
  if (responseText.trim() !== "") {
    try {
      await ctx.telegram.editMessageText(
        ctx.chat.id,
        messageId,
        null,
        responseText
      );
    } catch (editError) {
      console.log("Warning : Edit message error");
    }
  }
}

async function getUserChatSession(user, state, sex) {
  let chat = user.chatId ? await Chat.findById(user.chatId).lean() : null;

  if (!chat) {
    chat = await createNewChat(user, sex);
  }

  await ensureDefaultMessages(chat, sex);

  const messages = state === "fight" ? chat.fightMessages : chat.sexMessages;
  return formatMessages(messages);
}

async function createNewChat(user, sex) {
  const chat = await new Chat({
    userId: user.telegramId,
    fightMessages: defaultFightMessages,
    sexMessages: defaultSexyMessages(sex),
  }).save();

  user.chatId = chat._id;
  await user.save();
  return await Chat.findById(user.chatId).lean();
}

async function ensureDefaultMessages(chat, sex) {
  if (chat.fightMessages.length === 0) {
    chat.fightMessages = defaultFightMessages;
    await Chat.findByIdAndUpdate(chat._id, {
      fightMessages: defaultFightMessages,
    });
  }
  if (chat.sexMessages.length === 0) {
    chat.sexMessages = defaultSexyMessages(sex);
    await Chat.findByIdAndUpdate(chat._id, {
      sexMessages: defaultSexyMessages(sex),
    });
  }
}

function formatMessages(messages) {
  return messages.map(({ role, parts, content }) => {
    const finalRole = role === "model" ? "assistant" : role;
    if (typeof content === "string") {
      return { role: finalRole, content };
    } else if (Array.isArray(parts)) {
      return { role: finalRole, content: parts.map((p) => p.text).join("") };
    }
    return { role: finalRole, content: "" };
  });
}

async function saveChatMessage(user, userMessage, aiResponse, state) {
  if (!user.chatId) return;
  let chat = await Chat.findById(user.chatId);
  if (!chat) return;

  const messageData = { role: "user", parts: [{ text: userMessage }] };
  const responseData = { role: "model", parts: [{ text: aiResponse }] };

  if (state === "fight") {
    chat.fightMessages.push(messageData, responseData);
  } else {
    chat.sexMessages.push(messageData, responseData);
  }

  await chat.save();
}

function handleApiError(error, selectedApi) {
  console.log("Ai Api problem:", error);
  if (error.code === 429 || error.status === 401) {
    selectedApi.requestsThisMinute = 10;
  }
}
