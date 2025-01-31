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

  //TUTOR controllers
  getTutor: async (req, res) => {
    const data = await new AdminClass().getTutorById(req.params.tutorId);
    res.status(data.statusCode).json(data);
  },

  getAllTutors: async (req, res) => {
    const data = await new AdminClass().getAllTutors(req.query);
    res.status(data.statusCode).json(data);
  },
};

export default adminController;
