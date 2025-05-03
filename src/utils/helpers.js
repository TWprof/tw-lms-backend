import { startOfWeek, startOfMonth, startOfYear } from "date-fns";
import Admin from "../models/admin.js";
import Student from "../models/student.js";
import PurchasedCourse from "../models/purchasedCourse.js";
import Course from "../models/courses.js";
import Payment from "../models/payment.js";
import Comment from "../models/comments.js";
import Review from "../models/review.js";

export async function getCoreMetrics() {
  const [
    totalStudents,
    totalTutors,
    totalCourses,
    totalPurchases,
    completedCourses,
  ] = await Promise.all([
    Student.countDocuments({ deletedAt: null }),
    Admin.countDocuments({ role: "1" }),
    Course.countDocuments(),
    PurchasedCourse.countDocuments(),
    PurchasedCourse.countDocuments({ isCompleted: 1 }),
  ]);

  return {
    totalStudents,
    totalTutors,
    totalCourses,
    totalPurchases,
    completedCourses,
  };
}

export async function getTotalRevenue() {
  const result = await Payment.aggregate([
    { $match: { status: "success" } },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);
  return result.length ? result[0].total : 0;
}

export async function getBarChartData(year = new Date().getFullYear()) {
  const raw = await Payment.aggregate([
    {
      $match: {
        status: "success",
        createdAt: {
          $gte: new Date(`${year}-01-01T00:00:00.000Z`),
          $lte: new Date(`${year}-12-31T23:59:59.999Z`),
        },
      },
    },
    {
      $group: {
        _id: {
          month: { $month: "$createdAt" },
          year: { $year: "$createdAt" },
        },
        totalAmount: { $sum: "$amount" },
      },
    },
    { $sort: { "_id.month": 1 } },
  ]);

  const result = raw.map(({ _id, totalAmount }) => {
    const date = new Date(_id.year, _id.month - 1);
    const monthName = date.toLocaleString("default", { month: "short" });

    const platformCharge = +(totalAmount * 0.1).toFixed(2);
    const tutorRevenue = +(totalAmount * 0.9).toFixed(2);

    return {
      month: monthName,
      tutorRevenue,
      platformCharge,
    };
  });

  return result;
}

export async function getRecentActivities() {
  const [purchases, comments, reviews] = await Promise.all([
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

  const formatActivity = (items, type) =>
    items.map((item) => ({
      activityType: type,
      studentName: `${item.studentId?.firstName || ""} ${
        item.studentId?.lastName || ""
      }`.trim(),
      courseTitle: item.courseId?.title || "Unknown Course",
      createdAt: item.createdAt,
    }));

  return [
    ...formatActivity(purchases, "purchase"),
    ...formatActivity(comments, "comment"),
    ...formatActivity(reviews, "review"),
  ]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 5);
}

export async function getTopCourses() {
  const topCourses = await PurchasedCourse.aggregate([
    {
      $group: {
        _id: "$courseId",
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
    { $limit: 3 },
    {
      $lookup: {
        from: "courses",
        localField: "_id",
        foreignField: "_id",
        as: "courseDetails",
      },
    },
    {
      $unwind: "$courseDetails", // Flatten array
    },
    {
      $project: {
        _id: 0, // hide the aggregation _id
        courseId: "$courseDetails._id",
        title: "$courseDetails.title",
        price: "$courseDetails.price",
        thumbnailURL: "$courseDetails.thumbnailURL",
        tutorName: "$courseDetails.tutorName",
        tutorEmail: "$courseDetails.tutorEmail",
        purchaseCount: "$count", // from aggregation
      },
    },
  ]);

  return topCourses;
}

export async function getTopTutors() {
  try {
    // Step 1: Fetch all tutors' courses
    const courses = await Course.find()
      .select("_id tutor title thumbnailURL price purchaseCount")
      .lean();

    // Group courses by tutor
    const tutorCoursesMap = new Map();

    for (let course of courses) {
      const tutorId = course.tutor.toString();
      if (!tutorCoursesMap.has(tutorId)) {
        tutorCoursesMap.set(tutorId, []);
      }
      tutorCoursesMap.get(tutorId).push(course);
    }

    const tutorStats = [];

    // Step 2: Calculate tutor stats
    for (let [tutorId, courseList] of tutorCoursesMap.entries()) {
      const courseIds = courseList.map((c) => c._id);

      // Get all purchases related to tutor's courses
      const purchases = await PurchasedCourse.find({
        courseId: { $in: courseIds },
      }).lean();

      const totalPurchases = purchases.length;
      const completedPurchases = purchases.filter(
        (p) => p.isCompleted === 1
      ).length;

      const completionRate =
        totalPurchases > 0
          ? ((completedPurchases / totalPurchases) * 100).toFixed(2)
          : "0.00";

      // Find tutor details
      const tutorDetails = await Admin.findById(tutorId)
        .select("firstName lastName email")
        .lean();

      if (!tutorDetails) continue; // If tutor is deleted somehow, skip

      // Find best-selling course (highest purchaseCount)
      const bestSellingCourse = courseList.sort(
        (a, b) => b.purchaseCount - a.purchaseCount
      )[0];

      tutorStats.push({
        tutorId,
        name: `${tutorDetails.firstName} ${tutorDetails.lastName}`,
        email: tutorDetails.email,
        completionRate: parseFloat(completionRate),
        bestCourse: {
          courseId: bestSellingCourse._id,
          title: bestSellingCourse.title,
          thumbnailURL: bestSellingCourse.thumbnailURL,
          price: bestSellingCourse.price,
          purchaseCount: bestSellingCourse.purchaseCount,
        },
      });
    }

    // Step 3: Sort by completion rate descending and return top 3
    const topTutors = tutorStats
      .sort((a, b) => b.completionRate - a.completionRate)
      .slice(0, 3);

    return topTutors;
  } catch (error) {
    console.error("Error fetching top tutors:", error);
    throw error;
  }
}

export function getDateFilter(filter) {
  const now = new Date();

  if (filter === "week") {
    return { createdAt: { $gte: startOfWeek(now) } };
  } else if (filter === "month") {
    return { createdAt: { $gte: startOfMonth(now) } };
  } else if (filter === "year") {
    return { createdAt: { $gte: startOfYear(now) } };
  } else {
    return {}; // no filter for "all"
  }
}

export async function getTotalStudents() {
  return Student.countDocuments({ deletedAt: null });
}

export async function getPurchasedCourses(dateFilter) {
  return PurchasedCourse.find(dateFilter).populate("studentId courseId");
}

export async function getCompletedCourses(dateFilter) {
  return PurchasedCourse.find({
    isCompleted: true,
    ...dateFilter,
  });
}

export async function getReviews(dateFilter) {
  return Review.find(dateFilter).populate("studentId courseId");
}

export function calculateCompletionRate(purchasedCourses, completedCourses) {
  return purchasedCourses.length > 0
    ? ((completedCourses.length / purchasedCourses.length) * 100).toFixed(2)
    : 0;
}

export async function getEnrolledStudents(
  purchasedCourses,
  page = 1,
  limit = 10
) {
  const skip = (page - 1) * limit;
  const paginated = purchasedCourses.slice(skip, skip + limit);

  // Get the actual documents for the paginated purchasedCourses with full population
  const ids = paginated.map((item) => item._id);
  const purchases = await PurchasedCourse.find({ _id: { $in: ids } })
    .populate("studentId", "firstName lastName email")
    .populate("courseId", "title")
    .populate("paymentId", "amount status");

  const students = purchases.map((item) => ({
    studentName:
      `${item.studentId?.firstName || ""} ${
        item.studentId?.lastName || ""
      }`.trim() || "Unknown",
    email: item.studentId?.email || "Unknown",
    purchaseDate: item.createdAt,
    courseTitle: item.courseId?.title || "Unknown",
    amountPaid:
      item.paymentId?.status === "success" ? item.paymentId.amount : 0,
  }));

  return {
    students,
    total: purchasedCourses.length,
  };
}

export async function getTimeStatistics(dateFilter = {}) {
  const matchStage =
    Object.keys(dateFilter).length > 0 ? { updatedAt: dateFilter } : {};

  const stats = await PurchasedCourse.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: { $dayOfWeek: "$updatedAt" }, // 1 = Sunday, 7 = Saturday
        totalMinutesSpent: { $sum: "$minutesSpent" },
      },
    },
    {
      $project: {
        dayOfWeek: "$_id",
        totalMinutesSpent: 1,
        _id: 0,
      },
    },
    { $sort: { dayOfWeek: 1 } },
  ]);

  return stats;
}

