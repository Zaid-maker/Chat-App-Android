import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { Server } from "socket.io";
import http from "http";
import connectDB from "./config/db.js";
import authRoutes from "./routes/auth.routes.js";
import chatRoutes from "./routes/chat.routes.js";
import userRoutes from "./routes/user.routes.js";
import callRoutes from "./routes/call.routes.js";
import User from "./models/user.model.js";
import Message from "./models/message.model.js";

dotenv.config();

const allowedOrigins = (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

const isAllowedOrigin = (origin) => {
    if (!origin) {
        return true;
    }

    if (allowedOrigins.length === 0) {
        return true;
    }

    return allowedOrigins.includes(origin);
};

const corsOptions = {
    origin: (origin, callback) => {
        if (isAllowedOrigin(origin)) {
            callback(null, true);
            return;
        }

        callback(new Error("CORS blocked: Origin not allowed"));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
};

const app = express();
const server = http.createServer(app);
// Render sits behind a reverse proxy, so trust the first proxy hop.
app.set("trust proxy", 1);
const io = new Server(server, {
    cors: corsOptions,
});
const activeSocketsByUserId = new Map();

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        message: "Too many requests, please try again later.",
    },
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        message: "Too many auth attempts, please try again later.",
    },
});

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use("/api", apiLimiter);
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/users", userRoutes);
app.use("/api/calls", callRoutes);

app.get("/", (req, res) => {
    res.send("API is running...");
});

app.get("/health", (req, res) => {
    res.status(200).json({
        status: "ok",
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
    });
});

