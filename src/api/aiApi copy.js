import dotenv from "dotenv";
dotenv.config();

import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

const model = genAI.getGenerativeModel({
  model: "gemini-2.0-pro-exp-02-05",
  systemInstruction:
    "به پیامای مختلف واکنش نشون میده ( به زبان فارسی محاوره ای صحبت میکنه ) و به شدت بی ادبه و فحشای بد میده",
});

let sessions = {};

export default async function aiApi(userId, message) {
  try {
    const chat = getUserChatSession(userId);
    let result = await chat.sendMessageStream(message);

    let responseText = "";
    for await (const chunk of result.stream) {
      responseText += chunk.text();
    }

    return responseText;
  } catch (error) {
    console.log("Ai Api problem : ", error);
    return "یه لحظه کص نگو سرم شلوغه";
  }
}

function getUserChatSession(userId) {
  console.log(sessions);
  console.log(sessions[userId]);

  if (!sessions[userId]) {
    sessions[userId] = model.startChat(); // Create a new chat session
  }
  return sessions[userId];
}
