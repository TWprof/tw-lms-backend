import AdminClass from "../classes/adminClass.js";

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
    const filter = req.query.filter || "all";
    const data = await new AdminClass().adminTutorAnalytics(adminId, filter);
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

  fetchCoursesById: async (req, res) => {
    const userId = req.user._id;
    const role = req.user.role;
    const courseId = req.params.courseId;
    const data = await new AdminClass().fetchCoursesById(
      userId,
      role,
      courseId
    );
    res.status(data.statusCode).json(data);
  },

  updateAdminProfile: async (req, res) => {
    const adminId = req.user._id;
    const payload = req.body;
    const data = await new AdminClass().updateAdminProfile(adminId, payload);
    res.status(data.statusCode).json(data);
  },

  changePassword: async (req, res) => {
    const adminId = req.user._id;
    const payload = req.body;
    const data = await new AdminClass().changeAdminPassword(adminId, payload);
    res.status(data.statusCode).json(data);
  },

  deleteAdmin: async (req, res) => {
    const adminId = req.user._id;
    const data = await new AdminClass().deleteAdminAccount(adminId);
    res.status(data.statusCode).json(data);
  },

  approveCourse: async (req, res) => {
    const adminId = req.user._id;
    const courseId = req.params.courseId;
    console.log(courseId);
    const data = await new AdminClass().approveCourse(adminId, courseId);
    res.status(data.statusCode).json(data);
  },

  rejectCourse: async (req, res) => {
    const adminId = req.user._id;
    const courseId = req.params.courseId;
    const { reason } = req.body;
    const data = await new AdminClass().rejectCourse(adminId, courseId, reason);
    res.status(data.statusCode).json(data);
  },
  allStudents: async (req, res) => {
    const adminId = req.user._id;
    const data = await new AdminClass().getAllStudents(adminId);
    res.status(data.statusCode).json(data);
  },

  studentById: async (req, res) => {
    const adminId = req.user._id;
    const studentId = req.params.studentId;
    const data = await new AdminClass().getStudentById(adminId, studentId);
    res.status(data.statusCode).json(data);
  },
};

export default adminController;
