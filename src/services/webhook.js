import axios from "axios";
import responses from "../utils/response.js";
import Payment from "../models/payment.js";
import PurchasedCourse from "../models/purchasedCourse.js";
import Course from "../models/courses.js";
import Cart from "../models/cart.js";
import Student from "../models/student.js";
import sendEmail from "../utils/mail.js";
import constants from "../constants/index.js";
import getTemplate from "../utils/getTemplates.js";

const webhookServices = {
  paystackWebhook: async function (payload) {
    try {
      if (payload.event !== "charge.success") {
        console.log("Webhook event not related to payment success");
        return responses.failureResponse("Unsupported webhook event", 400);
      }

      return await this.handlePaymentSuccess(payload);
    } catch (error) {
      console.error("Error in webhook:", error.message);
      return responses.failureResponse("Error receiving webhook", 500);
    }
  },

  handlePaymentSuccess: async function (payload) {
    try {
      const reference = payload.data.reference;
      const metadata = payload.data.metadata;

      if (!metadata?.cartIds || !metadata?.studentId) {
        return responses.failureResponse("Invalid payment metadata", 400);
      }

      const { cartIds, studentId } = metadata;

      // 1️⃣ Idempotency check
      const existing = await Payment.findOne({ reference });
      if (existing?.status === "success") {
        return responses.successResponse("Already processed", 200);
      }

      // 2️⃣ Update payment using webhook data (NOT verify API)
      const payment = await Payment.findOneAndUpdate(
        { reference },
        {
          transactionId: payload.data.id,
          channel: payload.data.channel,
          paidAt: payload.data.paid_at,
          currency: payload.data.currency,
          status: "success",
        },
        { new: true, upsert: true },
      );

      const student = await Student.findById(studentId);
      if (!student) {
        return responses.failureResponse("Student not found", 404);
      }

      const studentName = `${student.firstName} ${student.lastName}`;

      const cartItems = await Cart.find({
        _id: { $in: cartIds },
        studentId,
      }).populate("courseId");

      for (const cartItem of cartItems) {
        if (!cartItem.courseId) continue;

        const course = cartItem.courseId;
        const courseAmount = course.price || 0;
        const charges = courseAmount * 0.1;
        const totalAmount = courseAmount - charges;

        // Prevent duplicate purchase
        const alreadyPurchased = await PurchasedCourse.findOne({
          studentId,
          courseId: course._id,
        });

        if (!alreadyPurchased) {
          await PurchasedCourse.create({
            studentId,
            courseId: course._id,
            paymentId: payment._id,
            purchaseDate: new Date(),
          });

          await Course.findByIdAndUpdate(course._id, {
            $inc: { purchaseCount: 1 },
          });
        }

        // Notify tutor
        const tutorEmailTemplate = getTemplate("purchasenotification.html", {
          tutorName: course.tutorName,
          studentName,
          courseName: course.title,
          transactionId: reference,
          courseAmount: `₦${courseAmount.toLocaleString()}`,
          charges: `₦${charges.toLocaleString()}`,
          totalAmount: `₦${totalAmount.toLocaleString()}`,
        });

        await sendEmail(
          {
            to: course.tutorEmail,
            subject: "Course Purchase Notification",
            message: tutorEmailTemplate,
          },
          constants.notifyPurchase,
        );
      }

      // 3️⃣ Clear cart (no status gymnastics)
      await Cart.deleteMany({
        _id: { $in: cartIds },
        studentId,
      });

      return responses.successResponse("Payment processed successfully", 200);
    } catch (error) {
      console.error("Webhook processing error:", error);
      return responses.failureResponse("Error processing webhook", 500);
    }
  },
};

export default webhookServices;
