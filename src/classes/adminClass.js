import Admin from "../models/admin.js";
import Student from "../models/student.js";
import PurchasedCourse from "../models/purchasedCourse.js";
import {
  getCoreMetrics,
  getTotalRevenue,
  getBarChartData,
  getRecentActivities,
  getTopCourses,
  getTopTutors,
  getNewTutors,
  getAverageTutorRating,
  getTutorSales,
  getCourseProgressPercentage,
  getTotalStudents,
  getEnrolledStudents,
  getReviews,
  getTimeStatistics,
  getPurchasedCourses,
  getCompletedCourses,
  calculateCompletionRate,
} from "../utils/helpers.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { getDateFilter } from "../utils/helpers.js";
import responses from "../utils/response.js";
import crypto from "crypto";
import constants from "../constants/index.js";
import getTemplate from "../utils/getTemplates.js";
import sendMail from "../utils/mail.js";
import Payment from "../models/payment.js";
import Course from "../models/courses.js";

export default class AdminClass {
  // Create Admin
  async createAdmin(payload, adminId) {
    // User = Staff, Tutor, Admin
    // Only an admin can create these users
    const admin = await Admin.findById(adminId);
    if (!admin || admin.role !== "0") {
      return responses.failureResponse("Unauthorized access", 403);
    }

    const user = await Admin.findOne({ email: payload.email });

    if (user) {
      return responses.failureResponse(
        "Email already registered. Please provide another",
        403
      );
    }

    payload.registrationToken = crypto.randomBytes(20).toString("hex");
    payload.tokenExpiration = new Date(Date.now() + 3600000);

    // saveadmin data
    await Admin.create(payload);

    // use email template
    const registrationToken = `${process.env.ADMIN_HOST_FRONTEND}set-password?registrationToken=${payload.registrationToken}`;
    const emailTemplate = getTemplate("setpassword.html", {
      firstName: payload.firstName,
      registrationToken,
    });

    const emailPayload = {
      to: payload.email,
      subject: "SET PASSWORD",
      message: emailTemplate,
    };
    // send email by calling sendMail function
    await sendMail(emailPayload, constants.setPassword);

    const data = {
      firstName: payload.firstName,
      lastName: payload.lastName,
      email: payload.email,
      registrationToken: payload.registrationToken,
    };

    return responses.successResponse("User created successfully", 200, {
      user: { ...data },
    });
  }

  // Set Password
  async setPassword(payload) {
    const user = await Admin.findOne({
      registrationToken: payload.registrationToken,
      tokenExpiration: { $gt: Date.now() },
    });

    if (!user) {
      return responses.failureResponse("Invalid or Expired Token", 401);
    }

    payload.password = await bcrypt.hash(payload.password, 10);

    await Admin.findByIdAndUpdate(
      { _id: user._id },
      { password: payload.password }
    );

    user.registrationToken = undefined;
    user.tokenExpiration = undefined;
    await user.save();

    return responses.successResponse("Password updated successfully", 200);
  }

  // Login
  async login(payload) {
    const user = await Admin.findOne({ email: payload.email });

    if (!user) {
      return responses.failureResponse("Email incorrect", 400);
    }

    const foundPassword = await bcrypt.compare(payload.password, user.password);

    if (!foundPassword) {
      return responses.failureResponse("Password Incorrect", 403);
    }

    const authToken = jwt.sign(
      {
        email: user.email,
        id: user._id,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "30d",
      }
    );

    return responses.successResponse("Login successful", 200, {
      user,
      authToken,
    });
  }

  async getTutorById(tutorId) {
    try {
      const tutor = await Admin.findById(tutorId);
      if (!tutor) {
        return responses.failureResponse("There is no tutor with this Id", 404);
      }

      return responses.successResponse("Tutor found", 200, tutor);
    } catch (error) {
      console.error("There was an error", error);
      return responses.failureResponse("Unable to get this Tutor", 500);
    }
  }

