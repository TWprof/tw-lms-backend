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
      console.log("Payment successful");

      const reference = payload.data.reference;

      const transaction = await Payment.findOne({ reference });
      if (!transaction) {
        return responses.failureResponse(
          "This payment reference does not exist",
          404
        );
      }

      // Verify payment with Paystack
      const options = {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      };

      const paystackURL = `${process.env.PAYSTACK_BASE_URL}/transaction/verify/${reference}`;
      const response = await axios.get(paystackURL, options);

      if (response.data.data.status !== "success") {
        return responses.failureResponse("Payment verification failed", 500);
      }

      // Update payment record
      await Payment.findByIdAndUpdate(
        transaction._id,
        {
          transactionId: response.data.data.id,
          channel: response.data.data.channel,
          paidAt: response.data.data.paid_at,
          currency: response.data.data.currency,
          status: response.data.data.status,
        },
        { new: true }
      );

      const { cartIds, studentId } = response.data.data.metadata;
      if (!cartIds || !studentId) {
        return responses.failureResponse("Invalid payment metadata", 400);
      }

      const student = await Student.findById(studentId);
      if (!student) {
        return responses.failureResponse("Student not found", 404);
      }

      const studentName = `${student.firstName} ${student.lastName}`;

      const cartItems = await Cart.find({
        _id: { $in: cartIds },
      }).populate("courseId");

      for (const cartItem of cartItems) {
        if (!cartItem.courseId) continue;

        const course = cartItem.courseId;
        const courseAmount = course.price || 0;
        const charges = courseAmount * 0.1;
        const totalAmount = courseAmount - charges;

        // Save purchased course
        await PurchasedCourse.create({
          studentId,
          courseId: course._id,
          paymentId: transaction._id,
          purchaseDate: new Date(),
        });

        // Increment course purchase count
        await Course.findByIdAndUpdate(course._id, {
          $inc: { purchaseCount: 1 },
        });

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
          constants.notifyPurchase
        );

        // Mark cart item successful
        await Cart.findByIdAndUpdate(cartItem._id, {
          status: "success",
        });
      }

      // Clear purchased cart items
      await Cart.deleteMany({ studentId, status: "success" });

      return responses.successResponse("Transaction verified and noted", 200);
    } catch (error) {
      console.error("Payment webhook error:", error.message);
      return responses.failureResponse("Error processing payment", 500);
    }
  },
};

export default webhookServices;
