import mongoose from "mongoose";

const chatSchema = new mongoose.Schema(
  {
    tutor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "1",
      required: true,
    },

    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    messages: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Message",
      },
    ],

    unreadCount: {
      tutor: {
        type: Number,
        default: 0,
      },
      student: {
        type: Number,
        default: 0,
      },
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

chatSchema.index({ tutor: 1, student: 1 }, { unique: true });

const Chat = mongoose.model("Chat", chatSchema);

export default Chat;
