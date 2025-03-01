import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/User.js";
import bot from "../bot/bot.js";

dotenv.config();

// Connect to MongoDB using the connection string from .env
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected...");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1); // Exit the process if connection fails
  }
};

// Send message to all users
const sendMessageToAllUsers = async (message) => {
  try {
    const users = await User.find({});
    for (const user of users) {
      try {
        await bot.telegram.sendMessage(user.telegramId, message);
        console.log(`Message sent to user: ${user.telegramId}`);
      } catch (error) {
        console.error(
          `Failed to send message to user: ${user.telegramId}`,
          error
        );
      }
    }
  } catch (error) {
    console.error("Error fetching users:", error);
  } finally {
    mongoose.connection.close();
  }
};

// Run the script
const run = async () => {
  await connectDB();
  const message =
    "به علت بروزرسانی چت بات از دسترس خارج شد ⌛\nاز صبر شما ممنونیم 🙏😌";
  await sendMessageToAllUsers(message);
};

run();
