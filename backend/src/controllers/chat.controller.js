import Chat from "../models/chat.model.js";
import Message from "../models/message.model.js";
import User from "../models/user.model.js";

// Fetch all chats for the logged-in user
export const getChats = async (req, res) => {
    try {
        const chats = await Chat.find({
            participants: { $in: [req.user._id] },
        })
            .populate("participants", "-password")
            .populate("lastMessage")
            .sort({ updatedAt: -1 });

        res.json(chats);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Create or get a one-on-one chat
export const accessChat = async (req, res) => {
    const { userId } = req.body;

    if (!userId) {
        return res.status(400).json({ message: "UserId not sent with request" });
    }

    try {
        let chat = await Chat.findOne({
            isGroup: false,
            $and: [
                { participants: { $elemMatch: { $eq: req.user._id } } },
                { participants: { $elemMatch: { $eq: userId } } },
            ],
        })
            .populate("participants", "-password")
            .populate("lastMessage");

        if (chat) {
            res.send(chat);
        } else {
            const chatData = {
                participants: [req.user._id, userId],
                isGroup: false,
            };
            const createdChat = await Chat.create(chatData);
            const fullChat = await Chat.findOne({ _id: createdChat._id }).populate(
                "participants",
                "-password"
            );
            res.status(201).send(fullChat);
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Fetch messages for a specific chat
export const getMessages = async (req, res) => {
    try {
        const messages = await Message.find({ chat: req.params.chatId })
            .populate("sender", "username avatar email")
            .populate("chat");
        res.json(messages);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Send a message
export const sendMessage = async (req, res) => {
    const { content, chatId } = req.body;

    if (!content || !chatId) {
        return res.status(400).json({ message: "Invalid data passed into request" });
    }

    const newMessage = {
        sender: req.user._id,
        content,
        chat: chatId,
    };

    try {
        let message = await Message.create(newMessage);

        message = await message.populate("sender", "username avatar");
        message = await message.populate("chat");
        message = await User.populate(message, {
            path: "chat.participants",
            select: "username avatar email",
        });

        await Chat.findByIdAndUpdate(req.body.chatId, { lastMessage: message });

        res.json(message);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
