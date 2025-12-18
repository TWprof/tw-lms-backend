// This contains the logic that handles the withdrawal webhook logic
// It kept failing for the payment hence hiding it here.

// // services/webhook.js
// import axios from "axios";
// import responses from "../utils/response.js";
// import Payment from "../models/payment.js";
// import PurchasedCourse from "../models/purchasedCourse.js";
// import Course from "../models/courses.js";
// import Cart from "../models/cart.js";
// import Student from "../models/student.js";
// import Withdrawal from "../models/withdrawals.js";
// import sendEmail from "../utils/mail.js";
// import constants from "../constants/index.js";
// import getTemplate from "../utils/getTemplates.js";

// const webhookServices = {
//   paystackWebhook: async function (payload) {
//     try {
//       // Handle different Paystack events
//       switch (payload.event) {
//         case "charge.success":
//           return await this.handlePaymentSuccess(payload);

//         case "transfer.success":
//         case "transfer.failed":
//         case "transfer.reversed":
//           return await this.handleTransferUpdate(payload);

//         default:
//           console.log("Unhandled webhook event:", payload.event);
//           return responses.successResponse(
//             "Event received but not handled",
//             200
//           );
//       }
//     } catch (error) {
//       console.error("Error in webhook:", error.message);
//       return responses.failureResponse("Error receiving webhook", 500);
//     }
//   },

//   handlePaymentSuccess: async function (payload) {
//     console.log("Payment successful");

//     const transaction = await Payment.findOne({
//       reference: payload.data.reference,
//     });

//     if (!transaction) {
//       console.error("Payment Reference not found");
//       return responses.failureResponse(
//         "This payment reference does not exist",
//         404
//       );
//     }

//     // Verify payment via Paystack API
//     const options = {
//       headers: {
//         "Content-Type": "application/json",
//         Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
//       },
//     };

//     const reference = payload.data.reference;

//     const paystackURL = `${process.env.PAYSTACK_BASE_URL}/transaction/verify/${reference}`;

//     const response = await axios.get(paystackURL, options);

//     if (response.data.data.status !== "success") {
//       return responses.failureResponse("Payment verification failed", 500);
//     }

//     const updateObject = {
//       transactionId: response.data.data.id,
//       channel: response.data.data.channel,
//       paidAt: response.data.data.paid_at,
//       currency: response.data.data.currency,
//       status: response.data.data.status,
//     };

//     await Payment.findByIdAndUpdate(transaction._id, updateObject, {
//       new: true,
//     });

//     // Original code. uncomment when FE arrives
//     const metadata = payload.data.metadata || response.data.data.metadata || {};
//     const { cartIds, studentId } = metadata;
//     if (!cartIds || !studentId) {
//       console.error("Missing metadata in payment verification response");
//       return responses.failureResponse("Invalid payment metadata", 400);
//     }

//     // Fetch student and cart details
//     const student = await Student.findById(studentId);
//     if (!student) {
//       console.error("Student not found");
//       return responses.failureResponse("Student not found", 404);
//     }

//     const studentName = `${student.firstName} ${student.lastName}`;
//     const cartItems = await Cart.find({ _id: { $in: cartIds } }).populate(
//       "courseId"
//     );

//     for (const cartItem of cartItems) {
//       if (!cartItem?.courseId) {
//         console.error("Course not found for cart item:", cartItem._id);
//         continue;
//       }

//       const course = cartItem.courseId;
//       const courseAmount = course.price || 0;
//       const charges = courseAmount * 0.1;
//       const totalAmount = courseAmount - charges;

//       // Save purchased course
//       const purchasedCourse = new PurchasedCourse({
//         studentId,
//         courseId: course._id,
//         paymentId: transaction._id,
//         purchaseDate: new Date(),
//       });

//       await purchasedCourse.save();

//       // Increment purchaseCount
//       await Course.findByIdAndUpdate(
//         course._id,
//         { $inc: { purchaseCount: 1 } },
//         { new: true }
//       );

//       // Notify Tutor about purchase
//       const tutorEmailTemplate = getTemplate("purchasenotification.html", {
//         tutorName: course.tutorName,
//         studentName,
//         courseName: course.title,
//         transactionId: reference,
//         courseAmount: `₦${courseAmount.toLocaleString()}`,
//         charges: `₦${charges.toLocaleString()}`,
//         totalAmount: `₦${totalAmount.toLocaleString()}`,
//       });

//       const emailPayload = {
//         to: course.tutorEmail,
//         subject: "Course Purchase Notification",
//         message: tutorEmailTemplate,
//       };

//       // Send email to Tutor
//       try {
//         await sendEmail(emailPayload, constants.notifyPurchase);
//         console.log(`Email sent to tutor: ${course.tutorEmail}`);
//       } catch (emailError) {
//         console.error("Failed to send email to tutor:", emailError.message);
//       }

//       // Update cart status to 'success'
//       await Cart.findByIdAndUpdate(cartItem._id, { status: "success" });
//     }

//     // Clear cart of items purchased
//     await Cart.deleteMany({ studentId, status: "success" });

//     return responses.successResponse("Transaction verified and noted", 200);
//   },

//   handleTransferUpdate: async function (payload) {
//     // find the withdrawal by reference
//     const withdrawal = await Withdrawal.findOne({
//       reference: payload.data.reference,
//     });

//     if (!withdrawal) {
//       return responses.failureResponse("Withdrawal not found", 404);
//     }

//     // update withdrawal status based on event type
//     let newStatus;
//     switch (payload.event) {
//       case "transfer.success":
//         newStatus = "success";
//         break;
//       case "transfer.failed":
//         newStatus = "failed";
//         break;
//       case "transfer.reversed":
//         newStatus = "reversed";
//         break;
//       default:
//         newStatus = "pending";
//     }

//     withdrawal.status = newStatus;
//     withdrawal.transferredAt = new Date();
//     await withdrawal.save();

//     console.log(
//       `Withdrawal ${withdrawal.reference} updated to status: ${newStatus}`
//     );

//     return responses.successResponse(
//       "Withdrawal status updated",
//       200,
//       withdrawal
//     );
//   },
// };

// export default webhookServices;
