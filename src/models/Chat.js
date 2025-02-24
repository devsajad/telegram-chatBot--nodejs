import mongoose from "mongoose";

const chatSchema = new mongoose.Schema(
  {
    userId: { type: Number, required: true, unique: true },
    fightMessages: { type: Array, default: [] },
    sexMessages: { type: Array, default: [] },
  },
  { timestamps: true }
);

const Chat = mongoose.model("Chat", chatSchema);
export default Chat;
