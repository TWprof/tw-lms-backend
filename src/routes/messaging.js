import { Router } from "express";
import authenticate from "../middleware/auth.js";
import messagingController from "../controllers/messagingController.js";

const router = Router();

router.post("/send-messages", authenticate, messagingController.sendMessage);

router.post("/chat", authenticate, messagingController.getOrCreateChat);

router.get("/chat/:chatId", authenticate, messagingController.getMessages);

router.get("/tutor/chats", authenticate, messagingController.getTutorChatList);

router.get(
  "/student/chats",
  authenticate,
  messagingController.getStudentChatList
);

export default router;
