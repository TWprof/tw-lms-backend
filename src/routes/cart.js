import { Router } from "express";
import cartController from "../controllers/cartController.js";
import authenticate from "../middleware/auth.js";

const router = Router();

// Add items to cart
router.post("/add", authenticate, cartController.addToCart);

// Remove item from cart
router.post("/remove", authenticate, cartController.removeFromCart);

// Get items from cart
router.get("/:studentId", authenticate, cartController.getCartItems);

// Initialize payment for items in the cart
router.post("/checkout", authenticate, cartController.initializePayment);

export default router;