/**
 * Get new tutors count for a timeframe (reuses getDateFilter)
 */
export async function getNewTutors(timeframe) {
  return Admin.countDocuments({
    role: "1",
    ...getDateFilter(timeframe),
  });
}

/**
 * Get average tutor rating (simple aggregation)
 */
export async function getAverageTutorRating() {
  const result = await Admin.aggregate([
    { $match: { role: "1" } },
    { $group: { _id: null, avgRating: { $avg: "$rating" } } },
  ]);
  return result[0]?.avgRating?.toFixed(1) || 0;
}

/**
 * Enhanced sales trend with tutor growth (modifies getBarChartData)
 */
export async function getSalesTrend(filter = "month") {
  const payments = await Payment.aggregate([
    { $match: { status: "success" } },
    {
      $group: {
        _id: {
          month: { $month: "$createdAt" },
          year: { $year: "$createdAt" },
        },
        totalAmount: { $sum: "$amount" },
      },
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } },
  ]);

  const monthlyTotals = {};

  // Aggregate totals per month
  payments.forEach((item) => {
    if (!item._id) return;
    const { month } = item._id;
    monthlyTotals[month] = item.totalAmount;
  });

  // Build array for all 12 months
  const trend = Array.from({ length: 12 }, (_, i) => {
    const monthIndex = i + 1;
    const amount = monthlyTotals[monthIndex] || 0;
    const platformCharge = +(amount * 0.1).toFixed(2);
    const tutorRevenue = +(amount * 0.9).toFixed(2);

    return {
      month: new Date(0, i).toLocaleString("default", { month: "short" }),
      tutorRevenue,
      platformCharge,
    };
  });

  return trend;
}
