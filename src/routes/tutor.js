import { Router } from "express";
import tutorController from "../controllers/tutorController.js";
import authenticate from "../middleware/auth.js";

const router = Router();

router.get("/dashboard", authenticate, tutorController.tutorStats);

router.get("/my-courses", authenticate, tutorController.tutorCourses);

// router.get(
//   "/students",
//   authenticate,
//   tutorController.tutorStudentController
// );

router.get("/transactions", authenticate, tutorController.tutorTransactions);

export default router;
