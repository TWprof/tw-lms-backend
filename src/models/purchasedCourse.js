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
    progress: [
      {
        lectureId: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
        },
        videoId: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
        },
        timestamp: {
          type: Number, // last watched timestamp in seconds
          default: 0,
        },
        completed: {
          type: Boolean, // whether video is fully watched or not
          default: false,
        },
      },
    ],
    lectureProgress: [
      {
        lectureId: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
        },
        percentageCompleted: {
          type: Number, // Lecture completion in percentage
          default: 0,
        },
      },
    ],
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
