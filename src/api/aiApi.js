import dotenv from "dotenv";
dotenv.config();

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
  sendingProblemMessage,
} from "../bot/messages/messages.js";
import { selectApi, getTimeUntilNextAvailable } from "../api/selectApiPool.js";

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

const aiModel = "google/gemini-exp-1206:free";
const safety = [
  { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
];

export default async function aiApi(
  userId,
  message,
  state,
  sex,
  messageId,
  ctx
) {
  try {
    // Retrieve user document.
    let user = await User.findOne({ telegramId: userId });
    if (!user)
      return state === "fight"
        ? userNotFoundMessageFight
        : userNotFoundMessagesexy;

    // Check API availability.
    const selectedApi = selectApi();
    if (!selectedApi) {
      const waitTime = getTimeUntilNextAvailable();
      return watingSecondMessage(Math.ceil(waitTime));
    }

    // Configure OpenAI client with the selected API key.
    const openai = openAiConfig(selectedApi.key);
    // Increment counters before sending the request.
    selectedApi.requestsThisMinute++;
    selectedApi.requestsToday++;

    // Retrieve or create a chat session for the user.
    let chatSession = await getUserChatSession(user, state, sex);
    // console.log("Formatted chat history:", chatSession);

    // Send request to OpenRouter using the OpenAI API interface with streaming.
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
      stream: true, // Enable streaming mode.
    });

    let responseText = "";
    // Process each streamed chunk.
    for await (const chunk of completion) {
      responseText += chunk.choices[0].delta.content || "";
      if (responseText.trim() !== "") {
        try {
          await ctx.telegram.editMessageText(
            ctx.chat.id,
            messageId,
            null,
            responseText
          );
        } catch (editError) {
          // console.log("Edit message error:", editError);
        }
      }
    }

    // Save chat history.
    await saveChatMessage(user, message, responseText, state);
    return responseText;
  } catch (error) {
    console.log("Ai Api problem:", error);
    // If we hit a rate-limit error, mark this API key as exhausted and retry.
    if (error.code === 429 || error.status === 401) {
      selectedApi.requestsThisMinute = 10;
    }
    return sendingProblemMessage;
  }
}

async function getUserChatSession(user, state, sex) {
  // Retrieve the chat document using lean() for performance.
  let chat = user.chatId ? await Chat.findById(user.chatId).lean() : null;

  if (!chat) {
    // Create a new chat document if it doesn't exist.
    chat = await new Chat({
      userId: user.telegramId,
      fightMessages: defaultFightMessages,
      sexMessages: defaultSexyMessages(sex),
    }).save();

    user.chatId = chat._id;
    await user.save();
    chat = await Chat.findById(user.chatId).lean();
  }

  // Ensure default messages are present.
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

  // Select messages based on state and convert stored messages to the expected format.
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
  if (!user.chatId) return;
  let chat = await Chat.findById(user.chatId);
  if (!chat) return;
  // Save messages in your stored schema (with parts).
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
