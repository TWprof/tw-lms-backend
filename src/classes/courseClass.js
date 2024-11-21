import Course from "../models/courses.js";
import Admin from "../models/admin.js";
import responses from "../utils/response.js";
import Review from "../models/review.js";
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

      // display the tutor name
      const tutorName = `${tutor.firstName} ${tutor.lastName}`;
      payload.tutorName = tutorName;

      // If no isPublished status is sent, default to false (unpublished)
      if (payload.isPublished === undefined) {
        payload.isPublished = false;
      }

      // Create the new course
      const newCourse = await Course.create(payload);

      // The success message would be based on the isPublished status
      const message = newCourse.isPublished
        ? "The Course has been published successfully."
        : "The Course has been saved as a draft successfully.";

      return responses.successResponse(message, 201, newCourse);
    } catch (error) {
      console.error("Error creating course", error);
      return responses.failureResponse(
        "There was an error creating this course",
        500
      );
    }
  }

  // Endpoint to Publish an unpublished course
  async updateAndPublishCourse(courseId, payload) {
    /**
     * This endpoint aims to allow a tutor edit their draft and still save it as a draft until they are ready to publish it and also edit their draft and publish it instantly.
     */
    try {
      // Find the course by Id
      const course = await Course.findById(courseId);

      if (!course) {
        return responses.failureResponse("This course does not exist", 404);
      }

      if (course.isPublished === true) {
        return responses.failureResponse(
          "This course has been published already",
          400
        );
      }

      // Validate that required payload is not empty
      if (payload.isPublished === true) {
        if (
          !(payload.title || course.title) ||
          !(payload.description || course.description) ||
          !(payload.lectures || course.lectures) ||
          payload.lectures.length === 0
        ) {
          return responses.failureResponse(
            "Your course must have a title, description, and at least one lecture before publishing. Do not leave Blank",
            400
          );
        }
      }

      // Update the course
      const updatedCourse = await Course.findByIdAndUpdate(
        courseId,
        { ...payload },
        {
          new: true,
        }
      );

      const message = payload.isPublished
        ? "The course has been published successfully"
        : "Your draft is saved successfully";

      return responses.successResponse(message, 200, updatedCourse);
    } catch (error) {
      console.error("There was an error", error);
      return responses.failureResponse("Unable to publish this course", 500);
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
        { rating: newRating, reviewText },
        { upsert: true }
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
  async viewOrPurchaseCourse(courseId, studentId, action) {
    try {
      // check if the user has purchased the course
      const isPurchased = await PurchasedCourse.exists({ courseId, studentId });

      if (action === "view") {
        if (!isPurchased) {
          // Increment the view if course not purchased
          const course = await Course.findByIdAndUpdate(
            courseId,
            { $inc: { views: 1 } },
            { new: true }
          );

          if (!course) {
            return responses.failureResponse("This course does not exist", 404);
          }

          return responses.successResponse(
            "Course viewed successfully",
            200,
            course
          );
        } else {
          return responses.successResponse(
            "This has already been purchased",
            200,
            isPurchased
          );
        }
      }

      if (action === "purchase") {
        if (isPurchased) {
          return responses.failureResponse(
            "This course has already been purchased",
            400
          );
        }

        await new PurchasedCourse({
          courseId,
          studentId,
          purchaseDate: new Date(),
        });

        const course = await Course.findByIdAndUpdate(
          courseId,
          { $inc: { views: -1 } },
          { new: true }
        );

        return responses.successResponse(
          "Course prchased sccessfully",
          200,
          course
        );
      }

      return responses.failureResponse("Invalid action", 400);
    } catch (error) {
      console.error("There was an error", error);
    }
  }
}