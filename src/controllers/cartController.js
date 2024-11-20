import CartClass from "../classes/cartClass.js";

const cartController = {
  // Add to cart
  addToCart: async (req, res) => {
    const data = await new CartClass().addToCart(req.body);
    res.status(data.statusCode).json(data);
  },

  // Remove item from cart
  removeFromCart: async (req, res) => {
    const data = await new CartClass().removeFromCart(req.body);
    res.status(data.statusCode).json(data);
  },

  // Get all the cart items in each user
  getCartItems: async (req, res) => {
    const { studentId } = req.params;
    const data = await new CartClass().getCartItems(studentId);
    res.status(data.statusCode).json(data);
  },

  // Checkout and initialize payment
  initializePayment: async (req, res) => {
    const data = await new CartClass().initiatePayment(req.body);
    res.status(data.statusCode).json(data);
  },
};

export default cartController;
