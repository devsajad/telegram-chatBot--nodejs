import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

const apiKeys = Object.keys(process.env)
    .filter(key => key.startsWith('API_KEY_'))
    .map(key => process.env[key]);

const AI_MODEL = "google/gemini-exp-1206:free";
const SAFETY_SETTINGS = [
    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
];

async function validateApiKeys() {
    for (const apiKey of apiKeys) {
        try {
            const response = await axios.post(
                "https://openrouter.ai/api/v1/chat/completions",
                {
                    model: AI_MODEL,
                    messages: [
                        { role: "system", content: "Test system instruction" },
                        { role: "user", content: "Test message" },
                    ],
                    safety_settings: SAFETY_SETTINGS,
                },
                {
                    headers: {
                        "Authorization": `Bearer ${apiKey}`,
                        "HTTP-Referer": "safe",
                        "X-Title": "safe",
                    },
                }
            );
            console.log(`API Key ${apiKey} is valid. Response:`, response.data);
        } catch (error) {
            console.log(`API Key ${apiKey} is invalid:`, error.message);
        }
    }
}

validateApiKeys();