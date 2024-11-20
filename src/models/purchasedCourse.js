import mongoose from "mongoose";

const purchasedCourseSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      required: true,
    },
    isCompleted: {
      type: Number,
      default: 0,
    },
    minutesSpent: {
      type: Number,
      default: 0,
    },
    purchaseDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const PurchasedCourse = mongoose.model(
  "PurchasedCourse",
  purchasedCourseSchema
);
export default PurchasedCourse;
