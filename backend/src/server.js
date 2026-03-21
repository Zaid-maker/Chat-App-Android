import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { Server } from "socket.io";
import http from "http";
import connectDB from "./config/db.js";
import authRoutes from "./routes/auth.routes.js";
import chatRoutes from "./routes/chat.routes.js";
import userRoutes from "./routes/user.routes.js";
import callRoutes from "./routes/call.routes.js";

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
    },
});

// Middleware
app.use(cors());
app.use(express.json());

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

    socket.on("disconnect", (reason) => {
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