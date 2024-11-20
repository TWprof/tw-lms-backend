import { Router } from "express";
import adminController from "../controllers/adminController.js";

const router = Router();

router.post(
  "/register",

  adminController.createAdmin
);
router.post("/set-password", adminController.setPassword);
router.post("/login", adminController.adminLogin);

export default router;