  async getAllTutors(query = {}) {
    try {
      const paginate = {
        page: 1,
        limit: 10,
      };

      if (query.page) {
        paginate.page = Math.max(1, Number(query.page));
        delete query.page;
      }
      if (query.limit) {
        paginate.limit = Math.max(1, Number(query.limit));
        delete query.limit;
      }

      // Filter to match only Tutors from Admin model
      const match = { role: "1", ...query };
      const tutors = await Admin.find(match)
        .sort({ createdAt: -1 })
        .skip((paginate.page - 1) * paginate.limit)
        .limit(paginate.limit)
        .lean();

      // Count Total Tutors
      const allTutors = await Admin.countDocuments(match);

      return responses.successResponse("Tutors Found", 200, {
        tutorCount: allTutors,
        tutors,
        page: paginate.page,
        limit: paginate.limit,
      });
    } catch (error) {
      console.error("Error in fetching Tutors", error);
      return responses.failureResponse(
        "There was an error fetching the Tutors",
        500
      );
    }
  }

  async adminOverview(adminId) {
    try {
      const admin = await Admin.findById(adminId);
      if (!admin || admin.role !== "0") {
        return responses.failureResponse("Unauthorized access", 403);
      }

      // 1. Fetch core metrics
      const metrics = await getCoreMetrics();

      // 2. Fetch chart + recent activities + revenue
      const [barChartData, recentActivities, totalRevenue, courseProgress] =
        await Promise.all([
          getBarChartData(),
          getRecentActivities(),
          getTotalRevenue(),
          getCourseProgressPercentage(),
        ]);

      // 3. Fetch top tutors and top courses
      const [topCourses, topTutors] = await Promise.all([
        getTopCourses(),
        getTopTutors(),
      ]);

      // 4. Calculate platform-wide completion rate
      const completionRate =
        metrics.totalPurchases > 0
          ? ((metrics.completedCourses / metrics.totalPurchases) * 100).toFixed(
              2
            )
          : 0;

      return responses.successResponse("Admin Overview fetched", 200, {
        ...metrics,
        completionRate,
        totalRevenue,
        barChartData,
        recentActivities,
        topCourses,
        topTutors,
        courseProgress,
        recentTransactions: [],
      });
    } catch (error) {
      console.error("Error fetching overview:", error);
      return responses.failureResponse("Failed to fetch overview", 500);
    }
  }

  async adminStudents(adminId, filter = "all") {
    try {
      const admin = await Admin.findById(adminId);
      if (!admin || admin.role !== "0") {
        return responses.failureResponse("Unauthorized access", 403);
      }

      const dateFilter = getDateFilter(filter);

      const [
        allStudents,
        purchasedCourses,
        completedCourses,
        reviews,
        timeStats,
      ] = await Promise.all([
        Student.find(dateFilter).lean(),
        getPurchasedCourses(dateFilter),
        getCompletedCourses(dateFilter),
        getReviews(dateFilter),
        getTimeStatistics(dateFilter),
      ]);

      // Build a map of studentId => course info (only first course per student)
      const studentPurchaseMap = new Map();
      purchasedCourses.forEach((pc) => {
        const studentId = pc.studentId?._id?.toString?.();
        if (studentId && !studentPurchaseMap.has(studentId)) {
          studentPurchaseMap.set(studentId, {
            courseTitle: pc.courseId?.title || "Deleted Course",
            amountPaid: pc.paymentId?.amount || 0,
          });
        }
      });

      // Sort students by newest createdAt
      allStudents.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      // Map students with enrollment and course details
      const studentsWithStatus = allStudents.map((student) => {
        const studentId = student._id.toString();
        const enrolled = studentPurchaseMap.has(studentId);
        const purchaseInfo = studentPurchaseMap.get(studentId) || {};

        return {
          _id: student._id,
          fullName: `${student.firstName || ""} ${
            student.lastName || ""
          }`.trim(),
          email: student.email,
          enrolled,
          courseTitle: enrolled ? purchaseInfo.courseTitle : null,
          amountPaid: enrolled ? purchaseInfo.amountPaid : null,
          createdAt: student.createdAt,
        };
      });

      // Completion stats
      const abandonedCourses = purchasedCourses.filter((c) => !c.isCompleted);
      const completionRate = calculateCompletionRate(
        purchasedCourses,
        completedCourses
      );

      // Format reviews nicely
      const mappedReviews = reviews.map((r) => ({
        student: r.studentId
          ? `${r.studentId.firstName || ""} ${
              r.studentId.lastName || ""
            }`.trim()
          : "Unknown Student",
        course: r.courseId?.title || "Deleted Course",
        rating: r.rating,
        reviewText: r.reviewText,
        createdAt: r.createdAt,
      }));

      // Final response
      return responses.successResponse("Student stats fetched", 200, {
        totalStudents: allStudents.length,
        totalPurchases: purchasedCourses.length,
        completedCourses: completedCourses.length,
        abandonedCourses: abandonedCourses.length,
        completionRate,
        enrolledStudentsCount: studentPurchaseMap.size,
        reviews: mappedReviews,
        timeStats,
        students: studentsWithStatus,
        filter,
      });
    } catch (error) {
      console.error("There was an error", error);
      return responses.failureResponse("Unable to fetch students data", 500);
    }
  }

