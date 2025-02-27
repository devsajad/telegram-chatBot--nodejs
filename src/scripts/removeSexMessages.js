import mongoose from "mongoose";
import dotenv from "dotenv";
import Chat from "../models/Chat.js";

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

// Clear sexMessages for all users
const clearSexMessages = async () => {
  try {
    await Chat.updateMany({}, { $set: { sexMessages: [] } });
    console.log("All sexMessages have been cleared.");
  } catch (error) {
    console.error("Error clearing sexMessages:", error);
  } finally {
    mongoose.connection.close();
  }
};

// Run the script
const run = async () => {
  await connectDB();
  await clearSexMessages();
};

run();
