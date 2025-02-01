import PurchasedCourse from "../models/purchasedCourse.js";
import Course from "../models/courses.js";
import responses from "../utils/response.js";

export default class ProgressClass {
  async updateProgress(payload) {
    try {
      const {
        studentId,
        courseId,
        lectureId,
        videoId,
        timestamp,
        isCompleted,
      } = payload;

      // Validate input
      if (
        !studentId ||
        !courseId ||
        !lectureId ||
        !videoId ||
        timestamp === undefined
      ) {
        return responses.failureResponse(
          "Something is missing from payload",
          400
        );
      }

      // Find the purchased course
      const course = await PurchasedCourse.findOne({
        studentId,
        courseId,
      });

      if (!course) {
        return responses.failureResponse(
          "This Course has not been purchased by this student",
          404
        );
      }

      // Fetch the course details to get video duration
      const courseDetails = await Course.findById(courseId).select("lectures");
      if (!courseDetails) {
        return responses.failureResponse("Course not found", 404);
      }

      // Find the video duration
      const lecture = courseDetails.lectures.find(
        (lecture) => lecture._id.toString() === lectureId.toString()
      );
      if (!lecture) {
        return responses.failureResponse("Lecture not found", 404);
      }

      const video = lecture.videoURLs.find(
        (video) => video._id.toString() === videoId.toString()
      );
      if (!video) {
        return responses.failureResponse("Video not found", 404);
      }

      // Assuming video.duration is stored in seconds
      const totalDuration = video.duration || 0;

      // Update video progress
      const videoProgress = course.progress.find(
        (progress) =>
          progress.lectureId.toString() === lectureId.toString() &&
          progress.videoId.toString() === videoId.toString()
      );

      if (videoProgress) {
        videoProgress.timestamp = timestamp;
        if (timestamp >= totalDuration) {
          videoProgress.completed = true;
        }
        videoProgress.completed = isCompleted || videoProgress.completed;
      } else {
        course.progress.push({
          lectureId,
          videoId,
          timestamp,
          completed: timestamp >= totalDuration,
        });
      }

      // Update lecture progress (percentage completed)
      const lectureProgress = course.lectureProgress.find(
        (progress) => progress.lectureId.toString() === lectureId.toString()
      );

      if (lectureProgress) {
        // Calculate percentage completed
        lectureProgress.percentageCompleted = Math.min(
          100,
          (timestamp / totalDuration) * 100
        );
      } else {
        course.lectureProgress.push({
          lectureId,
          percentageCompleted: Math.min(100, (timestamp / totalDuration) * 100),
        });
      }

      // Mark courses as completed: isCompleted = 1
      const allVideos = courseDetails.lectures.flatMap((lecture) =>
        lecture.videoURLs.map((video) => video._id.toString())
      );
      const completedVideos = course.progress
        .filter((p) => p.completed)
        .map((p) => p.videoId.toString());

      if (allVideos.every((videoId) => completedVideos.includes(videoId))) {
        course.isCompleted = 1;
      }
      await course.save();

      return responses.successResponse(
        "Progress updated successfully",
        200,
        course
      );
    } catch (error) {
      console.error("Error updating progress:", error);
      return responses.failureResponse("Failed to update progress", 500);
    }
  }

  async continueWatching(studentId) {
    try {
      // Fetch all purchased courses for the student that are NOT completed
      const coursesPurchased = await PurchasedCourse.find({
        studentId,
        isCompleted: { $ne: 1 },
      })
        .populate("courseId", "title thumbnailURL")
        .populate({
          path: "progress.lectureId",
          select: "title lectureNumber",
        })
        .populate({
          path: "progress.videoId",
          select: "url filename",
        });

      if (coursesPurchased.length === 0) {
        return responses.failureResponse("No ongoing progress found", 404);
      }

      // Format the response
      const continueWatchingData = coursesPurchased.map((purchasedCourse) => ({
        courseId: purchasedCourse.courseId._id,
        courseTitle: purchasedCourse.courseId.title,
        thumbnailURL: purchasedCourse.courseId.thumbnailURL,
        progress: purchasedCourse.progress
          .filter((progress) => !progress.completed)
          .map((progress) => ({
            lectureId: progress.lectureId._id,
            lectureTitle: progress.lectureId.title,
            videoId: progress.videoId._id,
            videoTitle: progress.videoId.filename,
            timestamp: progress.timestamp,
            completed: progress.completed,
          })),
        lectureProgress: purchasedCourse.lectureProgress.map((progress) => ({
          lectureId: progress.lectureId,
          percentageCompleted: progress.percentageCompleted,
        })),
      }));

      return responses.successResponse(
        "Continue watching data fetched successfully",
        200,
        continueWatchingData
      );
    } catch (error) {
      console.error("Error fetching continue watching data:", error);
      return responses.failureResponse(
        "Failed to fetch continue watching data",
        500
      );
    }
  }
}
