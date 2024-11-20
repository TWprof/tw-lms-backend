import mongoose from "mongoose";

const adminSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      // unique: true,
    },
    phone: {
      type: String,
      required: false,
    },
    password: {
      type: String,
    },
    role: {
      type: String,
      required: true,
      enum: ["0", "1", "2"], // 0 for Admin, 1 for Tutor, 2 for Staff
      default: "2",
    },
    registrationToken: {
      type: String,
    },
    tokenExpiration: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

const Admin = mongoose.model("Admin", adminSchema);
export default Admin;
