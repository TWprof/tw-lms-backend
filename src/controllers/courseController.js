import CourseClass from "../classes/courseClass.js";

const courseController = {
  // Create Course controller
  createCourse: async (req, res) => {
    const data = await new CourseClass().createCourse(req.body);
    res.status(data.statusCode).json(data);
  },

  // Update and publish courses controller
  updateAndPublishCourse: async (req, res) => {
    const data = await new CourseClass().updateAndPublishCourse(
      req.params.courseId,
      req.body.payload
    );
    res.status(data.statusCode).json(data);
  },

  // Get all courses Controller
  getAllCourses: async (req, res) => {
    const data = await new CourseClass().getAllCourses(req.query);
    res.status(data.statusCode).json(data);
  },

  // Get A single Course Controller
  getEachCourse: async (req, res) => {
    const data = await new CourseClass().getEachCourse(req.params.courseId);
    res.status(data.statusCode).json(data);
  },

  // Controller to Update Course
  updateCourse: async (req, res) => {
    const data = await new CourseClass().updateCourse(
      req.params.courseId,
      req.body
    );
    res.status(data.statusCode).json(data);
  },

  // Rate Course Controller
  rateCourse: async (req, res) => {
    const { courseId } = req.params;
    const { newRating, reviewtext } = req.body;
    const studentId = req.user.id;
    const data = await new CourseClass().rateCourse({
      courseId,
      newRating,
      reviewtext,
      studentId,
    });
    res.status(data.statusCode).json(data);
  },

  // Search Course controller
  findCourse: async (req, res) => {
    console.log("Query parameters received:", req.query);
    const data = await new CourseClass().findCourse(req.query);
    res.status(data.statusCode).json(data);
  },

  courseViews: async (req, res) => {
    const { courseId } = req.params;
    const data = await new CourseClass().courseViews(courseId);
    res.status(data.statusCode).json(data);
  },

  deleteCourse: async (req, res) => {
    const { courseId } = req.params;
    const data = await new CourseClass().deleteCourse(courseId);
    res.status(data.statusCode).json(data);
  },
};

export default courseController;
