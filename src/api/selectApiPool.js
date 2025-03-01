import dotenv from "dotenv";
dotenv.config();
import apiPool from "./apiPool.js";

// Updates the counters for one API key based on the current time.
function updateApiCounters(api) {
  const now = Date.now();
  if (now >= api.minuteResetTime) {
    api.requestsThisMinute = 0;
    api.minuteResetTime = now + 60 * 1000 * process.env.API_LIMITATION_MINUTES;
  }
  if (now >= api.dayResetTime) {
    api.requestsToday = 0;
    api.dayResetTime = now + 24 * 60 * 60 * 1000;
  }
}

// Selects an API key that is not rate-limited.
export function selectApi() {
  const now = Date.now();
  // Update all keys first.
  apiPool.forEach(updateApiCounters);
  // Find all keys that are below both limits.
  const available = apiPool.filter(
    (api) =>
      api.requestsThisMinute < process.env.REQ_PER_MIN &&
      api.requestsToday < process.env.REQ_PER_DAY
  );
  if (available.length === 0) return null;
  // Here you can choose a strategy: for instance, pick the one with the fewest requests this minute.
  available.sort((a, b) => a.requestsThisMinute - b.requestsThisMinute);
  return available;
}

// Returns the number of seconds until the next API key becomes available.
export function getTimeUntilNextAvailable() {
  const now = Date.now();
  // Get the smallest remaining time from minute resets.
  const remainingTimes = apiPool.map((api) =>
    Math.max(api.minuteResetTime - now, 0)
  );
  return Math.min(...remainingTimes) / 1000; // in seconds
}
