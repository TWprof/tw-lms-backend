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

  deleteTutor: async (req, res) => {
    const adminId = req.user._id;
    const tutorId = req.params.tutorId;
    const data = await new AdminClass().softDeleteTutor(adminId, tutorId);
    res.status(data.statusCode).json(data);
  },

  adminTransactions: async (req, res) => {
    const adminId = req.user._id;
    const data = await new AdminClass().adminTransactions(adminId, req.query);
    res.status(data.statusCode).json(data);
  },

  adminCourses: async (req, res) => {
    const adminId = req.user._id;
    const data = await new AdminClass().fetchCourses(adminId, req.query);
    res.status(data.statusCode).json(data);
  },

  adminTransactionsById: async (req, res) => {
    const adminId = req.user._id;
    const transactionId = req.params.transactionId;
    const data = await new AdminClass().adminTransactionsById(
      adminId,
      transactionId
    );
    res.status(data.statusCode).json(data);
  },

  adminCoursesById: async (req, res) => {
    const adminId = req.user._id;
    const courseId = req.params.courseId;
    const data = await new AdminClass().fetchCoursesById(adminId, courseId);
    res.status(data.statusCode).json(data);
  },

  updateAdminProfile: async (req, res) => {
    const adminId = req.user._id;
    const payload = req.body;
    const data = await new AdminClass().updateAdminProfile(adminId, payload);
    res.status(data.statusCode).json(data);
  },

  deleteAdmin: async (req, res) => {
    const adminId = req.user._id;
    const data = await new AdminClass().deleteAdminAccount(adminId);
    res.status(data.statusCode).json(data);
  },
};

export default adminController;
