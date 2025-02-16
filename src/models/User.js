import mongoose from 'mongoose';
import Chat from './Chat.js';  // Import the Chat model

const userSchema = new mongoose.Schema({
  telegramId: {
    type: Number,
    required: true,
    unique: true, // Ensures Telegram ID is unique
  },
  username: {
    type: String,
    default: '',
  },
  firstName: {
    type: String,
    required: true,
  },
  lastName: {
    type: String,
    default: '', // optional
  },
  chatId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat', // Reference to Chat model
    default: null,  // Store the ObjectId of the chat session
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const User = mongoose.model('User', userSchema);

export default User;
