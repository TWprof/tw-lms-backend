import Course from "../models/courses.js";
import Admin from "../models/admin.js";
import responses from "../utils/response.js";
import Review from "../models/review.js";
import Comment from "../models/comments.js";
import PurchasedCourse from "../models/purchasedCourse.js";

export default class CourseClass {
  // Create course
  async createCourse(payload) {
    try {
      const tutor = await Admin.findOne({ _id: payload.tutor });

      if (!tutor || tutor.role !== "1") {
        return responses.failureResponse(
          "Apologies, only tutors can create a course.",
          403
        );
      }

      // Display the tutor name and email
      const tutorName = `${tutor.firstName} ${tutor.lastName}`;
      payload.tutorName = tutorName;
      payload.tutorEmail = tutor.email;

      if (payload.isPublished === true) {
        return responses.failureResponse(
          "Tutors can no longer publish directly. Your course MUST be reviewed by an admin.",
          403
        );
      }

      // Determine if course is a draft or submitted for review
      const isSubmitting = payload.submitForReview === true;

      payload.status = isSubmitting ? "pending" : "draft";
      payload.isPublished = false; // Always false at this point
      payload.rejectionReason = null;

      // Clean up unnecessary fields
      delete payload.submitForReview;

      // Create the new course
      const newCourse = await Course.create(payload);

      const message = isSubmitting
        ? "Your course has been submitted for review."
        : "Course saved as draft.";

      return responses.successResponse(message, 201, newCourse);
    } catch (error) {
      console.error("Error creating course", error);
      return responses.failureResponse(
        "There was an error creating this course",
        500
      );
    }
  }

  // Endpoint to Edit draft or Rejected course
  async editDraft(courseId, payload) {
    try {
      const course = await Course.findById(courseId);
      if (!course) {
        return responses.failureResponse("This course does not exist", 404);
      }

      // Prevent editing of already published courses
      if (course.status === "approved" && course.isPublished) {
        return responses.failureResponse(
          "You cannot edit a published course",
          400
        );
      }

      const submitForReview = payload.submitForReview === true;
      delete payload.submitForReview; // Don’t store it in DB

      // Prevent direct publishing
      if (payload.isPublished === true) {
        return responses.failureResponse(
          "Tutors cannot publish courses directly. It must be reviewed by an admin.",
          403
        );
      }

      // Decide flow based on submission intent
      if (submitForReview) {
        // Whether it's from draft or rejected, validate before submitting
        const hasMinimumContent =
          payload.title ||
          course.title ||
          ((payload.description || course.description) &&
            ((payload.lectures && payload.lectures.length > 0) ||
              (course.lectures && course.lectures.length > 0)));

        if (!hasMinimumContent) {
          return responses.failureResponse(
            "To submit for review, the course must have a title, description, and at least one lecture.",
            400
          );
        }

        // Set course to pending
        payload.status = "pending";
        payload.rejectionReason = null;
      } else {
        // Save as draft
        payload.status = "draft";
      }

      // Force isPublished to false
      payload.isPublished = false;

      const updatedCourse = await Course.findByIdAndUpdate(courseId, payload, {
        new: true,
      });

      const message = submitForReview
        ? "Course edited and submitted for review."
        : "Draft course updated successfully.";

      return responses.successResponse(message, 200, updatedCourse);
    } catch (error) {
      console.error("Error editing draft course:", error);
      return responses.failureResponse("Unable to update the course", 500);
    }
  }

  // Implementing pagination
  async getAllCourses(query = {}) {
    try {
      const paginate = {
        page: 1,
        limit: 10,
      };

      if (query.page) {
        paginate.page = Number(query.page);
        delete query.page;
      }

      if (query.limit) {
        paginate.limit = Number(query.limit);
        delete query.limit;
      }

      // to ensure that only published courses are returned,
      query.isPublished = true;

      const courses = await Course.find(query)
        .skip((paginate.page - 1) * paginate.limit)
        .limit(paginate.limit)
        .exec();

      const totalCounts = await Course.countDocuments(query);

      return responses.successResponse(
        "Successfully fetched all courses",
        200,
        {
          data: courses,
          page: paginate.page,
          noPerPage: paginate.limit,
          totalCounts,
        }
      );
    } catch (error) {
      console.error("Error in fetching courses:", error);
      return responses.failureResponse("Failed to fetch all courses", 500);
    }
  }

