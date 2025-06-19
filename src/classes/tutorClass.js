import Admin from "../models/admin.js";
import Course from "../models/courses.js";
import Payment from "../models/payment.js";
import PurchasedCourse from "../models/purchasedCourse.js";
import Review from "../models/review.js";
import AccountNumber from "../models/account.js";
import Withdrawal from "../models/withdrawals.js";
import responses from "../utils/response.js";
import bcrypt from "bcrypt";
import axios from "axios";

export default class TutorClass {
  async tutorStats(tutorId, timePeriod = "month") {
    try {
      // Calculate startDate and endDate based on the time period
      let startDate, endDate;
      const currentDate = new Date();

      switch (timePeriod) {
        case "week":
          startDate = new Date(
            currentDate.setDate(currentDate.getDate() - currentDate.getDay())
          );
          endDate = new Date(currentDate.setDate(startDate.getDate() + 6));
          break;
        case "month":
          startDate = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth(),
            1
          );
          endDate = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth() + 1,
            0
          );
          break;
        case "year":
          startDate = new Date(currentDate.getFullYear(), 0, 1);
          endDate = new Date(currentDate.getFullYear(), 11, 31);
          break;
        default:
          return responses.failureResponse("Invalid time period", 400);
      }

      const dateFilter = { $gte: startDate, $lte: endDate };
      console.log("start date", startDate);
      console.log("end date", endDate);
      // Find all courses by the tutor
      const courses = await Course.find({ tutor: tutorId }).select(
        "_id title rating views reviewCount"
      );

      if (!courses || courses.length === 0) {
        return responses.failureResponse("No courses found for the tutor", 404);
      }

      const tutorCourseIds = courses.map((course) => course._id);

      // Apply date filter for enrolled courses
      const enrolledCourses = await PurchasedCourse.countDocuments({
        courseId: { $in: tutorCourseIds },
        createdAt: dateFilter,
      });

      // Apply date filter for enrolled students
      const enrolledStudents = (
        await PurchasedCourse.distinct("studentId", {
          courseId: { $in: tutorCourseIds },
          createdAt: dateFilter,
        })
      ).length;

      // Apply date filter for certificates acknowledged
      const certificates = await PurchasedCourse.countDocuments({
        courseId: { $in: tutorCourseIds },
        isCompleted: 1,
        createdAt: dateFilter,
      });

      // Calculate total amount based on paymentId in PurchasedCourse
      const purchasedCourses = await PurchasedCourse.find({
        courseId: { $in: tutorCourseIds },
        createdAt: dateFilter,
      }).select("paymentId");

      const paymentIds = purchasedCourses.map((purchase) => purchase.paymentId);

      // Apply date filter for total amount
      const totalAmount = await Payment.aggregate([
        {
          $match: {
            _id: { $in: paymentIds },
            status: "success",
            createdAt: dateFilter,
          },
        },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]);

      const totalAmountValue =
        totalAmount.length > 0 ? totalAmount[0].total : 0;

      // Apply date filter for recent reviews
      const recentReviews = await Review.find({
        courseId: { $in: tutorCourseIds },
        createdAt: dateFilter,
      })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("courseId", "title")
        .populate("studentId", "firstName lastName")
        .select("rating reviewText");

      // Most Rated Course (not filtered by date, as ratings are accumulated over time)
      const mostRatedCourse = await Review.aggregate([
        {
          $match: {
            createdAt: dateFilter,
          },
        },
        {
          $group: {
            _id: "$courseId",
            averageRating: { $avg: "$rating" },
            reviewCount: { $sum: 1 },
          },
        },
        { $sort: { averageRating: -1 } },
        {
          $lookup: {
            from: "courses",
            localField: "_id",
            foreignField: "_id",
            as: "courseInfo",
          },
        },
        { $unwind: "$courseInfo" },
        {
          $project: {
            courseTitle: "$courseInfo.title",
            averageRating: 1,
            reviewCount: 1,
          },
        },
        { $limit: 1 },
      ]);

      const mostRated = mostRatedCourse.length > 0 ? mostRatedCourse[0] : null;

      // Performance metrics (apply date filtering where applicable)
      const retentionRate =
        enrolledStudents > 0 ? (certificates / enrolledCourses) * 100 : 0;

