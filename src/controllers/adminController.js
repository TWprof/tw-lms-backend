import AdminClass from "../classes/adminClass.js";

const adminController = {
  createAdmin: async (req, res) => {
    const data = await new AdminClass().createAdmin(req.body);
    res.status(data.statusCode).json(data);
  },

  setPassword: async (req, res) => {
    const data = await new AdminClass().setPassword(req.body);
    res.status(data.statusCode).json(data);
  },

  adminLogin: async (req, res) => {
    const data = await new AdminClass().login(req.body);
    res.status(data.statusCode).json(data);
  },
};

export default adminController;
