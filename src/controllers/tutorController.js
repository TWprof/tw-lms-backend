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

  // tutorStudentController: async (req, res) => {
  //   const tutorId = req.user._id;

  //   if (req.role != "1") {
  //     return res.status(403).json({ message: "Tutors only" });
  //   }
  //   const data = await tutorServices.tutorStudents(tutorId);
  //   res.status(data.statusCode).json(data);
  // },
};

export default tutorController;
