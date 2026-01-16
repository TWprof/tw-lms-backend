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
        isCompleted, // optional, NOT trusted
      } = payload;

      // Validate missing fields
      const missingFields = [];
      if (!studentId) missingFields.push("studentId");
      if (!courseId) missingFields.push("courseId");
      if (!lectureId) missingFields.push("lectureId");
      if (!videoId) missingFields.push("videoId");
      if (timestamp === undefined) missingFields.push("timestamp");

      if (missingFields.length > 0) {
        return responses.failureResponse(
          `Missing required fields: ${missingFields.join(", ")}`,
          400
        );
      }

      // fetch the purchased course
      const course = await PurchasedCourse.findOne({ studentId, courseId });
      if (!course) {
        return responses.failureResponse(
          "This course has not been purchased by this student",
          404
        );
      }

      // get course stats
      const courseDetails = await Course.findById(courseId).select("lectures");
      if (!courseDetails) {
        return responses.failureResponse("Course not found", 404);
      }

      const lecture = courseDetails.lectures.find(
        (l) => l._id.toString() === lectureId.toString()
      );
      if (!lecture) {
        return responses.failureResponse("Lecture not found", 404);
      }

      const video = lecture.videoURLs.find(
        (v) => v._id.toString() === videoId.toString()
      );
      if (!video) {
        return responses.failureResponse("Video not found", 404);
      }

      const totalDuration = video.duration || 0;
      if (totalDuration === 0) {
        return responses.failureResponse("Invalid video duration", 400);
      }

      // course completion logic by video
      const COMPLETION_THRESHOLD = 0.95;
      const normalizedTimestamp = Math.min(timestamp, totalDuration);

      const isVideoCompleted =
        isCompleted === true ||
        normalizedTimestamp / totalDuration >= COMPLETION_THRESHOLD;

      // update video progress
      let videoProgress = course.progress.find(
        (p) =>
          p.lectureId.toString() === lectureId.toString() &&
          p.videoId.toString() === videoId.toString()
      );

      if (videoProgress) {
        videoProgress.timestamp = normalizedTimestamp;
        videoProgress.completed = videoProgress.completed || isVideoCompleted;
      } else {
        course.progress.push({
          lectureId,
          videoId,
          timestamp: normalizedTimestamp,
          completed: isVideoCompleted,
        });
      }

      // update the lecture progress
      const lectureVideos = lecture.videoURLs.map((v) => v._id.toString());

      const completedLectureVideos = course.progress.filter(
        (p) => p.completed && p.lectureId.toString() === lectureId.toString()
      );

      const lecturePercentage =
        (completedLectureVideos.length / lectureVideos.length) * 100;

      let lectureProgress = course.lectureProgress.find(
        (lp) => lp.lectureId.toString() === lectureId.toString()
      );

      if (lectureProgress) {
        lectureProgress.percentageCompleted = Math.min(100, lecturePercentage);
      } else {
        course.lectureProgress.push({
          lectureId,
          percentageCompleted: Math.min(100, lecturePercentage),
        });
      }

      // course completion
      const allVideoIds = courseDetails.lectures.flatMap((l) =>
        l.videoURLs.map((v) => v._id.toString())
      );

      const completedVideoIds = [
        ...new Set(
          course.progress
            .filter((p) => p.completed)
            .map((p) => p.videoId.toString())
        ),
      ];

      const isCourseCompleted = allVideoIds.every((id) =>
        completedVideoIds.includes(id)
      );

      course.isCompleted = isCourseCompleted ? 1 : 0;

      await course.save();

      return responses.successResponse("Progress updated successfully", 200, {
        isCourseCompleted,
        completedVideos: completedVideoIds.length,
        totalVideos: allVideoIds.length,
        lectureProgress:
          lectureProgress?.percentageCompleted ?? lecturePercentage,
      });
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

      if (!coursesPurchased || coursesPurchased.length === 0) {
        return responses.failureResponse("No ongoing progress found", 404);
      }

      const continueWatchingData = coursesPurchased
        .map((purchasedCourse) => {
          // only unfinished videos
          const incompleteProgress = purchasedCourse.progress.filter(
            (p) => !p.completed
          );

          // skip courses that have no unfinished videos
          if (incompleteProgress.length === 0) return null;

          return {
            courseId: purchasedCourse.courseId._id,
            courseTitle: purchasedCourse.courseId.title,
            thumbnailURL: purchasedCourse.courseId.thumbnailURL,

            progress: incompleteProgress.map((p) => ({
              lectureId: p.lectureId._id,
              lectureTitle: p.lectureId.title,
              lectureNumber: p.lectureId.lectureNumber,
              videoId: p.videoId._id,
              videoTitle: p.videoId.filename,
              timestamp: p.timestamp,
            })),

            // lecture progress (explicit + consistent)
            lectureProgress: purchasedCourse.lectureProgress.map((lp) => ({
              lectureId: lp.lectureId.toString(),
              percentageCompleted: lp.percentageCompleted,
            })),
          };
        })
        .filter(Boolean); // remove null entries

      if (continueWatchingData.length === 0) {
        return responses.failureResponse("No ongoing progress found", 404);
      }

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
