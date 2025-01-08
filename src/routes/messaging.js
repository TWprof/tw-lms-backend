import { Router } from "express";
import authenticate from "../middleware/auth.js";
import messagingController from "../controllers/messagingController.js";

const router = Router();

router.post("/send-messages", authenticate, messagingController.sendMessage);

router.post("/chat", authenticate, messagingController.getOrCreateChat);

router.get("/chat/:chatId", authenticate, messagingController.getMessages);

export default router;
