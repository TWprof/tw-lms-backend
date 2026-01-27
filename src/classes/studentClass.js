import Student from "../models/student.js";
import PurchasedCourse from "../models/purchasedCourse.js";
import Course from "../models/courses.js";
import Comment from "../models/comments.js";
import Review from "../models/review.js";
import Messages from "../models/messaging.js";
import Chat from "../models/chat.js";
import Payment from "../models/payment.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import responses from "../utils/response.js";
import sendMail from "../utils/mail.js";
import constants from "../constants/index.js";
import generateResetPin from "../utils/generateOtp.js";
import getTemplate from "../utils/getTemplates.js";
import crypto from "crypto";

export default class StudentClass {
  // Student signup
  async studentSignup(payload) {
    const foundStudent = await Student.findOne({ email: payload.email });
    if (foundStudent) {
      return responses.failureResponse("Email already exists", 400);
    }

    // Hash password and generate verification token
    payload.password = await bcrypt.hash(payload.password, 10);
    payload.verificationToken = crypto.randomBytes(32).toString("hex");
    payload.verificationTokenExpires = new Date(Date.now() + 3600000);

    // Set isActive to false (only verified users should be active)
    payload.isActive = false;

    // Save student data
    await Student.create(payload);

    // Use email template
    const verificationLink = `${process.env.STUDENT_FRONTEND_HOST}/verified-email?verificationToken=${payload.verificationToken}`;
    // const verificationLink = `${process.env.HOST}/verified-email?verificationToken=${payload.verificationToken}`;
    const emailTemplate = getTemplate("verifyemail.html", {
      firstName: payload.firstName,
      verificationLink,
    });

    const emailPayload = {
      to: payload.email,
      subject: "VERIFY YOUR EMAIL",
      message: emailTemplate,
    };
    // send email by calling sendMail function

    await sendMail(emailPayload, constants.verifyEmail);

    const data = {
      firstName: payload.firstName,
      lastName: payload.lastName,
      email: payload.email,
    };

    return responses.successResponse("Registeration successful", 201, data);
  }

  // Email Verification
  async verifySignUp(verificationToken) {
    const student = await Student.findOne({
      verificationToken,
      verificationTokenExpires: { $gt: new Date() },
    });

    if (!student) {
      return responses.failureResponse("Invalid or Token Expired.", 400);
    }

    student.isVerified = true;
    student.isActive = true;
    student.verificationToken = undefined;
    student.verificationTokenExpires = undefined;
    await student.save();

    return responses.successResponse(
      "Email verified successfully! Proceed to login",
      200,
    );
  }

  // Student Login
  async studentLogin(payload) {
    const foundStudent = await Student.findOne({ email: payload.email });

    if (!foundStudent) {
      return responses.failureResponse("Student details incorrect", 404);
    }

    // Prevent login if user isnt verified
    if (!foundStudent.isVerified) {
      return responses.failureResponse(
        "Only verified students can login. Please verify your email",
        400,
      );
    }

    // Prevent login if account is deactivated
    if (!foundStudent.isActive) {
      return responses.failureResponse("This account does not exist.", 404);
    }

    const studentPassword = await bcrypt.compare(
      payload.password,
      foundStudent.password,
    );

    if (!studentPassword) {
      return responses.failureResponse("Invalid password", 400);
    }

    const returnData = {
      _id: foundStudent._id,
      email: foundStudent.email,
      isVerified: foundStudent.isVerified,
      firstName: foundStudent.firstName,
    };

    const authToken = jwt.sign(
      {
        email: foundStudent.email,
        _id: foundStudent._id,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "30d",
      },
    );

    return responses.successResponse("Login successful", 200, {
      returnData,
      authToken,
    });
  }

  //Password Recovery
  async forgotPassword(payload) {
    try {
      const emailFound = await Student.findOne({ email: payload.email });

      if (!payload || !payload.email) {
        return responses.failureResponse(
          "This field cannot be empty. Please input your email",
          400,
        );
      }

      if (!emailFound) {
        return responses.failureResponse(
          "Incorrect email! Please check and try again",
          400,
        );
      }

      const resetPin = generateResetPin();

      const resetPinExpires = new Date(Date.now() + 600000);

      const updateStudent = await Student.findByIdAndUpdate(
        { _id: emailFound._id },
        { resetPin: resetPin },
        { resetPinExpires: resetPinExpires },
        { new: true },
      );

      //use email template
      const emailTemplate = getTemplate("resetpin.html", {
        firstName: emailFound.firstName,
        pin: resetPin,
      });

      const forgotPasswordPayload = {
        to: updateStudent.email,
        subject: "RESET PASSWORD",
        pin: resetPin,
        message: emailTemplate,
      };

      console.log("Sending email to:", updateStudent.email);

      await sendMail(forgotPasswordPayload, constants.passwordReset);
    } catch (error) {
      console.error("Failed to send mail:", error);
      // updateStudent.save({ validateBeforeSave: false });
      return responses.failureResponse(
        "Unable to send reset pin. Please try again later",
        500,
      );
    }
    return responses.successResponse("Reset pin sent successfully", 200, {});
  }

