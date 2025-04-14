import Admin from "../models/admin.js";
import Student from "../models/student.js";
import PurchasedCourse from "../models/purchasedCourse.js";
import Course from "../models/courses.js";
import Payment from "../models/payment.js";
import Comment from "../models/comments.js";
import Review from "../models/review.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import responses from "../utils/response.js";
import crypto from "crypto";
import constants from "../constants/index.js";
import getTemplate from "../utils/getTemplates.js";
import sendMail from "../utils/mail.js";

export default class AdminClass {
  // Create Admin
  async createAdmin(payload) {
    // User = Staff, Tutor, Admin
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

      const [
        totalStudents,
        totalTutors,
        totalCourses,
        totalPurchases,
        completedCourses,
        totalRevenueData,
        topCoursesAgg,
        recentTransactions,
        recentPurchases,
        recentComments,
        recentReviews,
      ] = await Promise.all([
        Student.countDocuments({ deletedAt: null }),
        Admin.countDocuments({ role: "1" }),
        Course.countDocuments(),
        PurchasedCourse.countDocuments(),
        PurchasedCourse.countDocuments({ isCompleted: 1 }),
        Payment.aggregate([
          { $match: { status: "success" } },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ]),
        PurchasedCourse.aggregate([
          {
            $group: {
              _id: "$courseId",
              count: { $sum: 1 },
            },
          },
          { $sort: { count: -1 } },
          { $limit: 3 },
        ]),
        Payment.find({ status: "success" })
          .sort({ createdAt: -1 })
          .limit(5)
          .populate("studentId", "firstName lastName"),
        PurchasedCourse.find()
          .sort({ createdAt: -1 })
          .limit(3)
          .populate("studentId", "firstName lastName")
          .populate("courseId", "title"),
        Comment.find()
          .sort({ createdAt: -1 })
          .limit(3)
          .populate("studentId", "firstName lastName")
          .populate("courseId", "title"),
        Review.find()
          .sort({ createdAt: -1 })
          .limit(3)
          .populate("studentId", "firstName lastName")
          .populate("courseId", "title"),
      ]);

      const totalRevenue =
        totalRevenueData.length > 0 ? totalRevenueData[0].total : 0;

      // Bar chart data: monthly purchases
      const barChartData = await PurchasedCourse.aggregate([
        {
          $group: {
            _id: { $month: "$createdAt" },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      // Process recent activities into a flat list
      const recentActivities = [
        ...recentPurchases.map((item) => ({
          activityType: "purchase",
          studentName: `${item.studentId?.firstName || ""} ${
            item.studentId?.lastName || ""
          }`.trim(),
          courseTitle: item.courseId?.title || "Unknown Course",
          createdAt: item.createdAt,
        })),
        ...recentComments.map((item) => ({
          activityType: "comment",
          studentName: `${item.studentId?.firstName || ""} ${
            item.studentId?.lastName || ""
          }`.trim(),
          courseTitle: item.courseId?.title || "Unknown Course",
          createdAt: item.createdAt,
        })),
        ...recentReviews.map((item) => ({
          activityType: "review",
          studentName: `${item.studentId?.firstName || ""} ${
            item.studentId?.lastName || ""
          }`.trim(),
          courseTitle: item.courseId?.title || "Unknown Course",
          createdAt: item.createdAt,
        })),
      ]
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 5); // Limit to 5 most recent

      return responses.successResponse(
        "Admin Overview fetched successfully",
        200,
        {
          totalStudents,
          totalTutors,
          totalCourses,
          totalPurchases,
          completedCourses,
          completionRate:
            totalPurchases > 0
              ? ((completedCourses / totalPurchases) * 100).toFixed(2)
              : 0,
          totalRevenue,
          barChartData,
          recentActivities,
          topCourses: topCoursesAgg,
          recentTransactions,
        }
      );
    } catch (error) {
      console.error("Error in fetching admin overview:", error);
      return responses.failureResponse("Failed to fetch admin overview", 500);
    }
  }
}
