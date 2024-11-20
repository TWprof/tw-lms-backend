import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    email: {
      type: String,
    },
    amount: {
      type: Number,
    },
    date: {
      type: String,
    },
    status: {
      type: String,
      enum: ["pending", "success", "initiated", "failed"],
      default: "pending",
    },
    reference: {
      type: String,
    },
    studentId: {
      type: mongoose.Types.ObjectId,
      ref: "Student",
    },
    cartIds: {
      type: [String],
      required: true,
    },
    currency: {
      type: String,
    },
    channel: {
      type: String,
    },
    paidAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

const Payment = mongoose.model("Payment", paymentSchema);
export default Payment;
