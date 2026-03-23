import express from "express";
import { getChats, accessChat, getMessages, sendMessage, toggleMessageReaction } from "../controllers/chat.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.route("/").get(protect, getChats).post(protect, accessChat);
router.route("/messages/:chatId").get(protect, getMessages);
router.route("/messages").post(protect, sendMessage);
router.route("/messages/:messageId/reactions").patch(protect, toggleMessageReaction);

export default router;
