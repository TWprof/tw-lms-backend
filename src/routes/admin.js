import { Router } from "express";
import adminController from "../controllers/adminController.js";
import {
  authorizeAdminOnly,
  authorizeAdminOrTutor,
} from "../middleware/auth.js";
import authenticate from "../middleware/auth.js";
const router = Router();

router.post(
  "/register",
  // authenticate,
  // authorizeAdminOnly,
  adminController.createAdmin
);
router.post("/set-password", adminController.setPassword);

router.post("/login", adminController.adminLogin);

router.get("/tutor/all", adminController.getAllTutors);

router.get("/tutor/:tutorId", adminController.getTutor);

router.put(
  "/delete/:tutorId",
  authenticate,
  authorizeAdminOnly,
  adminController.deleteTutor
);

router.get(
  "/overview",
  authenticate,
  authorizeAdminOnly,
  adminController.adminOverview
);

router.get(
  "/students",
  authenticate,
  authorizeAdminOnly,
  adminController.adminStudents
);

router.get(
  "/tutor-analytics",
  authenticate,
  authorizeAdminOnly,
  adminController.adminTutors
);

router.get(
  "/transactions",
  authenticate,
  authorizeAdminOnly,
  adminController.adminTransactions
);

router.get(
  "/courses",
  authenticate,
  authorizeAdminOnly,
  adminController.adminCourses
);

router.get(
  "/transactions/:transactionId",
  authenticate,
  authorizeAdminOnly,
  adminController.adminTransactionsById
);

router.get(
  "/courses/:courseId",
  authenticate,
  authorizeAdminOrTutor,
  adminController.fetchCoursesById
);

router.patch(
  "/courses/:courseId/approve",
  authenticate,
  authorizeAdminOnly,
  adminController.approveCourse
);

router.patch(
  "/courses/:courseId/reject",
  authenticate,
  authorizeAdminOnly,
  adminController.rejectCourse
);

router.put(
  "/update-profile",
  authenticate,
  authorizeAdminOnly,
  adminController.updateAdminProfile
);

router.put(
  "/update-password",
  authenticate,
  authorizeAdminOnly,
  adminController.changePassword
);

router.delete(
  "/delete",
  authenticate,
  authorizeAdminOnly,
  adminController.deleteAdmin
);

router.get(
  "/all-students",
  authenticate,
  authorizeAdminOnly,
  adminController.allStudents
);

router.get(
  "/all-students/:studentId",
  authenticate,
  authorizeAdminOnly,
  adminController.studentById
);
export default router;
