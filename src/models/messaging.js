import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    senderType: {
      type: String,
      enum: ["Admin", "Student"], // "1" represents the Tutor from the admin role
      required: true,
    },
    senderId: {
      type: mongoose.Types.ObjectId,
      refPath: "senderType",
      required: true,
    },
    receiverType: {
      type: String,
      enum: ["Admin", "Student"],
      required: true,
    },
    receiverId: {
      type: mongoose.Types.ObjectId,
      refPath: "receiverType",
      required: true,
    },
    courseId: {
      type: mongoose.Types.ObjectId,
      ref: "Course",
    },
    message: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Messages = mongoose.model("Message", messageSchema);
export default Messages;
