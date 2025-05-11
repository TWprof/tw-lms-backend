import { Router } from "express";
import courseController from "../controllers/courseController.js";
import progressController from "../controllers/progressController.js";
import authenticate from "../middleware/auth.js";

const router = Router();
router.post("/create-courses", courseController.createCourse);

// Route to get all the available courses
router.get("/", courseController.getAllCourses);

// Route to search a course from the available courses
router.get("/search", courseController.findCourse);

// Get continue watching
router.get(
  "/continue-watching",
  authenticate,
  progressController.continueWatching
);

// Route to edit courseDraft a course
router.put("/:courseId/edit-course", courseController.editCourseDraft);

// Route to update a course (What will you learn section)
router.put("/:courseId/what-you-will-learn", courseController.updateCourse);

// Route to rate a course by courseID
router.post("/:courseId/rate", authenticate, courseController.rateCourse);

// Route to get a single course
router.get("/:courseId", courseController.getEachCourse);

// route to view course
router.get("/:courseId/view", authenticate, courseController.courseViews);

// route to delete a course
router.delete("/:courseId/delete", authenticate, courseController.deleteCourse);

router.get("/:courseId/reviews", courseController.fetchReviews);

// Routes to display course progress
router.post(
  "/:courseId/watch",
  authenticate,
  progressController.updateProgress
);

// Routes to handle comments
router.post(
  "/:courseId/comments",
  authenticate,
  courseController.leaveComments
);

router.get("/:courseId/comments", courseController.getComments);

router.delete(
  "/comments/:commentId",
  authenticate,
  courseController.deleteComment
);

export default router;
