// ✅ Function to get the current API key and rotate it every X minutes
export default function getNextApiKey() {
    currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
    console.log(`🔄 Switching to API Key: ${currentKeyIndex + 1}`);
    return API_KEYS[currentKeyIndex];
  }