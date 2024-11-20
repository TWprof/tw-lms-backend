import mongoose from "mongoose";

const cartSChema = new mongoose.Schema({
  studentId: {
    type: mongoose.Types.ObjectId,
    ref: "Student",
    required: true,
  },
  courseId: {
    type: mongoose.Types.ObjectId,
    ref: "Course",
    required: true,
  },
  quantity: {
    type: Number,
    default: 1,
  },
  price: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ["pending", "success"],
    default: "pending",
  },
});

const Cart = mongoose.model("Cart", cartSChema);
export default Cart;
