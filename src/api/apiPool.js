import dotenv from "dotenv";
dotenv.config();

const apiPool = [];
const apiKeyPrefix = "API_KEY_";
const apiKeys = Object.keys(process.env).filter((key) =>
  key.startsWith(apiKeyPrefix)
);

apiKeys.forEach((key) => {
  apiPool.push({
    key: process.env[key],
    requestsThisMinute: 0,
    minuteResetTime: Date.now() + 60 * 1000,
    // requestsToday: 0,
    // dayResetTime: Date.now() + 24 * 60 * 60 * 1000,
  });
});

export default apiPool;
