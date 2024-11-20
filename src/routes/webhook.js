import { Router } from "express";
import webhookController from "../controllers/webhookController.js";

const router = Router();

router.post("/webhook", webhookController.paystackWebhook);

export default router;