  // verify the reset pin
  async verifyResetPin(payload) {
    const student = await Student.findOne({ resetPin: payload.resetPin });
    if (!payload || !payload.resetPin) {
      return responses.failureResponse("Cannot be empty. Input reset pin", 400);
    }
    if (!student) {
      return responses.failureResponse("Reset PIN is expired or invalid", 400);
    }
    student.resetPin = undefined;
    student.resetPinExpires = undefined;
    await student.save();
    return responses.successResponse("Reset Pin still valid", 200);
  }

  // set new password
  async resetPassword(payload) {
    const student = await Student.findOne(
      { email: payload.email },
      // { resetPin: payload.resetPin } // not necessary
    );

    if (!student) {
      return responses.failureResponse("Incorrect details", 400);
    }

    // Set the new password
    payload.password = await bcrypt.hash(payload.password, 10);

    await Student.findByIdAndUpdate(
      { _id: student._id },
      { password: payload.password },
      { resetPin: null },
      { new: true },
    );

    const returnData = {
      _id: student._id,
      email: payload.email,
    };

    return responses.successResponse(
      "Password Reset Successful",
      200,
      returnData,
    );
  }

  // Get student purchased Courses
  async getStudentCourses(studentId) {
    try {
      const purchasedCourses = await PurchasedCourse.find({
        studentId,
      }).populate("courseId");

      const courses = purchasedCourses.map((purchased) => {
        const courseObj = purchased.toObject();

        const lectures = courseObj.courseId?.lectures || [];

        const totalVideos = lectures.reduce(
          (sum, lecture) => sum + (lecture.videoURLs?.length || 0),
          0,
        );

        const watchedVideos = new Set(
          (courseObj.progress || [])
            .filter((p) => p.completed)
            .map((p) => p.videoId.toString()),
        ).size;

        const lastProgress = (courseObj.progress || [])
          .filter((p) => !p.completed)
          .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))[0];

        return {
          ...courseObj,
          watchedVideos,
          totalVideos,
          progressCount: `${watchedVideos}/${totalVideos}`,
          resume: lastProgress
            ? {
                lectureId: lastProgress.lectureId,
                videoId: lastProgress.videoId,
                timestamp: lastProgress.timestamp,
              }
            : null,
        };
      });

