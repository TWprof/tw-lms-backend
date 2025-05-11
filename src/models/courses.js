import mongoose from "mongoose";

const courseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },

    description: {
      type: String,
      required: true,
    },

    thumbnailURL: {
      type: String,
      required: false,
    },

    price: {
      type: Number,
    },

    basicInformation: {
      language: {
        type: String,
        required: true,
      },
      level: {
        type: String,
        required: true,
      },
      category: {
        type: String,
        required: true,
      },
    },

    whatYouWillLearn: {
      type: [String],
      required: true,
    },

    lectures: [
      {
        title: {
          type: String,
          required: true,
        },
        description: {
          type: String,
          required: false,
        },
        videoURLs: [
          {
            url: {
              type: String,
              required: true,
            },
            filename: {
              type: String,
              required: true,
            },
            duration: {
              type: Number, // in seconds
              required: false,
            },
          },
        ],
        lectureNumber: {
          type: Number,
          required: true,
        },
      },
    ],

    tutor: {
      type: mongoose.Types.ObjectId,
      ref: "1", // tutor
      required: true,
    },

    tutorName: {
      type: String,
      required: true,
    },

    tutorEmail: {
      type: String,
      required: true,
    },

    rating: {
      type: Number,
      default: 0,
    },

    reviewCount: {
      type: Number,
      default: 0,
    },

    views: {
      type: Number,
      default: 0,
    },

    purchaseCount: {
      type: Number,
      default: 0,
    },

    isPublished: {
      type: Boolean,
      default: false,
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },

    rejectionReason: {
      type: String,
      default: null,
    },

    reviewedBy: {
      type: mongoose.Types.ObjectId,
      ref: "0",
      default: null,
    },

    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const Course = mongoose.model("Course", courseSchema);
export default Course;
