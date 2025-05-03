import AdminClass from "../classes/adminClass.js";
import Admin from "../models/admin.js";

const adminController = {
  createAdmin: async (req, res) => {
    const adminId = req.user._id;
    const data = await new AdminClass().createAdmin(req.body, adminId);
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

  //TUTOR controllers
  getTutor: async (req, res) => {
    const data = await new AdminClass().getTutorById(req.params.tutorId);
    res.status(data.statusCode).json(data);
  },

  getAllTutors: async (req, res) => {
    const data = await new AdminClass().getAllTutors(req.query);
    res.status(data.statusCode).json(data);
  },

  adminOverview: async (req, res) => {
    const adminId = req.user._id;
    const data = await new AdminClass().adminOverview(adminId);
    res.status(data.statusCode).json(data);
  },

  adminStudents: async (req, res) => {
    const adminId = req.user._id;
    const filter = req.query.filter || "all";
    const data = await new AdminClass().adminStudents(adminId, filter);
    res.status(data.statusCode).json(data);
  },

  adminTutors: async (req, res) => {
    const adminId = req.user._id;
    const timeframe = req.query.filter || "all";
    const data = await new AdminClass().adminTutorAnalytics(adminId, timeframe);
    res.status(data.statusCode).json(data);
  },
};

export default adminController;
