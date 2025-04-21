import { Router } from "express";
import adminController from "../controllers/adminController.js";
import { authorizeAdminOnly } from "../middleware/auth.js";
import authenticate from "../middleware/auth.js";
const router = Router();

router.post(
  "/register",
  authenticate,
  authorizeAdminOnly,
  adminController.createAdmin
);
router.post("/set-password", adminController.setPassword);
router.post("/login", adminController.adminLogin);
router.get("/tutor/all", adminController.getAllTutors);

router.get("/tutor/:tutorId", adminController.getTutor);
router.get(
  "/overview",
  authenticate,
  authorizeAdminOnly,
  adminController.adminOverview
);
export default router;
