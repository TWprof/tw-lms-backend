import { Router } from "express";
import studentController from "../controllers/studentController.js";
import authenticate from "../middleware/auth.js";

const router = Router();

// signup route
router.post("/signup", studentController.studentSignUp);
// verify email route
router.get("/verified-email", studentController.verifySignUp);

// login route
router.post("/login", studentController.studentLogin);

// forgot password route
router.post("/forgot-password", studentController.forgotPassword);

// verify otp route
router.post("/verify-pin", studentController.verifyResetPin);

// reset password route
router.post("/reset-password", studentController.resetPassword);

// get user purchased courses route
router.get("/dashboard", authenticate, studentController.getStudentCourses);

// overview statistics route
router.get("/overview", authenticate, studentController.getStudentOverview);

// recommendations route
router.get(
  "/recommendations",
  authenticate,
  studentController.getStudentRecommendations
);

// get a single purchased course by student
router.get(
  "/dashboard/:courseId",
  authenticate,
  studentController.getEachCourse
);

// Update student
router.put("/update-user", authenticate, studentController.updateStudent);

// Update Student password
router.put("/update-password", authenticate, studentController.updatePassword);

// delete student route
router.patch("/delete-account", authenticate, studentController.deleteAccount);

// Privacy settings route
router.put("/privacy", authenticate, studentController.privacySettings);
export default router;
