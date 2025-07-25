import { Router } from "express";
import tutorController from "../controllers/tutorController.js";
import authenticate from "../middleware/auth.js";

const router = Router();

router.get("/dashboard", authenticate, tutorController.tutorStats);

router.get("/my-courses", authenticate, tutorController.tutorCourses);

router.get("/students", authenticate, tutorController.tutorStudents);

router.get("/transactions", authenticate, tutorController.tutorTransactions);

router.post("/withdraw", authenticate, tutorController.requestWithdrawal);

router.get(
  "/course-analytics",
  authenticate,
  tutorController.tutorCourseAnalytics
);
router.patch("/update-password", authenticate, tutorController.changePassword);

router.put("/update-profile", authenticate, tutorController.updateProfile);

router.patch("/delete", authenticate, tutorController.deleteAccount);

router.post("/add-account", authenticate, tutorController.addBankDetails);

router.get("/accounts", authenticate, tutorController.getAccounts);

router.delete(
  "/accounts/:accountId",
  authenticate,
  tutorController.deleteBankAccount
);

export default router;
