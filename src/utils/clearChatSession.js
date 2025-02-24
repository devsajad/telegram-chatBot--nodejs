import Chat from "../models/Chat.js";

const clearChatSession = async (userId, state) => {
    try {
        const chat = await Chat.findOne({ userId });

        if (!chat) {
            throw new Error("Chat session not found");
        }

        if (state === "fight") {
            chat.fightMessages = [];
        } else if (state === "sexy") {
            chat.sexMessages = [];
        }

        await chat.save();
    } catch (error) {
        console.error("Error clearing chat session:", error);
    }
};

export default clearChatSession;