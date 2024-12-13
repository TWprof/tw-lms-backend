import { Router } from "express";
import courseController from "../controllers/courseController.js";
import authenticate from "../middleware/auth.js";

const router = Router();
router.post("/create-courses", courseController.createCourse);

// Route to get all the available courses
router.get("/", courseController.getAllCourses);

// Route to search a course from the available courses
router.get("/search", courseController.findCourse);

// Route to update and publish a course
router.put("/:courseId/publish", courseController.updateAndPublishCourse);

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

export default router;
