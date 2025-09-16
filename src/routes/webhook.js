import { Router } from "express";
import webhookController from "../controllers/webhookController.js";

const router = Router();

router.post("/", webhookController.paystackWebhook);

export default router;
