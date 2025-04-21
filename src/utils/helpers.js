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

// utils/adminAnalytics.js or inside AdminClass

export async function getTopCourses() {
  return PurchasedCourse.aggregate([
    {
      $group: {
        _id: "$courseId",
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
    { $limit: 3 },
  ]);
}

export async function getTopTutors() {
  const courses = await Course.find().select("tutor _id").lean();

  // Group courses by tutor
  const tutorCoursesMap = new Map();

  for (let course of courses) {
    const tutorId = course.tutor.toString();

    if (!tutorCoursesMap.has(tutorId)) {
      tutorCoursesMap.set(tutorId, []);
    }

    tutorCoursesMap.get(tutorId).push(course._id);
  }

  const tutorStats = [];

  for (let [tutorId, courseIds] of tutorCoursesMap.entries()) {
    const purchases = await PurchasedCourse.find({
      courseId: { $in: courseIds },
    }).lean();
    const total = purchases.length;
    const completed = purchases.filter((p) => p.isCompleted === 1).length;

    const completionRate =
      total > 0 ? ((completed / total) * 100).toFixed(2) : "0.00";

    const tutorDetails = await Admin.findById(tutorId)
      .select("firstName lastName email")
      .lean();

    tutorStats.push({
      tutor: tutorId,
      completionRate,
      name: `${tutorDetails.firstName} ${tutorDetails.lastName}`,
      email: tutorDetails.email,
    });
  }

  // Sort by completionRate descending and return top 3
  return tutorStats
    .sort((a, b) => b.completionRate - a.completionRate)
    .slice(0, 3);
}
