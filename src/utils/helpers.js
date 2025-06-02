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
  const result = await PurchasedCourse.aggregate([
    // 1. Filter purchases by date (if provided)
    { $match: dateFilter },

    // 2. Group by courseId to count purchases
    {
      $group: {
        _id: "$courseId",
        purchaseCount: { $sum: 1 },
      },
    },

    // 3. Fetch course details
    {
      $lookup: {
        from: "courses",
        localField: "_id",
        foreignField: "_id",
        as: "courseDetails",
      },
    },

    // 4. Keep courses even if lookup fails (flatten array)
    { $unwind: { path: "$courseDetails", preserveNullAndEmptyArrays: true } },

    // 5. Calculate total purchases across all courses
    {
      $group: {
        _id: null,
        totalPurchases: { $sum: "$purchaseCount" },
        courses: { $push: "$$ROOT" }, // Preserve all courses
      },
    },

    // 6. Add percentage and format output
    {
      $project: {
        _id: 0,
        courses: {
          $map: {
            input: "$courses",
            as: "course",
            in: {
              courseId: "$$course._id",
              // Fallback to "Unknown Course" if details missing
              title: {
                $ifNull: ["$$course.courseDetails.title", "Unknown Course"],
              },
              price: { $ifNull: ["$$course.courseDetails.price", 0] },
              thumbnailURL: {
                $ifNull: ["$$course.courseDetails.thumbnailURL", null],
              },
              tutorName: {
                $ifNull: ["$$course.courseDetails.tutorName", "Unknown Tutor"],
              },
              purchaseCount: "$$course.purchaseCount",
              // Round percentage to 2 decimal places
              purchasePercentage: {
                $round: [
                  {
                    $multiply: [
                      {
                        $divide: ["$$course.purchaseCount", "$totalPurchases"],
                      },
                      100,
                    ],
                  },
                  2,
                ],
              },
            },
          },
        },
      },
    },

    // 7. Flatten the courses array
    { $unwind: "$courses" },

    // 8. Replace root to clean up structure
    { $replaceRoot: { newRoot: "$courses" } },

    // 9. Sort by purchase count (descending)
    { $sort: { purchaseCount: -1 } },

    // 10. (Optional) Exclude courses with no title
    // { $match: { title: { $ne: "Unknown Course" } } },
  ]);

  return result;
}

export async function getTopTutors() {
  try {
    // Step 1: Fetch all courses
    const courses = await Course.find()
      .select("_id tutor title thumbnailURL price purchaseCount")
      .lean();

    const tutorCoursesMap = new Map();

    // Group courses by tutor
    for (let course of courses) {
      const tutorId = course.tutor?.toString();
      if (!tutorId) continue; // Skip if tutor ID is invalid

      if (!tutorCoursesMap.has(tutorId)) {
        tutorCoursesMap.set(tutorId, []);
      }
      tutorCoursesMap.get(tutorId).push(course);
    }

    const tutorStats = [];

    // Step 2: Calculate stats per tutor
    for (let [tutorId, courseList] of tutorCoursesMap.entries()) {
      const courseIds = courseList.map((c) => c._id);

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

      // Fetch tutor info
      const tutorDetails = await Admin.findById(tutorId)
        .select("firstName lastName email")
        .lean();

      if (!tutorDetails) {
        console.warn(`Tutor not found in Admin model: ${tutorId}`);
      }

      // Find best-selling course
      const bestSellingCourse = courseList.sort(
        (a, b) => b.purchaseCount - a.purchaseCount
      )[0];

      tutorStats.push({
        tutorId,
        name: tutorDetails
          ? `${tutorDetails.firstName} ${tutorDetails.lastName}`
          : "Unknown Tutor",
        email: tutorDetails?.email || "Unavailable",
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

    // Step 3: Sort by completion rate and return top 3
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
  return PurchasedCourse.find({ ...dateFilter })
    .populate({
      path: "studentId",
      select: "_id",
    })
    .lean();
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

export async function getTutorSales(dateFilter = {}) {
  const now = new Date();
  const startDate =
    dateFilter.createdAt?.$gte || new Date(now.getFullYear(), 0, 1);
  const endDate =
    dateFilter.createdAt?.$lte || new Date(now.getFullYear() + 1, 0, 1);

  const payments = await Payment.aggregate([
    {
      $match: {
        status: "success",
        ...(dateFilter.createdAt ? { createdAt: dateRange.createdAt } : {}),
      },
    },
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
        },
        tutorRevenue: { $sum: "$amount" },
      },
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } },
  ]);

  const allMonths = [];
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const monthLabel = currentDate.toLocaleString("default", {
      month: "short",
      year: "numeric",
    });

    allMonths.push({
      month: monthLabel,
      tutorRevenue: 0,
    });

    // Move to next month
    currentDate.setMonth(currentDate.getMonth() + 1);
  }

  payments.forEach((payment) => {
    const paymentDate = new Date(payment._id.year, payment._id.month - 1);
    const monthIndex = allMonths.findIndex(
      (m) =>
        m.label ===
        paymentDate.toLocaleString("default", {
          month: "short",
          year: "numeric",
        })
    );

    if (monthIndex !== -1) {
      allMonths[monthIndex].tutorRevenue = +(
        payment.tutorRevenue * 0.9
      ).toFixed(2);
    }
  });

  return allMonths;
}

export async function getCourseProgressPercentage() {
  const total = await PurchasedCourse.countDocuments();
  if (total === 0) {
    return {
      completed: 0,
      notStarted: 0,
      ongoing: 0,
    };
  }

  const completed = await PurchasedCourse.countDocuments({ isCompleted: 1 });
  const notStarted = await PurchasedCourse.countDocuments({
    lectureProgress: { $size: 0 },
  });
  const ongoing = total - completed - notStarted;

  const percent = (num) => Math.round((num / total) * 100);

  return {
    completed: percent(completed),
    notStarted: percent(notStarted),
    ongoing: percent(ongoing),
  };
}
