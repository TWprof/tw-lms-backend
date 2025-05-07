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
  authorizeAdminOnly,
  adminController.adminCoursesById
);

router.put(
  "/update-profile",
  authenticate,
  authorizeAdminOnly,
  adminController.updateAdminProfile
);

router.delete(
  "/delete",
  authenticate,
  authorizeAdminOnly,
  adminController.deleteAdmin
);
export default router;