      return responses.successResponse("Your courses are", 200, courses);
    } catch (error) {
      console.error("Unable to get courses", error);
      return responses.failureResponse("Failed to fetch courses", 500);
    }
  }

  // Get Each student Course
  async getEachCourse(courseId) {
    try {
      const course = await PurchasedCourse.findOne({ courseId }).populate(
        "courseId",
      );
      if (!course) {
        return responses.failureResponse(
          "There is no Course with this ID",
          404,
        );
      }

      return responses.successResponse(
        "Course fetched successfully",
        200,
        course,
      );
    } catch (error) {
      console.error("Error in fetching course:", error);
      return responses.failureResponse("Failed to fetch course", 500);
    }
  }

  // Student statistics displayed on the dashboard
  async getStudentOverview(studentId) {
    try {
      const courses = await PurchasedCourse.find({ studentId });
      if (!courses) {
        return responses.failureResponse("Invalid student Token", 400);
      }

      const totalEnrolledCourses = courses.length;

      const completedCourses = courses.filter(
        (course) => course.isCompleted === 1,
      ).length;

      const totalWatchTimeMinutes = courses.reduce(
        (acc, course) => acc + course.minutesSpent,
        0,
      );
      const totalWatchTimeHours = (totalWatchTimeMinutes / 60).toFixed(2);

      let courseCompletionRate;
      if (totalEnrolledCourses === 0) {
        courseCompletionRate = 0;
      } else {
        courseCompletionRate = (completedCourses / totalEnrolledCourses) * 100;
      }

      const returnData = {
        courseCompletionRate,
        totalEnrolledCourses,
        completedCourses,
        totalWatchTime: totalWatchTimeHours,
      };

      return responses.successResponse("Course details", 200, returnData);
    } catch (error) {
      console.error("AN error occured", error);
      return responses.failureResponse("Failed to fetch statistics", 500);
    }
  }

  // to recommend more courses to the student
  async getStudentRecommendations(payload) {
    try {
      const { studentId, page = 1, limit = 10, type = "random" } = payload;
      const offset = (page - 1) * limit;

      let query = Course.find();
      if (type === "related") {
        const studentCourses = await PurchasedCourse.find({
          studentId,
        }).populate("courseId");

        const categories = studentCourses.map(
          (course) => course.courseId.category,
        );

        // to recommend courses from the same category
        query = (await query.where("category")).in(categories);
      } else if (type === "different") {
        const studentCourses = await PurchasedCourse.find({
          studentId,
        }).populate("courseId");

        const categories = studentCourses.map(
          (course) => course.courseId.category,
        );

        // to recommend courses from different categories
        query = (await query.where("category")).nin(categories);
      } else if (type === "sameTutor") {
        const studentCourses = await PurchasedCourse.find({
          studentId,
        }).populate("courseId");

        const tutors = studentCourses.map((course) => course.courseId.tutor);

        // to recommend courses from the same tutor
        query = (await query.where("tutor")).in(tutors);
      }

      const totalCourses = await query.clone().countDocuments();

      const courses = await query.skip(offset).limit(limit).exec();

      const returnData = {
        courses,
        page,
        totalPages: Math.ceil(totalCourses / limit),
        totalCourses,
      };

      return responses.successResponse(
        "Your recommended courses are: ",
        200,
        returnData,
      );
    } catch (error) {
      console.error("An error occured", error);
      return responses.failureResponse("Unable to recommend courses", 500);
    }
  }

  // Student update profile endpoint
  async updateStudent(studentId, payload) {
    try {
      const student = await Student.findById(studentId);
      if (!student) {
        return responses.failureResponse("Invalid student token/Id", 400);
      }

      const updatedStudent = await Student.findByIdAndUpdate(
        studentId,
        payload,
        {
          new: true,
        },
      );

      return responses.successResponse(
        "student details updated successfully",
        200,
        updatedStudent,
      );
    } catch (error) {
      console.error("There was an error updating this student", error);
      return responses.failureResponse("Unable to update student", 500);
    }
  }

  // Update student password
  async updatePassword(studentId, payload) {
    try {
      const { oldPassword, newPassword } = payload;

      const student = await Student.findById(studentId);

      if (!student) {
        return responses.failureResponse(
          "Invalid student token. There is no student with this Id",
          400,
        );
      }

      // Check if the old password is correct
      const foundPassword = await bcrypt.compare(oldPassword, student.password);

      if (!foundPassword) {
        console.log("Password does not match");
        return responses.failureResponse("This password is incorrect", 400);
      }

      // set new password and hash it
      const newpassword = await bcrypt.hash(newPassword, 10);

      const updatedStudent = await Student.findByIdAndUpdate(
        studentId,
        { password: newpassword },
        { new: true },
      );

      return responses.successResponse(
        "student password updated successfully",
        200,
        updatedStudent,
      );
    } catch (error) {
      console.error("Unable to update the password", error);
      return responses.failureResponse(
        "There was an error updating the student password",
        500,
      );
    }
  }

  async deleteAccount(studentId) {
    try {
      // Find and update the student (soft delete)
      const student = await Student.findOneAndUpdate(
        { _id: studentId, isActive: true },
        { isActive: false, deletedAt: new Date() },
        { new: true },
      );

      if (!student) {
        return responses.failureResponse(
          "Student not found or already deleted",
          404,
        );
      }

      // Mark related data as inactive (instead of deletion)
      await PurchasedCourse.updateMany(
        { studentId },
        { $set: { isActive: false } },
      );
      await Review.updateMany({ studentId }, { $set: { isActive: false } });
      await Comment.updateMany({ studentId }, { $set: { isActive: false } });
      await Chat.updateMany(
        { student: studentId },
        { $set: { isActive: false } },
      );
      await Messages.updateMany(
        { senderId: studentId },
        { $set: { isActive: false } },
      );
      await Messages.updateMany(
        { receiverId: studentId },
        { $set: { isActive: false } },
      );

      // Keep Payments but remove studentId
      await Payment.updateMany({ studentId }, { $unset: { studentId: "" } });

      return responses.successResponse(
        "Account deleted successfully",
        200,
        student,
      );
    } catch (error) {
      console.error("Error deleting student account:", error);
      return responses.failureResponse("Unable to delete this account", 500);
    }
  }

  async privacySettings(studentId, settings) {
    try {
      // Update the student's privacy settings
      const student = await Student.findByIdAndUpdate(
        studentId,
        { $set: { privacySettings: settings } },
        { new: true },
      );

      if (!student) {
        return responses.failureResponse("Student not found", 404);
      }

      return responses.successResponse(
        "Privacy settings updated successfully",
        200,
        student,
      );
    } catch (error) {
      console.error("There was an error", error);
      return responses.failureResponse("Unable to update user settings", 500);
    }
  }
}
