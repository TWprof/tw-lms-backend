import ProgressClass from "../classes/progressClass.js";

const progressController = {
  updateProgress: async (req, res) => {
    const { courseId } = req.params;
    const studentId = req.user._id;
    const { lectureId, videoId, timestamp, isCompleted } = req.body;

    const payload = {
      studentId,
      courseId,
      lectureId,
      videoId,
      timestamp,
      isCompleted,
    };

    const data = await new ProgressClass().updateProgress(payload);
    res.status(data.statusCode).json(data);
  },

  continueWatching: async (req, res) => {
    const studentId = req.user._id;
    const data = await new ProgressClass().continueWatching(studentId);
    res.status(data.statusCode).json(data);
  },
};

export default progressController;
