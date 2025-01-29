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
      required: false,
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
  },
  {
    timestamps: true,
  }
);

const Course = mongoose.model("Course", courseSchema);
export default Course;
