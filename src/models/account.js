import mongoose from "mongoose";

const accountNumberSchema = new mongoose.Schema(
  {
    tutor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "1",
      required: true,
    },
    accountName: {
      type: String,
      required: true,
    },
    accountNumber: {
      type: String,
      unique: true,
      required: true,
    },
    bankName: {
      type: String,
      required: true,
    },
    bankCode: {
      type: String,
      requireed: false,
    },
  },
  { timestamps: true }
);

const AccountNumber = mongoose.model("AccountNumber", accountNumberSchema);
export default AccountNumber;
