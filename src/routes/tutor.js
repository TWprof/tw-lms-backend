import { Router } from "express";
import tutorController from "../controllers/tutorController.js";
import authenticate from "../middleware/auth.js";

const router = Router();

router.get("/dashboard", authenticate, tutorController.tutorStats);

router.get("/my-courses", authenticate, tutorController.tutorCourses);

router.get("/students", authenticate, tutorController.tutorStudents);

router.get("/transactions", authenticate, tutorController.tutorTransactions);

router.get(
  "/course-analytics",
  authenticate,
  tutorController.tutorCourseAnalytics
);

export default router;