// Error Handling Middleware
app.use((err, req, res, next) => {
    console.error('SERVER ERROR:', err.stack);
    res.status(500).json({
        message: err.message,
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
});

// Socket.io
io.on("connection", (socket) => {
    const clientIp = socket.handshake.address || "unknown";
    const userAgent = socket.handshake.headers["user-agent"] || "unknown";
    console.log(`🚀 SOCKET: App connected | id=${socket.id} ip=${clientIp}`);
    console.log(`🧭 SOCKET: Client info | user-agent=${userAgent}`);

    socket.on("join", (userId) => {
        socket.join(userId);
        socket.data.userId = userId;
        const currentCount = activeSocketsByUserId.get(userId) || 0;
        activeSocketsByUserId.set(userId, currentCount + 1);

        User.findByIdAndUpdate(userId, {
            isOnline: true,
            lastSeen: new Date(),
        }).catch((error) => {
            console.error(`❌ PRESENCE: Failed to mark user online (${userId}):`, error.message);
        });

        console.log(`✅ SOCKET: User ${userId} joined their room`);
    });

    socket.on("call:initiate", ({ toUserId, callId, type }) => {
        if (!toUserId) return;

        console.log(`📞 SOCKET: Call initiated | from=${socket.data.userId || "unknown"} to=${toUserId} callId=${callId}`);
        io.to(toUserId).emit("call:incoming", {
            callId,
            fromUserId: socket.data.userId || null,
            type: type || "voice",
            at: new Date().toISOString(),
        });
    });

    socket.on("call:accept", ({ toUserId, callId }) => {
        if (!toUserId) return;

        console.log(`✅ SOCKET: Call accepted | by=${socket.data.userId || "unknown"} to=${toUserId} callId=${callId}`);
        io.to(toUserId).emit("call:accepted", {
            callId,
            byUserId: socket.data.userId || null,
            at: new Date().toISOString(),
        });
    });

    socket.on("call:end", ({ toUserId, callId }) => {
        if (!toUserId) return;

        console.log(`🛑 SOCKET: Call ended | by=${socket.data.userId || "unknown"} to=${toUserId} callId=${callId}`);
        io.to(toUserId).emit("call:ended", {
            callId,
            byUserId: socket.data.userId || null,
            at: new Date().toISOString(),
        });
    });

    socket.on("new message", (message) => {
        console.log("📩 SOCKET: Received new message:", message.content);
        const chat = message.chat;
        if (!chat.participants) return console.log("⚠️ SOCKET: Chat participants not defined");

        chat.participants.forEach((user) => {
            if (user._id == message.sender._id) return;
            socket.in(user._id).emit("message received", message);
        });
    });

    socket.on("message delivered", async ({ messageId, senderId }) => {
        if (!messageId || !senderId) return;

        try {
            const updatedMessage = await Message.findOneAndUpdate(
                {
                    _id: messageId,
                    sender: senderId,
                    status: "sent",
                },
                { status: "delivered" },
                { new: true }
            ).select("_id status");

            if (!updatedMessage) return;

            io.to(String(senderId)).emit("message status updated", {
                messageId: String(updatedMessage._id),
                status: updatedMessage.status,
            });
        } catch (error) {
            console.error("❌ SOCKET: Failed to mark message delivered:", error.message);
        }
    });

    socket.on("messages read", async ({ messageIds, chatParticipants }) => {
        if (!Array.isArray(messageIds) || messageIds.length === 0) return;

        try {
            const messages = await Message.find({
                _id: { $in: messageIds },
                sender: { $ne: socket.data.userId },
                status: { $ne: "read" },
            }).select("_id sender status");

            if (!messages.length) return;

            const updates = await Promise.all(
                messages.map((message) =>
                    Message.findByIdAndUpdate(
                        message._id,
                        { status: "read" },
                        { new: true }
                    ).select("_id sender status")
                )
            );

            const readUpdates = updates.filter(Boolean);
            if (!readUpdates.length) return;

            const updatesBySender = new Map();
            readUpdates.forEach((message) => {
                const senderKey = String(message.sender);
                if (!updatesBySender.has(senderKey)) {
                    updatesBySender.set(senderKey, []);
                }
                updatesBySender.get(senderKey).push({
                    messageId: String(message._id),
                    status: message.status,
                });
            });

            updatesBySender.forEach((senderUpdates, senderId) => {
                io.to(senderId).emit("messages status updated", {
                    chatId: null,
                    updates: senderUpdates,
                });
            });

            // Optional mirror to participants in the open chat to keep all clients in sync.
            if (Array.isArray(chatParticipants)) {
                chatParticipants.forEach((participantId) => {
                    if (String(participantId) === String(socket.data.userId)) return;
                    socket.in(participantId).emit("messages read received", {
                        messageIds: readUpdates.map((message) => String(message._id)),
                    });
                });
            }
        } catch (error) {
            console.error("❌ SOCKET: Failed to mark messages as read:", error.message);
        }
    });

    socket.on("message reaction", (updatedMessage) => {
        const chat = updatedMessage?.chat;
        if (!chat?.participants) return;

        chat.participants.forEach((user) => {
            if (String(user._id) === String(socket.data.userId)) return;
            socket.in(user._id).emit("message reaction received", updatedMessage);
        });
    });

    socket.on("user typing", ({ chatId, chatParticipants, userName }) => {
        if (!chatId || !chatParticipants || chatParticipants.length === 0) return;

        console.log(`⌨️  SOCKET: ${userName} is typing in chat ${chatId}`);
        
        chatParticipants.forEach((participantId) => {
            if (String(participantId) === String(socket.data.userId)) return;
            socket.in(participantId).emit("user typing received", {
                chatId,
                userId: socket.data.userId,
                userName,
            });
        });
    });

    socket.on("user stopped typing", ({ chatId, chatParticipants }) => {
        if (!chatId || !chatParticipants || chatParticipants.length === 0) return;

        console.log(`✋ SOCKET: User ${socket.data.userId} stopped typing in chat ${chatId}`);
        
        chatParticipants.forEach((participantId) => {
            if (String(participantId) === String(socket.data.userId)) return;
            socket.in(participantId).emit("user stopped typing received", {
                chatId,
                userId: socket.data.userId,
            });
        });
    });

    socket.on("disconnect", (reason) => {
        const disconnectedUserId = socket.data.userId;
        if (disconnectedUserId) {
            const currentCount = activeSocketsByUserId.get(disconnectedUserId) || 0;
            const nextCount = Math.max(0, currentCount - 1);

            if (nextCount === 0) {
                activeSocketsByUserId.delete(disconnectedUserId);
                User.findByIdAndUpdate(disconnectedUserId, {
                    isOnline: false,
                    lastSeen: new Date(),
                }).catch((error) => {
                    console.error(`❌ PRESENCE: Failed to mark user offline (${disconnectedUserId}):`, error.message);
                });
            } else {
                activeSocketsByUserId.set(disconnectedUserId, nextCount);
            }
        }

        console.log(`🛑 SOCKET: Client disconnected | id=${socket.id} reason=${reason}`);
    });

    socket.on("error", (error) => {
        console.error(`❌ SOCKET: Error from client ${socket.id}:`, error);
    });
});
// Connect to MongoDB
connectDB();

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});