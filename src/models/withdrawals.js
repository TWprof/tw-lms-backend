import mongoose from "mongoose";

const withdrawalSchema = new mongoose.Schema(
  {
    tutor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "1",
      required: true,
    },
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AccountNumber",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "success", "failed", "reversed"],
      default: "pending",
    },
    reference: {
      type: String,
      required: true,
    },
    transferredAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

const Withdrawal = mongoose.model("Withdrawal", withdrawalSchema);
export default Withdrawal;
