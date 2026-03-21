import mongoose from "mongoose";

const chatSchema = new mongoose.Schema({
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],
    lastMessage: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Message"
    },
    groupName: {
        type: String,
        default: ""
    },
    isGroup: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

const Chat = mongoose.model("Chat", chatSchema);
export default Chat;