  async adminTutorAnalytics(adminId, filter = "all") {
    try {
      const admin = await Admin.findById(adminId);
      if (!admin || admin.role !== "0") {
        return responses.failureResponse("Unauthorized access", 403);
      }

      const dateFilter = getDateFilter(filter);

      const [
        totalTutors,
        newTutors,
        averageRating,
        topTutors,
        topCourses,
        salesTrend,
        totalRevenue,
        tutorList,
      ] = await Promise.all([
        Admin.countDocuments({ role: "1" }),
        getNewTutors(dateFilter),
        getAverageTutorRating(),
        getTopTutors(dateFilter),
        getTopCourses(dateFilter),
        getTutorSales(dateFilter),
        getTotalRevenue(dateFilter),
        Admin.find({ role: "1" })
          .sort({ createdAt: -1 })
          .select("-password -__v"),
      ]);

      const averageRevenue =
        totalTutors > 0 ? (totalRevenue / totalTutors).toFixed(2) : 0;

      return responses.successResponse("Analytics fetched", 200, {
        overview: { totalTutors, newTutors, averageRating, averageRevenue },
        topTutors,
        topCourses,
        salesTrend,
        tutorList,
        filter,
      });
    } catch (error) {
      console.error("Analytics error:", error);
      return responses.failureResponse("Failed to fetch analytics", 500);
    }
  }

  async softDeleteTutor(adminId, tutorId) {
    try {
      const admin = await Admin.findById(adminId);
      if (!admin || admin.role !== "0") {
        return responses.failureResponse("Unauthorized access", 403);
      }

      // Check if tutor exists and is not already soft deleted
      const tutor = await Admin.findOne({ _id: tutorId, role: "1" });
      if (!tutor) {
        return responses.failureResponse(
          "Tutor does not exist or has already been removed",
          400
        );
      }

      // Soft delete: set isActive to false
      if (!tutor.isActive) {
        return responses.failureResponse("Tutor is already removed", 400);
      }

      tutor.isActive = false;
      await tutor.save();

      return responses.successResponse("Tutor removed successfully", 200);
    } catch (error) {
      console.error("Unable to delete tutor:", error);
      return responses.failureResponse(
        "There was an error deleting this tutor",
        500
      );
    }
  }

  async adminTransactions(adminId, query) {
    try {
      const admin = await Admin.findById(adminId);
      if (!admin || admin.role !== "0") {
        return responses.failureResponse("Unauthorized access", 403);
      }

      const page = parseInt(query.page) || 1;
      const limit = parseInt(query.limit) || 10;
      const skip = (page - 1) * limit;

      // Fetch successful payments with populated student information
      const successfulPayments = await Payment.find({ status: "success" })
        .populate("studentId", "firstName lastName")
        .sort({ createdAt: -1 });

      const totalTransactions = successfulPayments.length;
      const totalRevenue = successfulPayments.reduce(
        (sum, payment) => sum + (payment.amount || 0),
        0
      );
      const averageRevenue =
        totalTransactions > 0
          ? (totalRevenue / totalTransactions).toFixed(2)
          : 0;

      // Paginate the successful payments
      const transactions = successfulPayments
        .slice(skip, skip + limit)
        .map((payment) => ({
          transactionId: payment._id,
          studentName: payment.studentId
            ? `${payment.studentId.firstName} ${payment.studentId.lastName}`
            : "Unknown",
          amount: payment.amount,
          email: payment.email,
          date: payment.date,
          reference: payment.reference,
          channel: payment.channel,
          currency: payment.currency,
        }));

      return responses.successResponse(
        "Transaction statistics fetched successfully",
        200,
        {
          totalTransactions,
          averageRevenue,
          totalRevenue,
          transactions,
        }
      );
    } catch (error) {
      console.error("There was an error", error);
      return responses.failureResponse(
        "Unable to fetch transaction statistics",
        500
      );
    }
  }

