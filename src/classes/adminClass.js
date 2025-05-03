import Admin from "../models/admin.js";
import {
  getCoreMetrics,
  getTotalRevenue,
  getBarChartData,
  getRecentActivities,
  getTopCourses,
  getTopTutors,
  getNewTutors,
  getAverageTutorRating,
  getSalesTrend,
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
      const [barChartData, recentActivities, totalRevenue] = await Promise.all([
        getBarChartData(),
        getRecentActivities(),
        getTotalRevenue(),
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
      });
    } catch (error) {
      console.error("Error fetching overview:", error);
      return responses.failureResponse("Failed to fetch overview", 500);
    }
  }

  async adminStudents(adminId, filter = "all", page = 1, limit = 10) {
    try {
      const admin = await Admin.findById(adminId);
      if (!admin || admin.role !== "0") {
        return responses.failureResponse("Unauthorized access", 403);
      }

      const dateFilter = getDateFilter(filter);

      const [
        totalStudents,
        purchasedCourses,
        completedCourses,
        reviews,
        timeStats,
      ] = await Promise.all([
        getTotalStudents(),
        getPurchasedCourses(dateFilter),
        getCompletedCourses(dateFilter),
        getReviews(dateFilter),
        getTimeStatistics(dateFilter),
      ]);

      const abandonedCourses = purchasedCourses.filter((c) => !c.isCompleted);

      const { students: enrolledStudents, total: enrolledStudentsCount } =
        await getEnrolledStudents(purchasedCourses, page, limit);

      const completionRate = calculateCompletionRate(
        purchasedCourses,
        completedCourses
      );

      const mappedReviews = reviews.map((r) => ({
        student:
          `${r.studentId?.firstName || ""} ${
            r.studentId?.lastName || ""
          }`.trim() || "Unknown",
        course: r.courseId?.title || "Unknown",
        rating: r.rating,
        reviewText: r.reviewText,
        createdAt: r.createdAt,
      }));

      return responses.successResponse("Student stats fetched", 200, {
        totalStudents,
        totalPurchases: purchasedCourses.length,
        completedCourses: completedCourses.length,
        abandonedCourses: abandonedCourses.length,
        completionRate,
        enrolledStudents,
        enrolledStudentsCount,
        reviews: mappedReviews,
        timeStats,
      });
    } catch (error) {
      console.error("There was an error", error);
      return responses.failureResponse("Unable to fetch students data", 500);
    }
  }

  async adminTutorAnalytics(adminId, timeframe = "month") {
    try {
      const admin = await Admin.findById(adminId);
      if (!admin || admin.role !== "0") {
        return responses.failureResponse("Unauthorized access", 403);
      }

      const [
        totalTutors,
        newTutors,
        averageRating,
        topTutors,
        topCourses,
        salesTrend,
        totalRevenue,
      ] = await Promise.all([
        Admin.countDocuments({ role: "1" }),
        getNewTutors(timeframe),
        getAverageTutorRating(),
        getTopTutors(3),
        getTopCourses(5),
        getSalesTrend(timeframe),
        getTotalRevenue(),
      ]);

      // Calculate averages
      const averageRevenue =
        totalTutors > 0 ? (totalRevenue / totalTutors).toFixed(2) : 0;

      return responses.successResponse("Analytics fetched", 200, {
        overview: { totalTutors, newTutors, averageRating, averageRevenue },
        topTutors,
        topCourses,
        salesTrend,
      });
    } catch (error) {
      console.error("Analytics error:", error);
      return responses.failureResponse("Failed to fetch analytics", 500);
    }
  }
}