      const completionRate =
        enrolledStudents > 0 ? (certificates / enrolledCourses) * 100 : 0;

      const courseFeedback = await Review.aggregate([
        {
          $match: {
            courseId: { $in: tutorCourseIds },
            createdAt: dateFilter, // Apply date filter
          },
        },
        {
          $group: {
            _id: "$courseId",
            totalFeedbackScore: { $sum: { $multiply: ["$rating", 1] } },
            totalReviews: { $sum: 1 },
          },
        },
      ]);

      const totalFeedbackCount = courseFeedback.reduce(
        (sum, feedback) => sum + feedback.totalReviews,
        0
      );

      const totalFeedbackScore = courseFeedback.reduce(
        (sum, feedback) => sum + feedback.totalFeedbackScore,
        0
      );

      const feedbackRate =
        totalFeedbackCount > 0 ? totalFeedbackScore / totalFeedbackCount : 0;

      const performanceScore =
        retentionRate * 0.4 + completionRate * 0.4 + feedbackRate * 0.2;

      return responses.successResponse("Tutor overview statistics", 200, {
        quickStats: {
          enrolledCourses,
          enrolledStudents,
          certificates,
          totalAmount: totalAmountValue,
        },
        courseStatistics: courses.map((course) => ({
          title: course.title,
          enrolled: enrolledStudents,
          views: course.views,
          reviewCount: course.reviewCount,
        })),
        mostRatedCourse: mostRated,
        recentReviews: recentReviews.map((review) => ({
          courseTitle: review.courseId.title,
          reviewerName: `${review.studentId.firstName} ${review.studentId.lastName}`,
          rating: review.rating,
          reviewText: review.reviewText,
        })),
        performanceChart: {
          retentionRate,
          completionRate,
          feedbackRate,
          performanceScore,
        },
      });
    } catch (error) {
      console.error("There was an error", error);
      return responses.failureResponse(
        "There was an error fetching the Tutor Overview statistics",
        500
      );
    }
  }

  async tutorCourses(tutorId) {
    try {
      // Fetch all courses created by the tutor
      const coursesData = await Course.find({ tutor: tutorId }).lean();

      if (!coursesData || coursesData.length === 0) {
        return responses.failureResponse(
          "There are no courses found for this Tutor",
          404
        );
      }

      // Get course IDs for querying related data
      const courseIds = coursesData.map((course) => course._id);

      // Aggregate purchased course data
      const purchasedData = await PurchasedCourse.aggregate([
        { $match: { courseId: { $in: courseIds } } },
        {
          $group: {
            _id: "$courseId",
            enrolledStudents: { $addToSet: "$studentId" },
            totalPurchases: { $sum: 1 },
            paymentIds: { $addToSet: "$paymentId" },
            totalMinutes: { $sum: "$minutesSpent" },
          },
        },
      ]);

      // Extract payment IDs
      const paymentIds = purchasedData.flatMap((data) => data.paymentIds);

      // Aggregate payment data
      const paymentData = await Payment.aggregate([
        {
          $match: {
            _id: { $in: paymentIds },
            status: "success",
          },
        },
        {
          $group: {
            _id: null,
            weeklyRevenue: {
              $push: {
                week: { $week: "$paidAt" },
                year: { $year: "$paidAt" },
                revenue: "$amount",
              },
            },
            monthlyRevenue: {
              $push: {
                month: { $month: "$paidAt" },
                year: { $year: "$paidAt" },
                revenue: "$amount",
              },
            },
            totalRevenue: { $sum: "$amount" },
          },
        },
      ]);

      const revenueData = paymentData[0] || {
        weeklyRevenue: [],
        monthlyRevenue: [],
        totalRevenue: 0,
      };

      // Aggregate course rating data
      const ratingData = await Review.aggregate([
        { $match: { courseId: { $in: courseIds } } },
        {
          $group: {
            _id: "$courseId",
            averageRating: { $avg: "$rating" },
          },
        },
      ]);

      // Map aggregated data for easy access
      const purchasedMap = Object.fromEntries(
        purchasedData.map((data) => [
          data._id.toString(),
          {
            enrolledStudents: data.enrolledStudents.length,
            totalPurchases: data.totalPurchases,
            totalMinutes: data.totalMinutes || 0,
          },
        ])
      );

      const ratingMap = Object.fromEntries(
        ratingData.map((data) => [data._id.toString(), data.averageRating])
      );

      // Initialize statistics
      let totalEnrolledStudents = 0;
      let totalWatchHours = 0;
      let publishedCourses = 0;
      let unpublishedCourses = 0;
      const courseEnrolled = [];
      const courseRatings = [];

      // Process courses for response
      for (const course of coursesData) {
        const courseId = course._id.toString();
        const isPublished = course.isPublished;

        if (isPublished) publishedCourses++;
        else unpublishedCourses++;

        const enrolledData = purchasedMap[courseId] || {
          enrolledStudents: 0,
          totalPurchases: 0,
          totalMinutes: 0,
        };

        const watchHours = enrolledData.totalMinutes / 60; // Convert minutes to hours
        const rating = ratingMap[courseId] || 0;

        totalEnrolledStudents += enrolledData.enrolledStudents;
        totalWatchHours += watchHours;

        courseEnrolled.push({
          courseTitle: course.title,
          totalPurchase: enrolledData.totalPurchases,
          isPublished,
        });

        courseRatings.push({ title: course.title, rating });
      }

      // Sort ratings to determine top and least-rated courses
      courseRatings.sort((a, b) => b.rating - a.rating);
      const topRatedCourse = courseRatings[0] || null;
      const leastRatedCourse =
        courseRatings.length > 0
          ? courseRatings[courseRatings.length - 1]
          : null;

      return responses.successResponse("Tutor Courses Statistics", 200, {
        overview: {
          totalEnrolledStudents,
          totalWatchHours,
          totalRevenue: revenueData.totalRevenue,
        },
        ratings: {
          topRatedCourse,
          leastRatedCourse,
        },
        courseDetails: {
          publishedCourses,
          unpublishedCourses,
          courseEnrolled,
        },
        revenue: {
          weekly: revenueData.weeklyRevenue,
          monthly: revenueData.monthlyRevenue,
        },
        coursesData: {
          coursesData,
        },
      });
    } catch (error) {
      console.error("There was an error fetching tutor courses:", error);
      return responses.failureResponse(
        "There was an error fetching the Tutor courses",
        500
      );
    }
  }

  async tutorTransactions(tutorId) {
    try {
      // Fetch courses created by the tutor
      const courseIds = await Course.distinct("_id", { tutor: tutorId });

      if (courseIds.length === 0) {
        return responses.failureResponse(
          "No courses found for this tutor.",
          404
        );
      }

      // Fetch all purchased courses for the tutor's courses
      const purchasedCourses = await PurchasedCourse.find({
        courseId: { $in: courseIds },
      })
        .populate({
          path: "paymentId",
          select: "amount email reference paidAt status",
          match: { status: "success" },
        })
        .populate({
          path: "studentId",
          select: "firstName lastName",
        })
        .populate({
          path: "courseId",
          select: "title",
        });

      if (!purchasedCourses || purchasedCourses.length === 0) {
        return responses.failureResponse(
          "No transactions found for this tutor's courses.",
          404
        );
      }

      // Initialize statistics
      let totalIncome = 0;
      let totalCharges = 0;
      const transactionHistory = [];

      // Process purchased courses to extract transactions
      purchasedCourses.forEach((purchase) => {
        const payment = purchase.paymentId;
        if (!payment) return;

        const paymentAmount = payment.amount || 0;

        // Add to total income
        totalIncome += paymentAmount;

        // Calculate platform charge (10%)
        const charge = paymentAmount * 0.1;
        totalCharges += charge;

        // Extract student and course details
        const studentName = purchase.studentId
          ? `${purchase.studentId.firstName || "N/A"} ${
              purchase.studentId.lastName || "N/A"
            }`
          : "Unknown Student";

        // Build transaction history entry
        transactionHistory.push({
          email: payment.email || "N/A",
          amount: paymentAmount,
          date: payment.paidAt,
          reference: payment.reference || "N/A",
          courses: purchase.courseId.title || "Unknown Course",
          studentName,
        });
      });

      // Calculate net income
      const netIncome = totalIncome - totalCharges;

      return responses.successResponse("Tutor Transaction Details", 200, {
        transactionHistory,
        totalIncome,
        totalCharges,
        netIncome,
      });
    } catch (error) {
      console.error("Error fetching tutor transactions:", error);
      return responses.failureResponse(
        "Error fetching tutor transactions.",
        500
      );
    }
  }

  async tutorStudents(tutorId) {
    try {
      // Fetch courses taught by the tutor
      const courses = await Course.find({ tutor: tutorId }).select("_id");

      if (!courses || courses.length === 0) {
        return responses.failureResponse(
          "There are no courses found for this tutor",
          404
        );
      }

      const tutorCourseIds = courses.map((course) => course._id);

      // Fetch student details for the tutor's courses
      const studentDetails = await PurchasedCourse.aggregate([
        {
          $match: {
            courseId: { $in: tutorCourseIds },
          },
        },
        {
          $lookup: {
            from: "students",
            localField: "studentId",
            foreignField: "_id",
            as: "studentDetails",
          },
        },
        {
          $unwind: "$studentDetails",
        },
        {
          $lookup: {
            from: "courses",
            localField: "courseId",
            foreignField: "_id",
            as: "courseDetails",
          },
        },
        {
          $unwind: "$courseDetails",
        },
        {
          $group: {
            _id: "$studentId",
            studentInfo: { $first: "$studentDetails" },
            coursesPurchased: {
              $push: {
                courseId: "$courseDetails._id",
                title: "$courseDetails.title",
                price: "$courseDetails.price",
                purchaseDate: "$purchaseDate",
              },
            },
          },
        },
        {
          $project: {
            "studentInfo.firstName": 1,
            "studentInfo.lastName": 1,
            "studentInfo.email": 1,
            coursesPurchased: 1,
          },
        },
      ]);

      // Calculate new students within the last 30 days
      const today = new Date();
      const thirtyDaysAgo = new Date(today.setDate(today.getDate() - 30));

      const newStudents = studentDetails.filter((student) =>
        student.coursesPurchased.some(
          (course) => new Date(course.purchaseDate) >= thirtyDaysAgo
        )
      );

      // Calculate retention percentage (completed courses by students)
      const totalCompletion = await PurchasedCourse.countDocuments({
        courseId: { $in: tutorCourseIds },
        isCompleted: true,
      });

      const retentionPercentage =
        studentDetails.length > 0
          ? (totalCompletion / studentDetails.length) * 100
          : 0;

      // Calculate total amount using paymentId from PurchasedCourse
      const paymentIds = await PurchasedCourse.distinct("paymentId", {
        courseId: { $in: tutorCourseIds },
      });

      const totalAmount = await Payment.aggregate([
        {
          $match: {
            _id: { $in: paymentIds },
            status: "success",
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$amount" },
          },
        },
      ]);

      const totalAmountValue =
        totalAmount.length > 0 ? totalAmount[0].total : 0;

      if (!studentDetails.length) {
        return responses.failureResponse("No student details found", 404);
      }

      return responses.successResponse("Tutor student statistics", 200, {
        totalStudents: studentDetails.length,
        newStudents: newStudents.length,
        retentionPercentage,
        totalAmount: totalAmountValue,
        studentDetails,
      });
    } catch (error) {
      console.error("There was an error:", error);
      return responses.failureResponse(
        "There was an error getting this information",
        500
      );
    }
  }

  async tutorCourseAnalytics(tutorId) {
    try {
      const courses = await Course.find({ tutor: tutorId }).select(
        "title views"
      );

      const purchaseCounts = await PurchasedCourse.aggregate([
        {
          $lookup: {
            from: "courses",
            localField: "courseId",
            foreignField: "_id",
            as: "course",
          },
        },
        { $unwind: "$course" },
        { $match: { "course.tutor": tutorId } },
        {
          $group: {
            _id: "$courseId",
            purchaseCount: { $sum: 1 },
          },
        },
      ]);

      const analytics = courses.map((course) => {
        const purchaseData = purchaseCounts.find(
          (item) => item._id.toString() === course._id.toString()
        );

        const purchaseCount = purchaseData ? purchaseData.purchaseCount : 0;
        // To check how many views became purchases
        const purchasePercentage = course.views
          ? ((purchaseCount / course.views) * 100).toFixed(2)
          : 0;
        return {
          courseId: course._id,
          title: course.title,
          views: course.views,
          purchases: purchaseCount,
          purchasePercentage: `${purchasePercentage}%`,
        };
      });

      return responses.successResponse(
        "Tutor Course analytics retrieved successfully",
        200,
        analytics
      );
    } catch (error) {
      console.error("There was an error", error);
      return responses.failureResponse(
        "Unable to retrieve Course analytics",
        500
      );
    }
  }

  async changePassword(tutorId, payload) {
    try {
      const { oldPassword, newPassword } = payload;

      if (!oldPassword || !newPassword) {
        return responses.failureResponse(
          "Old and new passwords are required",
          400
        );
      }

      const tutor = await Admin.findById(tutorId);

      if (!tutor) {
        return responses.failureResponse(
          "Invalid tutor token. There is no tutor with this Id",
          400
        );
      }

      if (!tutor.password) {
        return responses.failureResponse(
          "Tutor password is not set. Please contact support.",
          400
        );
      }

      // Check if the old password is correct
      const isMatch = await bcrypt.compare(oldPassword, tutor.password);

      if (!isMatch) {
        console.log("Password does not match");
        return responses.failureResponse("This password is incorrect", 400);
      }

      // Hash and set the new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      const updatedTutor = await Admin.findByIdAndUpdate(
        tutorId,
        { password: hashedPassword },
        { new: true }
      );

      return responses.successResponse(
        "Tutor password updated successfully",
        200,
        updatedTutor
      );
    } catch (error) {
      console.error("Unable to update the password", error);
      return responses.failureResponse(
        "There was an error updating the Tutor password",
        500
      );
    }
  }

  async updateProfile(tutorId, payload) {
    try {
      const tutor = await Admin.findById(tutorId);
      if (!tutor) {
        return responses.failureResponse(
          "Invalid tutor token. There is no tutor with this Id",
          400
        );
      }

      const updatedTutor = await Admin.findByIdAndUpdate(tutorId, payload, {
        new: true,
      });

      return responses.successResponse(
        "Tutor Information updated successfully",
        200,
        updatedTutor
      );
    } catch (error) {
      console.error("There was an error updating your profile", error);
      return responses.failureResponse("Unable to update Tutor's profile", 500);
    }
  }

  async deleteAccount(tutorId) {
    try {
      const tutor = await Admin.findOneAndUpdate(
        { _id: tutorId, role: "1", isActive: true }, // only logged in and active tutors can deactivate
        { isActive: false }, // using a soft delete to mark as inactive
        { new: true }
      );

      if (!tutor) {
        return responses.failureResponse(
          "Tutor not found or already deleted",
          404
        );
      }
      return responses.successResponse(
        "Account deleted successfully",
        200,
        tutor
      );
    } catch (error) {
      console.error("There was an error trying to delete your account", error);
      return responses.failureResponse("Unable to delete this account", 500);
    }
  }

  async addBankDetails(tutorId, payload) {
    try {
      const { accountName, accountNumber, bankName, bankCode } = payload;

      const newAccount = new AccountNumber({
        tutor: tutorId,
        accountName,
        accountNumber,
        bankName,
        bankCode,
      });

      await newAccount.save();

      return responses.successResponse(
        "Account details added successfully",
        200,
        newAccount
      );
    } catch (error) {
      console.error("There was an error,", error);
      return responses.failureResponse("Unable to add account number", 500);
    }
  }

  async getTutorBankAccounts(tutorId) {
    try {
      const accounts = await AccountNumber.find({ tutor: tutorId });
      if (!accounts.length) {
        return responses.failureResponse("No bank accounts found", 404);
      }

      return responses.successResponse("Accounts displayed", 200, accounts);
    } catch (error) {
      console.error("There was an error fetching tutor account details", error);
      return responses.failureResponse(
        "Unable to retrieve tutor accounts",
        500
      );
    }
  }

  async deleteBankAccount(accountId, tutorId) {
    try {
      const deletedAccount = await AccountNumber.findOneAndDelete({
        _id: accountId,
        tutor: tutorId,
      });

      if (!deletedAccount) {
        return responses.failureResponse(
          "Bank account not found or unauthorized",
          400
        );
      }

      return responses.successResponse(
        "Bank account deleted successfully",
        200
      );
    } catch (error) {
      throw new Error("Error deleting bank account");
    }
  }

  // Helper function to calculate tutors earnings
  calculateTutorEarnings = async (tutorId) => {
    const courses = await Course.find({ tutor: tutorId }).select("_id");
    const courseIds = courses.map((c) => c._id.toString());

    const purchasedCourses = await PurchasedCourse.find({
      courseId: { $in: courseIds },
    }).populate("paymentId");

    const total = purchasedCourses.reduce((acc, item) => {
      const payment = item.paymentId;
      return payment?.status === "success" ? acc + payment.amount : acc;
    }, 0);

    return total * 0.9; // 10% platform charge
  };

  async requestWithdrawal(tutorId, amount, accountId) {
    try {
      const tutor = await Admin.findById(tutorId);
      if (!tutor || tutor.role !== "1") {
        return responses.failureResponse("UNAUTHORIZED", 403);
      }

      const earnings = await this.calculateTutorEarnings(tutorId);
      const withdrawn = await Withdrawal.aggregate([
        { $match: { tutor: tutor._id, status: "success" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]);

      const available = earnings - (withdrawn[0]?.total || 0);
      if (amount > available) {
        return responses.failureResponse("Insufficient balance", 400);
      }

      const account = await AccountNumber.findById(accountId);
      if (!account) {
        return responses.failureResponse("Account not found", 404);
      }

      // // Step 1: Create transfer recipient
      // const options = {
      //   headers: {
      //     "Content-Type": "application/json",
      //     Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      //   },
      // };

      // const recipientBody = {
      //   type: "nuban",
      //   name: account.accountName,
      //   account_number: account.accountNumber,
      //   bank_code: account.bankCode,
      //   currency: "NGN",
      // };

      // const paystackRecipientURL = `${process.env.PAYSTACK_BASE_URL}/transferrecipient`;
      // const recipientRes = await axios.post(
      //   paystackRecipientURL,
      //   recipientBody,
      //   options
      // );
      // const recipientCode = recipientRes.data.data.recipient_code;

      // // Step 2: Initiate Transfer
      // const reference = `TWP_WD-${Date.now()}-${Math.floor(
      //   Math.random() * 10000000000
      // )}`;
      // const transferBody = {
      //   source: "balance",
      //   amount: amount * 100,
      //   recipient: recipientCode,
      //   reason: "Tutor Withdrawal",
      //   reference,
      // };

      // const paystackTransferURL = `${process.env.PAYSTACK_BASE_URL}/transfer`;
      // const transferRes = await axios.post(
      //   paystackTransferURL,
      //   transferBody,
      //   options
      // );
      // const transfer = transferRes.data.data;

      // // Step 3: Record the witdrawal
      // const newWithdrawal = new Withdrawal({
      //   tutor: tutorId,
      //   amount,
      //   accountId,
      //   reference,
      //   status: transfer.status === "success" ? "success" : "pending",
      //   transferredAt: new Date(),
      // });

      // await newWithdrawal.save();

      // return responses.successResponse("Withdrawal initiated", 200, newWithdrawal);

      // Fake transfer
      // Simulate recipient creation and transfer
      const reference = `WD-${Date.now()}-SIM`;

      // ✅ Fake transfer object
      const fakeTransfer = {
        status: "success",
        reference: reference,
        transferredAt: new Date(),
      };

      // Save the simulated withdrawal
      const newWithdrawal = new Withdrawal({
        tutor: tutorId,
        amount,
        accountId,
        reference: fakeTransfer.reference,
        status: fakeTransfer.status,
        transferredAt: fakeTransfer.transferredAt,
      });

      await newWithdrawal.save();

      return responses.successResponse(
        "Mock withdrawal recorded",
        200,
        newWithdrawal
      );
    } catch (error) {
      console.error(
        "Withdrawal error:",
        error?.response?.data || error.message
      );
      return responses.failureResponse("Unable to initiate this transfer", 500);
    }
  }
}