  // Endpoint to get a single course
  async getEachCourse(courseId) {
    try {
      const course = await Course.findById(courseId);
      if (!course) {
        return responses.failureResponse(
          "There is no Course with this ID",
          404
        );
      }

      return responses.successResponse(
        "Course fetched successfully",
        200,
        course
      );
    } catch (error) {
      console.error("Error in fetching course:", error);
      return responses.failureResponse("Failed to fetch course", 500);
    }
  }

  // Endpoint to update the course
  async updateCourse(courseId, payload) {
    try {
      const { whatYouWillLearn } = payload;

      const foundCourse = await Course.findById(courseId);
      if (!foundCourse) {
        return responses.failureResponse("CourseId is invalid", 404);
      }

      const update = {};
      if (whatYouWillLearn) {
        update.whatYouWillLearn = whatYouWillLearn;
      }

      const updatedCourse = await Course.findByIdAndUpdate(
        courseId,
        { $set: update },
        { new: true }
      );

      if (!updatedCourse) {
        return responses.failureResponse("Failed to update course", 500);
      }

      return responses.successResponse(
        "Course updated successfully",
        200,
        updatedCourse
      );
    } catch (error) {
      console.error("An error occurred", error);
      return responses.failureResponse(
        "An error occurred while updating the course",
        500
      );
    }
  }

  // Endpoint to rate courses
  async rateCourse(payload) {
    try {
      const { courseId, studentId, newRating, reviewText } = payload;

      if (newRating < 1 || newRating > 5) {
        return responses.failureResponse("Rating must be between 1 and 5", 400);
      }

      const course = await Course.findById(courseId);
      if (!course) {
        console.log("Could not find course with ID:", courseId);
        return responses.failureResponse("Course not found", 404);
      }
      // create the Review
      await Review.findOneAndUpdate(
        { courseId, studentId },
        { $set: { rating: newRating, reviewText } },
        { upsert: true, new: true }
      );
      // Calculate the new average rating
      const averageRating = await Review.aggregate([
        { $match: { courseId: course._id } },
        { $group: { _id: null, avgRating: { $avg: "$rating" } } },
      ]);

      course.rating = averageRating[0]?.avgRating || 0;

      // to update the review count to get the total number of reviews
      const reviewCount = await Review.countDocuments({ courseId: course._id });
      course.reviewCount = reviewCount;

      await course.save();

      return responses.successResponse(
        "Course rating updated successflly",
        200,
        course
      );
    } catch (error) {
      console.error("There was an error rating this course", error);
      return responses.failureResponse("Unable to rate course", 500);
    }
  }

  // Endpoint to search for a course
  async findCourse(query) {
    try {
      console.log("query", query);
      if (!query.search) {
        return responses.failureResponse("Search query is required", 400);
      }

      const searchKeyword = {
        $or: [
          { title: { $regex: query.search, $options: "i" } },
          { tutorName: { $regex: query.search, $options: "i" } },
        ],
      };

      // Pagination to avoid bulk results
      const page = query.page ? parseInt(query.page, 10) : 1;

      const limit = query.limit ? parseInt(query.limit, 10) : 10;

      const skip = (page - 1) * limit;

      // Only published courses should be returned
      query.isPublished = true;

      // Find the courses based on the search keyword
      const foundCourses = await Course.find(searchKeyword)
        .skip(skip)
        .limit(limit)
        .exec();

      if (foundCourses.length === 0) {
        return responses.failureResponse(
          "Sorry!, No course matches your criteria",
          404
        );
      }

      return responses.successResponse(
        "Here's what you're looking for",
        200,
        foundCourses
      );
    } catch (error) {
      console.error("An error occured", error);
      return responses.failureResponse(
        "An error occured while fetching courses",
        500
      );
    }
  }

