import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
} from "date-fns";
import Admin from "../models/admin.js";
import Student from "../models/student.js";
import PurchasedCourse from "../models/purchasedCourse.js";
import Course from "../models/courses.js";
import Payment from "../models/payment.js";
import Comment from "../models/comments.js";
import Review from "../models/review.js";

export function getDateFilter(filter) {
  const now = new Date();

  let startDate, endDate;

  switch (filter?.toLowerCase()) {
    case "day":
      startDate = startOfDay(now);
      endDate = endOfDay(now);
      break;

    case "week":
      startDate = startOfWeek(now, { weekStartsOn: 1 }); // Monday as start of week
      endDate = endOfWeek(now, { weekStartsOn: 1 });
      break;

    case "month":
      startDate = startOfMonth(now);
      endDate = endOfMonth(now);
      break;

    case "year":
      startDate = startOfYear(now);
      endDate = endOfYear(now);
      break;

    default:
      // Check if it's a month number like "1" for Jan or "12" for Dec
      const parsedMonth = parseInt(filter);
      if (!isNaN(parsedMonth) && parsedMonth >= 1 && parsedMonth <= 12) {
        const year = now.getFullYear();
        startDate = new Date(year, parsedMonth - 1, 1);
        endDate = endOfMonth(startDate);
      } else {
        return {}; // No filtering (e.g., "all")
      }
  }

  return {
    createdAt: {
      $gte: startDate,
      $lte: endDate,
    },
  };
}

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
        },
        totalAmount: { $sum: "$amount" },
      },
    },
    { $sort: { "_id.month": 1 } },
  ]);

  // Create a default map of all 12 months
  const months = Array.from({ length: 12 }, (_, i) => {
    const date = new Date(year, i);
    const monthName = date.toLocaleString("default", { month: "short" });
    return {
      month: monthName,
      tutorRevenue: 0,
      platformCharge: 0,
    };
  });

  // Fill in values from aggregation
  raw.forEach(({ _id, totalAmount }) => {
    const monthIndex = _id.month - 1;
    const tutorRevenue = +(totalAmount * 0.9).toFixed(2);
    const platformCharge = +(totalAmount * 0.1).toFixed(2);

    months[monthIndex] = {
      ...months[monthIndex],
      tutorRevenue,
      platformCharge,
    };
  });

  return months;
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

export async function getTopCourses(dateFilter = {}) {
  const topCourses = await PurchasedCourse.aggregate([
    { $match: dateFilter },
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

export async function getTotalStudents(dateFilter = {}) {
  return Student.countDocuments({ deletedAt: null, ...dateFilter });
}

export async function getPurchasedCourses(dateFilter = {}) {
  return PurchasedCourse.find({ ...dateFilter }).populate("courseId studentId");
}

export async function getCompletedCourses(dateFilter = {}) {
  return PurchasedCourse.find({ isCompleted: 1, ...dateFilter });
}

export async function getReviews(dateFilter = {}) {
  return Review.find({ ...dateFilter })
    .populate("studentId", "firstName lastName")
    .populate("courseId", "title");
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
  const matchStage = Object.keys(dateFilter).length > 0 ? dateFilter : {};

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
  ]);

  // Mapping from day number (MongoDB's $dayOfWeek) to day name
  const dayNameMap = {
    1: "Sun",
    2: "Mon",
    3: "Tue",
    4: "Wed",
    5: "Thu",
    6: "Fri",
    7: "Sat",
  };

  // Initialize all days with 0
  const fullWeek = Object.entries(dayNameMap).map(([dayNum, dayName]) => ({
    dayOfWeek: dayName,
    totalMinutesSpent: 0,
  }));

  // Fill in real values where available
  stats.forEach(({ dayOfWeek, totalMinutesSpent }) => {
    const index = fullWeek.findIndex(
      (d) => d.dayOfWeek === dayNameMap[dayOfWeek]
    );
    if (index !== -1) {
      fullWeek[index].totalMinutesSpent = totalMinutesSpent;
    }
  });

  return fullWeek;
}

export async function getNewTutors(dateFilter = {}) {
  return Admin.countDocuments({ role: "1", ...dateFilter });
}

export async function getAverageTutorRating() {
  const result = await Course.aggregate([
    { $match: { rating: { $exists: true, $gt: 0 } } },
    {
      $group: {
        _id: "$tutorId",
        tutorAvgRating: { $avg: "$rating" },
      },
    },
    {
      $group: {
        _id: null,
        avgRating: { $avg: "$tutorAvgRating" },
      },
    },
  ]);

  return result[0]?.avgRating?.toFixed(1) || 0;
}

export async function getSalesTrend(filter = "month") {
  let groupId;
  let sortStage;

  if (filter === "year") {
    groupId = { year: { $year: "$createdAt" } };
    sortStage = { "_id.year": 1 };
  } else if (filter === "week") {
    groupId = {
      year: { $year: "$createdAt" },
      week: { $isoWeek: "$createdAt" },
    };
    sortStage = { "_id.year": 1, "_id.week": 1 };
  } else {
    // Default to "month"
    groupId = {
      year: { $year: "$createdAt" },
      month: { $month: "$createdAt" },
    };
    sortStage = { "_id.year": 1, "_id.month": 1 };
  }

  const payments = await Payment.aggregate([
    { $match: { status: "success" } },
    {
      $group: {
        _id: groupId,
        totalAmount: { $sum: "$amount" },
      },
    },
    { $sort: sortStage },
  ]);

  const trend = payments.map((item) => {
    const total = item.totalAmount;
    ``;
    const platformCharge = +(total * 0.1).toFixed(2);
    const tutorRevenue = +(total * 0.9).toFixed(2);

    let label;
    if (filter === "year") {
      label = `${item._id.year}`;
    } else if (filter === "week") {
      label = `W${item._id.week} ${item._id.year}`;
    } else {
      const date = new Date(item._id.year, item._id.month - 1);
      label = date.toLocaleString("default", {
        month: "short",
        year: "numeric",
      }); // e.g., "Mar 2025"
    }

    return {
      label,
      tutorRevenue,
      platformCharge,
    };
  });

  return trend;
}
