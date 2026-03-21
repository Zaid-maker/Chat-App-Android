import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import { getCalls, createCall } from "../controllers/call.controller.js";

const router = express.Router();

router.route("/").get(protect, getCalls).post(protect, createCall);

export default router;
