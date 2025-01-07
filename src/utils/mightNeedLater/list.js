import PurchasedCourse from "../models/purchasedCourse.js";
import responses from "../utils/response.js";

import { Router } from "express";
import authenticate from "../middleware/auth.js";
import messagingController from "../controllers/messagingController.js";

export default class MessagingClass {
  // Create a list of Tutors whose course a Student has purchased
  async listTutorsForStudents(studentId) {
    try {
      const tutors = await PurchasedCourse.find({ studentId })
        .populate({
          path: "courseId",
          populate: {
            path: "tutor",
            model: "Admin",
            select: "firstName lastName email",
          },
        })
        .select("courseId");

      // Extract tutor details from the populated courses purchased by the student
      const tutorList = [
        ...new Map(
          tutors.map((course) => [
            course.courseId.tutor._id.toString(),
            course.courseId.tutor,
          ])
        ).values(),
      ];

      return responses.successResponse(
        "These are the list of tutors whose course you have purchased",
        200,
        tutorList
      );
    } catch (error) {
      console.error("There was an error", error);
      return responses.failureResponse("Unable to get the list of tutors", 500);
    }
  }

  // Extract and filter out students who have bought the tutor's courses
  async listStudentsForTutor(tutorId) {
    try {
      const students = await PurchasedCourse.find()
        .populate({
          path: "studentId",
          model: "Student",
          select: "firstName lastName email",
        })
        .populate({
          path: "courseId",
          match: { tutor: tutorId },
          select: "title",
        });

      // Extract and filter out students who have bought the tutor's courses
      const studentList = students.map((course) => ({
        student: course.studentId,
        course: course.courseId.title || "Unknown Course",
      }));

      return responses.successResponse(
        "These are the students that have purchased your courses",
        200,
        studentList
      );
    } catch (error) {
      console.error("Error retrieving students for tutor:", error);
      return responses.failureResponse("Unable to retrieve the Students", 500);
    }
  }
}

const controllers = {
  listTutors: async (req, res) => {
    const studentId = req.user._id;
    const data = await new MessagingClass().listTutorsForStudents(studentId);
    res.status(data.statusCode).json(data);
  },

  listStudents: async (req, res) => {
    const tutorId = req.user._id;
    const data = await new MessagingClass().listStudentsForTutor(tutorId);
    res.status(data.statusCode).json(data);
  },
};

const router = Router();

router.get("/all-tutors", authenticate, messagingController.listTutors);

router.get("/all-students", authenticate, messagingController.listStudents);
