import axios from "axios";
import responses from "../utils/response.js";
import Payment from "../models/payment.js";
import PurchasedCourse from "../models/purchasedCourse.js";
import Course from "../models/courses.js";
import Cart from "../models/cart.js";

const webhookServices = {
  paystackWebhook: async function (payload) {
    try {
      if (payload.event == "charge.success") {
        console.log("Payment successful");

        const transaction = await Payment.findOne({
          reference: payload.data.reference,
        });

        if (!transaction) {
          console.log("Payment Reference not found");
          return responses.failureResponse(
            "This payment Reference does not exist",
            404
          );
        }

        const options = {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          },
        };

        const reference = payload.data.reference;

        const paystackURL = `${process.env.PAYSTACK_BASE_URL}/transaction/verify/${reference}`;

        const response = await axios.get(paystackURL, options);

        if (response.data.data.status == "success") {
          const updateObject = {
            transactionId: response.data.data.transactionId,
            channel: response.data.data.channel,
            paidAt: response.data.data.paidAt,
            currency: response.data.data.currency,
            status: response.data.data.status,
          };

          await Payment.findByIdAndUpdate(
            { _id: transaction.id },
            updateObject,
            {
              new: true,
            }
          );

          // Add purchased courses to the user's account
          const { cartIds, studentId } = response.data.data.metadata;

          if (!cartIds || !studentId) {
            console.error("Missing metadata in payment verification response");
            return responses.failureResponse("Invalid payment metadata", 400);
          }

          for (const cartId of cartIds) {
            const cartItem = await Cart.findById(cartId).populate("courseId");

            if (cartItem && cartItem.courseId) {
              const purchasedCourse = new PurchasedCourse({
                studentId: studentId,
                courseId: cartItem.courseId._id,
                paymentId: transaction.id,
                purchaseDate: new Date(),
              });

              await purchasedCourse.save();

              // Increment purchaseCount
              await Course.findByIdAndUpdate(
                cartItem.courseId._id,
                { $inc: { purchaseCount: 1 } },
                { new: true }
              );

              // Update cart status to 'purchased'
              await Cart.findByIdAndUpdate(cartId, { status: "success" });
            }
          }

          // Clear cart of item purchased
          await Cart.deleteMany({ studentId, status: "success" });

          return responses.successResponse(
            "Transaction verified and noted",
            200
          );
        } else {
          return responses.failureResponse("Payment verification failed", 500);
        }
      }
    } catch (error) {
      console.error("Unable to generate webhook", error);
      return responses.failureResponse("Error Receiving Webhook", 500);
    }
  },
};

export default webhookServices;
