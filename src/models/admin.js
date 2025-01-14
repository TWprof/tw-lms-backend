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
    middleName: {
      type: String,
      required: false,
    },
    email: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: false,
    },
    country: {
      type: String,
    },
    state: {
      type: String,
    },
    password: {
      type: String,
    },
    address: {
      type: String,
    },
    postalCode: {
      type: Number,
    },
    profilePicture: {
      type: String,
    },
    role: {
      type: String,
      required: true,
      enum: ["0", "1", "2"], // 0 for Admin, 1 for Tutor, 2 for Staff
      default: "2",
    },
    description: {
      type: String,
    },
    registrationToken: {
      type: String,
    },
    tokenExpiration: {
      type: Date,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const Admin = mongoose.model("Admin", adminSchema);
export default Admin;
