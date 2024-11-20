import Cart from "../models/cart.js";
import Course from "../models/courses.js";
import axios from "axios";
import generateReference from "../utils/generateReference.js";
import responses from "../utils/response.js";
import Payment from "../models/payment.js";

export default class CartClass {
  // Add a course to the cart
  async addToCart(payload) {
    try {
      //the Payload takes the courseId and the studentId of the student
      const { studentId, courseId } = payload;

      if (!studentId || !courseId) {
        return responses.failureResponse("Id's and price is required", 400);
      }

      const course = await Course.findById(courseId);
      if (!course) {
        return responses.failureResponse("This Course does not exist", 404);
      }

      const cartItem = await Cart.findOne({ studentId, courseId });

      const price = course.price;

      // The course exists, increment the course quantity using mongodb Inc
      if (cartItem) {
        await Cart.updateOne(
          { studentId, courseId },
          { $inc: { quantity: 1 }, $set: { price: price } }
        );
      } else {
        // the course is not in the cart. Add a new item with quantity 1
        const newCartItem = new Cart({
          studentId,
          courseId,
          quantity: 1,
          price,
        });
        await newCartItem.save();
      }

      // Fetch the cart items for the user
      const updatedCart = await Cart.find({ studentId }).populate({
        path: "courseId",
        select: "title rating thumbnailURL tutorName",
      });

      // calculate the total price
      const totalPrice = updatedCart.reduce(
        (total, item) => total + item.quantity * item.price,
        0
      );
      console.log("Total Price:", totalPrice);

      return responses.successResponse("Here are your cart items", 200, {
        updatedCart,
        totalPrice,
      });
    } catch (error) {
      console.error("Error adding to cart:", error);
      return responses.failureResponse("Unable to add to cart", 500);
    }
  }

  // To remove a course from the cart
  async removeFromCart(payload) {
    //the Payload takes the courseId and the studentId of the student
    try {
      const { studentId, courseIds } = payload;

      if (!studentId || !courseIds || courseIds.length === 0) {
        return responses.failureResponse("Id's are required", 400);
      }

      for (let i = 0; i < courseIds.length; i++) {
        const courseId = courseIds[i];
        const cartItem = await Cart.findOne({ studentId, courseId });

        if (!cartItem) {
          continue;
        }

        if (cartItem.status === "success") {
          await Cart.deleteOne({ studentId, courseId });
          continue;
        }

        // Remove the course from the cart
        if (cartItem.quantity > 1) {
          // Decrement the quantity if it's greater than 1
          await Cart.updateOne(
            { studentId, courseId },
            { $inc: { quantity: -1 } }
          );
        } else {
          await Cart.deleteOne({ studentId, courseId });
        }
      }

      // Fetch the updated cart items for the user
      const updatedCartItems = await Cart.find({ studentId }).populate({
        path: "courseId",
        select: "title rating thumbnailURL tutorName",
      });

      if (updatedCartItems.length === 0) {
        return responses.successResponse("Cart is now empty", 200, {
          updatedCartItems,
          totalPrice: 0,
        });
      }

      // Calculate the total price
      const totalPrice = updatedCartItems.reduce(
        (total, item) => total + item.quantity * item.price,
        0
      );

      return responses.successResponse("Successfully removed from cart", 200, {
        updatedCartItems,
        totalPrice,
      });
    } catch (error) {
      console.error("Error removing from cart:", error);
      return responses.failureResponse(
        "There was an error removing the course",
        500
      );
    }
  }

  // Get items in the cart
  async getCartItems(studentId) {
    try {
      const cartItems = await Cart.find({ studentId }).populate({
        path: "courseId",
        select: "title rating thumbnailURL tutorName",
      });

      if (cartItems.length === 0) {
        return responses.failureResponse("Cart is empty", 404);
      }
      // Calculate the total price
      const totalPrice = cartItems.reduce(
        (total, item) => total + item.quantity * item.price,
        0
      );

      return responses.successResponse(
        "Cart items retrieved successfully",
        200,
        {
          cartItems,
          totalPrice,
        }
      );
    } catch (error) {
      console.error("Error fetching cart items:", error);
      return responses.failureResponse("Unable to fetch cart items", 500);
    }
  }

  // Cart checkout and initiate payment

  async initiatePayment(payload) {
    const { studentId, email, cartIds } = payload;

    try {
      let totalCartPrice = 0;
      const courseIds = [];

      for (const cartItem of cartIds) {
        const cart = await Cart.findById(cartItem);

        if (!cart) {
          console.error(`Cart with ID ${cartItem} not found`);
          continue; // Skip invalid cart items
        }

        totalCartPrice += cart.price;
        courseIds.push(cart.courseId.toString());
      }

      if (totalCartPrice === 0) {
        return responses.failureResponse(
          "No valid carts found for payment",
          400
        );
      }

      const options = {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      };

      const body = {
        email,
        amount: totalCartPrice * 100, // Paystack expects amount in kobo
        reference: generateReference(),
        metadata: { cartIds, studentId, courseIds },
      };

      const paystackURL = `${process.env.PAYSTACK_BASE_URL}/transaction/initialize`;
      const response = await axios.post(paystackURL, body, options);

      if (response.data.status) {
        const newPayment = new Payment({
          email,
          amount: totalCartPrice,
          date: new Date().toISOString(),
          status: "pending",
          reference: response.data.data.reference,
          studentId,
          currency: "NGN",
          cartIds: cartIds.map((id) => id.toString()),
        });

        await newPayment.save();

        // Update cart status
        await Cart.updateMany(
          { _id: { $in: cartIds } },
          {
            $set: {
              status: "initiated",
              paymentReference: response.data.data.reference,
            },
          }
        );

        return responses.successResponse(
          "Payment initialized successfully",
          200,
          {
            authorization_url: response.data.data.authorization_url,
            access_code: response.data.data.access_code,
            reference: response.data.data.reference,
          }
        );
      } else {
        return responses.failureResponse("Failed to initialize payment", 500);
      }
    } catch (error) {
      console.error("Error initiating payment:", error);
      return responses.failureResponse("Error initiating payment", 500);
    }
  }
}
