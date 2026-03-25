import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
    chat: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Chat",
        required: true
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    content: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ["text", "image", "call"],
        default: "text"
    },
    status: {
        type: String,
        enum: ["sent", "delivered", "read"],
        default: "sent"
    },
    reactions: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        emoji: {
            type: String,
            required: true,
            trim: true,
        }
    }]
}, { timestamps: true });

const Message = mongoose.model("Message", messageSchema);
export default Message;