  // This endpoint will track the courses that were viewed but not purchased
  async courseViews(courseId) {
    try {
      const course = await Course.findByIdAndUpdate(
        courseId,
        { $inc: { views: 1 } },
        { new: true }
      );

      if (!course) {
        return responses.failureResponse("Course not found", 404);
      }

      return responses.successResponse("View count incremented", 200);
    } catch (error) {
      console.error("There was error", error);
      return responses.failureResponse("There was an error", 500);
    }
  }

  async deleteCourse(courseId) {
    try {
      const findCourse = await Course.deleteOne({ _id: courseId });

      if (findCourse.deletedCount === 0) {
        return responses.failureResponse("This course does not exist", 404);
      }

      return responses.successResponse("Course deleted successfully", 200);
    } catch (error) {
      console.error("There was an error", error);
      responses.failureResponse("Unable to delete this course", 500);
    }
  }

  async fetchReviewsPerCourse(courseId) {
    try {
      const course = await Course.findById(courseId);
      if (!course) {
        return responses.failureResponse("Course not found", 404);
      }

      // Fetch reviews and populate student name
      const reviews = await Review.find({ courseId })
        .populate("studentId", "firstName lastName")
        .select("reviewText rating createdAt updatedAt");

      // If no reviews exist, return a meaningful response
      if (reviews.length === 0) {
        return responses.successResponse(
          `There are no reviews for ${course.title}`,
          200,
          {
            averageRating: 0,
            totalReviews: 0,
            reviews: [],
          }
        );
      }
      // Calculate the average rating
      const totalRatings = reviews.reduce(
        (sum, review) => sum + review.rating,
        0
      );
      const averageRating = parseFloat(
        (totalRatings / reviews.length).toFixed(2)
      );

      return responses.successResponse(`Reviews for ${course.title}`, 200, {
        averageRating,
        totalReviews: reviews.length,
        reviews,
      });
    } catch (error) {
      console.error("There was an error", error);
      return responses.failureResponse(
        "Unable to fetch Course ratings and reviews",
        500
      );
    }
  }

  async leaveComments(payload) {
    try {
      const { courseId, studentId, text } = payload;

      // Check if the student has purchased the course
      const hasPurchased = await PurchasedCourse.findOne({
        courseId,
        studentId,
      });

      if (!hasPurchased) {
        return responses.failureResponse(
          "You must purchase the course to leave a comment",
          403
        );
      }

      const comment = new Comment({
        courseId,
        studentId,
        text,
      });

      await comment.save();

      return responses.successResponse(
        "Comment added successfully",
        201,
        comment
      );
    } catch (error) {
      console.error("There was an error adding your comment", error);
      return responses.failureResponse("Failed to add comment", 500);
    }
  }

  async getComments(courseId) {
    try {
      const comments = await Comment.find({ courseId }).populate({
        path: "studentId",
        select: "firstName lastName",
        match: { _id: { $exists: true } },
      });

      if (!comments || comments.length === 0) {
        return responses.failureResponse(
          "There are no comments on this course",
          404
        );
      }

      return responses.successResponse(
        "Comments fetched successfully",
        200,
        comments
      );
    } catch (error) {
      console.error("There was an error", error);
      return responses.failureResponse("Failed to fetch comments", 500);
    }
  }

  async deleteComment(commentId, studentId) {
    try {
      const comment = await Comment.findById(commentId);
      if (!comment) {
        return responses.failureResponse("Comment not found", 404);
      }

      // Only the student who left a comment can delete a comment
      if (comment.studentId.toString() !== studentId.toString()) {
        return responses.failureResponse(
          "You are unauthorized to delete this comment",
          403
        );
      }

      await Comment.findByIdAndDelete(commentId);
      return responses.successResponse("Comment deleted successfully", 200);
    } catch (error) {
      console.error("There was an error deleting the comment", error);
      return responses.failureResponse("Failed to delete comment", 500);
    }
  }
}
