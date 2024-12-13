import { Router } from "express";
import authenticate from "../middleware/auth.js";
import messagingController from "../controllers/messagingController.js";

const router = Router();

router.get("/all-tutors", authenticate, messagingController.listTutors);

router.get("/all-students", authenticate, messagingController.listStudents);

router.post("/send-messages", authenticate, messagingController.sendMessage);

router.post("/chat", authenticate, messagingController.getOrCreateChat);

export default router;
