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

    if (typeof chatId !== "string" || !/^[0-9a-fA-F]{24}$/.test(chatId)) {
        return res.status(400).json({ message: "Invalid chatId format" });
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

        await Chat.findByIdAndUpdate(chatId, { lastMessage: message });

        res.json(message);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Toggle reaction for a message (one active reaction per user per message)
export const toggleMessageReaction = async (req, res) => {
    const { messageId } = req.params;
    const { emoji } = req.body;

    if (!emoji || typeof emoji !== "string") {
        return res.status(400).json({ message: "Emoji is required" });
    }

    if (!messageId || !/^[0-9a-fA-F]{24}$/.test(messageId)) {
        return res.status(400).json({ message: "Invalid messageId format" });
    }

    try {
        const message = await Message.findById(messageId).populate("chat", "participants");

        if (!message) {
            return res.status(404).json({ message: "Message not found" });
        }

        const isParticipant = message.chat?.participants?.some(
            (participant) => String(participant?._id || participant) === String(req.user._id)
        );

        if (!isParticipant) {
            return res.status(403).json({ message: "Not allowed to react to this message" });
        }

        const existingIndex = message.reactions.findIndex(
            (reaction) => String(reaction.user) === String(req.user._id)
        );

        if (existingIndex >= 0) {
            const existingReaction = message.reactions[existingIndex];
            if (existingReaction.emoji === emoji) {
                // Toggle off same reaction
                message.reactions.splice(existingIndex, 1);
            } else {
                // Replace reaction with a new emoji
                message.reactions[existingIndex].emoji = emoji;
            }
        } else {
            message.reactions.push({
                user: req.user._id,
                emoji,
            });
        }

        await message.save();

        const updatedMessage = await Message.findById(messageId)
            .populate("sender", "username avatar email")
            .populate({
                path: "chat",
                populate: {
                    path: "participants",
                    select: "_id username avatar",
                },
            })
            .populate("reactions.user", "_id username avatar");

        res.json(updatedMessage);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