  async adminTransactionsById(adminId, transactionId) {
    try {
      const admin = await Admin.findById(adminId);
      if (!admin || admin.role !== "0") {
        return responses.failureResponse("Unauthorized access", 403);
      }

      // Fetch the transaction and populate student details
      const transaction = await Payment.findById(transactionId)
        .populate("studentId", "firstName lastName")
        .select("amount email date reference channel currency studentId");

      if (!transaction) {
        return responses.failureResponse("Transaction not found", 404);
      }

      // Find purchased course linked to this transaction
      const purchasedCourse = await PurchasedCourse.findOne({
        paymentId: transactionId,
      }).populate("courseId", "title");

      const courseTitle =
        purchasedCourse && purchasedCourse.courseId
          ? purchasedCourse.courseId.title
          : "Course not found or may have been deleted from the database";

      const result = {
        studentName: transaction.studentId
          ? `${transaction.studentId.firstName} ${transaction.studentId.lastName}`
          : "Unknown",
        amount: transaction.amount,
        email: transaction.email,
        date: transaction.date,
        reference: transaction.reference,
        channel: transaction.channel,
        currency: transaction.currency,
        course: courseTitle,
      };

      return responses.successResponse(
        "Transaction fetched successfully",
        200,
        result
      );
    } catch (error) {
      console.error("Error fetching transaction:", error);
      return responses.failureResponse("Unable to fetch transaction", 500);
    }
  }

  async fetchCourses(adminId, query = {}) {
    try {
      const admin = await Admin.findById(adminId);
      if (!admin || admin.role !== "0") {
        return responses.failureResponse("Unauthorized access", 403);
      }

      const page = parseInt(query.page, 10) || 1;
      const limit = parseInt(query.limit, 10) || 10;
      const skip = (page - 1) * limit;

      // Remove pagination params from query to avoid filtering errors
      delete query.page;
      delete query.limit;

      // Filter: only courses that are NOT drafts
      const filter = {
        ...query,
        status: { $in: ["pending", "approved", "rejected"] },
      };

      const courses = await Course.find(filter)
        .select("title tutorName price isPublished status createdAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      const totalCounts = await Course.countDocuments(filter);

      return responses.successResponse(
        "Successfully fetched all courses",
        200,
        {
          totalCounts,
          data: courses,
          page,
          noPerPage: limit,
        }
      );
    } catch (error) {
      console.error("Error in fetching courses:", error);
      return responses.failureResponse("Failed to fetch all courses", 500);
    }
  }

  async fetchCoursesById(userId, role, courseId) {
    try {
      // Verify admin or tutor privileges
      const isAdmin = role === "0";
      const isTutor = role === "1";

      if (!isAdmin && !isTutor) {
        return responses.failureResponse("Unauthorized access", 403);
      }

      // Base query conditions
      const query = { _id: courseId };

      // For tutors, they can only see their own courses
      if (isTutor) {
        query.tutor = userId;
      }
      // Admins can see all non-draft courses
      else {
        query.status = { $in: ["pending", "approved", "rejected"] };
      }

      // Fetch the course with appropriate fields
      const course = await Course.findOne(query);

      if (!course) {
        return responses.failureResponse(
          "Course not found or not accessible",
          404
        );
      }

      return responses.successResponse("Course fetched successfully", 200, {
        courseId: course,
      });
    } catch (error) {
      console.error("Error fetching course:", error);
      return responses.failureResponse("Unable to fetch course", 500);
    }
  }

  async updateAdminProfile(adminId, payload) {
    try {
      // Validate admin existence and role
      const admin = await Admin.findById(adminId);
      if (!admin || admin.role !== "0") {
        return responses.failureResponse("Unauthorized access", 403);
      }

      // Update admin profile
      const updatedAdmin = await Admin.findByIdAndUpdate(adminId, payload, {
        new: true,
        runValidators: true,
      });

      if (!updatedAdmin) {
        return responses.failureResponse("Admin not found", 404);
      }

      return responses.successResponse(
        "Admin profile updated successfully",
        200,
        updatedAdmin
      );
    } catch (error) {
      console.error("Error updating admin profile:", error);
      return responses.failureResponse("Unable to update admin profile", 500);
    }
  }

  async changeAdminPassword(adminId, payload) {
    try {
      const { oldPassword, newPassword } = payload;

      if (!oldPassword || !newPassword) {
        return responses.failureResponse(
          "Old and new passwords are required",
          400
        );
      }

      const admin = await Admin.findById(adminId);

      if (!admin || admin.role !== "0") {
        return responses.failureResponse(
          "Invalid admin token. There is no admin with this Id",
          400
        );
      }

      if (!admin.password) {
        return responses.failureResponse(
          "Admin password is not set. Please contact support.",
          400
        );
      }

      // Check if the old password is correct
      const isMatch = await bcrypt.compare(oldPassword, admin.password);

      if (!isMatch) {
        console.log("Password does not match");
        return responses.failureResponse("This password is incorrect", 400);
      }

      // Hash and set the new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      const updatedAdmin = await Admin.findByIdAndUpdate(
        adminId,
        { password: hashedPassword },
        { new: true }
      );

      return responses.successResponse(
        "Admin password updated successfully",
        200,
        updatedAdmin
      );
    } catch (error) {
      console.error("Unable to update the password", error);
      return responses.failureResponse(
        "There was an error updating the admin password",
        500
      );
    }
  }

