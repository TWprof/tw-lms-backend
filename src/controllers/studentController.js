import StudentClass from "../classes/studentClass.js";

const studentController = {
  // Student signup
  studentSignUp: async (req, res) => {
    const data = await new StudentClass().studentSignup(req.body);
    res.status(data.statusCode).json(data);
  },

  // Verify User Email
  verifySignUp: async (req, res) => {
    const data = await new StudentClass().verifySignUp(
      req.query.verificationToken
    );
    res.status(data.statusCode).json(data);
  },

  // User Login
  studentLogin: async (req, res) => {
    const data = await new StudentClass().studentLogin(req.body);
    res.status(data.statusCode).json(data);
  },

  // Forgot password
  forgotPassword: async (req, res) => {
    const data = await new StudentClass().forgotPassword(req.body);
    res.status(data.statusCode).json(data);
  },

  // Verify reset Pin
  verifyResetPin: async (req, res) => {
    const data = await new StudentClass().verifyResetPin(req.body);
    res.status(data.statusCode).json(data);
  },

  // Reset Password
  resetPassword: async (req, res) => {
    const data = await new StudentClass().resetPassword(req.body);
    res.status(data.statusCode).json(data);
  },

  // Get Student Courses
  getStudentCourses: async (req, res) => {
    const studentId = req.user._id;
    const data = await new StudentClass().getStudentCourses(studentId);
    res.status(data.statusCode).json(data);
  },

  // Get Each Student Course Controller
  getEachCourse: async (req, res) => {
    const { courseId } = req.params;
    const data = await new StudentClass().getEachCourse(courseId);
    res.status(data.statusCode).json(data);
  },

  // Student Overview statistics
  getStudentOverview: async (req, res) => {
    const studentId = req.user._Id;
    const data = await new StudentClass().getStudentOverview(studentId);
    res.status(data.statusCode).json(data);
  },

  // Student recommendations
  getStudentRecommendations: async (req, res) => {
    const studentId = req.user._id;
    const { page, limit, type } = req.query;
    const data = await new StudentClass().getStudentRecommendations(
      studentId,
      parseInt(page) || 1,
      parseInt(limit) || 10,
      type || "random"
    );
    res.status(data.statusCode).json(data);
  },

  // Update student profile controller
  updateStudent: async (req, res) => {
    const studentId = req.user._id;
    const data = await new StudentClass().updateStudent(studentId, req.body);
    res.status(data.statusCode).json(data);
  },

  // Update student password controller
  updatePassword: async (req, res) => {
    const studentId = req.user._id;
    const data = await new StudentClass().updatePassword(studentId, req.body);
    res.status(data.statusCode).json(data);
  },

  // Delete student account
  deleteAccount: async (req, res) => {
    const studentId = req.user._id;
    const data = await new StudentClass().deleteAccount(studentId);
    res.status(data.statusCode).json(data);
  },

  // Privacy settings
  privacySettings: async (req, res) => {
    const studentId = req.user._id;
    const settings = req.body;
    const data = await new StudentClass().privacySettings(studentId, settings);
    res.status(data.statusCode).json(data);
  },
};

export default studentController;
