import mongoose from "mongoose";

const chatSchema = new mongoose.Schema(
  {
    userId: { type: Number, required: true, unique: true },
    messages: { type: Array, default: [] }, // 🔥 Store only messages, not the session object
  },
  { timestamps: true }
);

const Chat = mongoose.model("Chat", chatSchema);
export default Chat;