  async deleteAdminAccount(adminId) {
    try {
      const admin = await Admin.findById(adminId);
      if (!admin || admin.role !== "0") {
        return responses.failureResponse("Unauthorized access", 403);
      }

      // Permanently delete the admin account
      const deletedAdmin = await Admin.findByIdAndDelete(adminId);

      if (!deletedAdmin) {
        return responses.failureResponse("Admin not found", 404);
      }

      return responses.successResponse(
        "Admin account deleted successfully",
        200
      );
    } catch (error) {
      console.error("Error deleting admin account:", error);
      return responses.failureResponse("Unable to delete admin account", 500);
    }
  }

  async approveCourse(adminId, courseId) {
    try {
      const admin = await Admin.findById(adminId);
      if (!admin || admin.role !== "0") {
        return responses.failureResponse("Unauthorized access", 403);
      }

      const course = await Course.findById(courseId);
      if (!course) return responses.failureResponse("Course not found", 404);
      if (course.status === "approved") {
        return responses.failureResponse("Course already approved", 400);
      }

      course.status = "approved";
      course.isPublished = true;
      course.reviewedBy = adminId;
      course.reviewedAt = new Date();
      course.rejectionReason = null;
      await course.save();

      return responses.successResponse(
        "Course approved and published",
        200,
        course
      );
    } catch (error) {
      console.error("Approval error:", error);
      return responses.failureResponse("Failed to approve course", 500);
    }
  }

  async rejectCourse(adminId, courseId, reason) {
    try {
      if (!reason || reason.trim() === "") {
        return responses.failureResponse("Rejection reason is required", 400);
      }

      const course = await Course.findById(courseId);
      if (!course) return responses.failureResponse("Course not found", 404);
      if (course.status === "rejected") {
        return responses.failureResponse("Course already rejected", 400);
      }

      course.status = "rejected";
      course.isPublished = false;
      course.rejectionReason = reason;
      course.reviewedBy = adminId;
      course.reviewedAt = new Date();
      await course.save();

      return responses.successResponse("Course rejected", 200, course);
    } catch (error) {
      console.error("Rejection error:", error);
      return responses.failureResponse("Failed to reject course", 500);
    }
  }

  async getStudentById(adminId, studentId) {
    try {
      const admin = await Admin.findById(adminId);
      if (!admin || admin.role !== "0") {
        return responses.failureResponse("Unauthorized access", 403);
      }

      const student = await Student.findById(studentId).select(
        "-password -privacySettings"
      ); // exclude sensitive fields
      if (!student) {
        return responses.failureResponse("Student not found", 404);
      }

      return responses.successResponse(
        "Student fetched successfully",
        200,
        student
      );
    } catch (error) {
      console.error("There was an error", error);
      return responses.failureResponse("Unable to fetch this Student", 500);
    }
  }

  // controller method
  async getAllStudents(adminId) {
    try {
      const admin = await Admin.findById(adminId);
      if (!admin || admin.role !== "0") {
        return responses.failureResponse("Unauthorized access", 403);
      }

      const students = await Student.find({ deletedAt: null }).select(
        "-password"
      );

      return responses.successResponse(
        "All students fetched successfully",
        200,
        students
      );
    } catch (error) {
      console.error("There was an error", error);
      return responses.failureResponse("Unable to fetch students", 500);
    }
  }
}
