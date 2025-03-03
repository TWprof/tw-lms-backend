import TutorClass from "../classes/tutorClass.js";

const tutorController = {
  tutorStats: async (req, res) => {
    const tutorId = req.user._id;
    const timePeriod = req.query.timeperiod || "month";

    if (req.role != "1") {
      return res.status(403).json({ message: "Tutors only" });
    }
    const data = await new TutorClass().tutorStats(tutorId, timePeriod);
    res.status(data.statusCode).json(data);
  },

  tutorCourses: async (req, res) => {
    const tutorId = req.user._id;

    if (req.role != "1") {
      return res.status(403).json({ message: "Tutors only" });
    }
    const data = await new TutorClass().tutorCourses(tutorId);
    res.status(data.statusCode).json(data);
  },

  tutorTransactions: async (req, res) => {
    const tutorId = req.user._id;

    if (req.role != "1") {
      return res.status(403).json({ message: "Tutors only" });
    }
    const data = await new TutorClass().tutorTransactions(tutorId);
    res.status(data.statusCode).json(data);
  },

  tutorStudents: async (req, res) => {
    const tutorId = req.user._id;

    if (req.role != "1") {
      return res.status(403).json({ message: "Tutors only" });
    }
    const data = await new TutorClass().tutorStudents(tutorId);
    res.status(data.statusCode).json(data);
  },

  tutorCourseAnalytics: async (req, res) => {
    const tutorId = req.user._id;

    if (req.role != "1") {
      return res.status(403).json({ message: "Tutors only" });
    }
    const data = await new TutorClass().tutorCourseAnalytics(tutorId);
    res.status(data.statusCode).json(data);
  },

  changePassword: async (req, res) => {
    const tutorId = req.user._id;
    const data = await new TutorClass().changePassword(tutorId, req.body);
    res.status(data.statusCode).json(data);
  },

  updateProfile: async (req, res) => {
    const tutorId = req.user._id;
    const data = await new TutorClass().updateProfile(tutorId, req.body);
    res.status(data.statusCode).json(data);
  },

  deleteAccount: async (req, res) => {
    const tutorId = req.user._id;
    const data = await new TutorClass().deleteAccount(tutorId);
    res.status(data.statusCode).json(data);
  },

  addBankDetails: async (req, res) => {
    const tutorId = req.user._id;
    const data = await new TutorClass().addBankDetails(tutorId, req.body);
    res.status(data.statusCode).json(data);
  },

  getAccounts: async (req, res) => {
    const tutorId = req.user._id;
    const data = await new TutorClass().getTutorBankAccounts(tutorId);
    res.status(data.statusCode).json(data);
  },

  deleteBankAccount: async (req, res) => {
    const tutorId = req.user._id;
    const { accontId } = req.params;
    const data = await new TutorClass().deleteBankAccount(accontId, tutorId);
    res.status(data.statusCode).json(data);
  },
};

export default tutorController;
