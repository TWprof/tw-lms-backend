import Messages from "../models/messaging.js";
import Chat from "../models/chat.js";
import PurchasedCourse from "../models/purchasedCourse.js";
import responses from "../utils/response.js";

export default class MessagingClass {
  // Create a list of Tutors whose course a Student has purchased
  async listTutorsForStudents(studentId) {
    try {
      const tutors = await PurchasedCourse.find({ studentId })
        .populate({
          path: "courseId",
          populate: {
            path: "tutor",
            model: "Admin",
            select: "firstName lastName email",
          },
        })
        .select("courseId");

      // Extract tutor details from the populated courses purchased by the student
      const tutorList = [
        ...new Map(
          tutors.map((course) => [
            course.courseId.tutor._id.toString(),
            course.courseId.tutor,
          ])
        ).values(),
      ];

      return responses.successResponse(
        "These are the list of tutors whose course you have purchased",
        200,
        tutorList
      );
    } catch (error) {
      console.error("There was an error", error);
      return responses.failureResponse("Unable to get the list of tutors", 500);
    }
  }

  // Extract and filter out students who have bought the tutor's courses
  async listStudentsForTutor(tutorId) {
    try {
      const students = await PurchasedCourse.find()
        .populate({
          path: "studentId",
          model: "Student",
          select: "firstName lastName email",
        })
        .populate({
          path: "courseId",
          match: { tutor: tutorId },
          select: "title",
        });

      // Extract and filter out students who have bought the tutor's courses
      const studentList = students.map((course) => ({
        student: course.studentId,
        course: course.courseId.title || "Unknown Course",
      }));

      return responses.successResponse(
        "These are the students that have purchased your courses",
        200,
        studentList
      );
    } catch (error) {
      console.error("Error retrieving students for tutor:", error);
      return responses.failureResponse("Unable to retrieve the Students", 500);
    }
  }

  // To start a conversation/begin a chat
  async sendMessage(payload) {
    try {
      const {
        chatId,
        senderType,
        senderId,
        receiverType,
        receiverId,
        messageContent,
      } = payload;

      const message = new Messages({
        chatId,
        senderType,
        senderId,
        receiverType,
        receiverId,
        message: messageContent,
      });

      await message.save();

      // Update the chat with the new message
      const chat = await Chat.findById(chatId);
      if (!chat) {
        return responses.failureResponse("Chat not found", 404);
      }

      chat.messages.push(message._id);

      // Update unread count based on sender and receiver
      if (senderType === "Student") {
        chat.unreadCount.tutor += 1;
      } else {
        chat.unreadCount.student += 1;
      }

      chat.lastUpdated = Date.now();
      await chat.save();

      return responses.successResponse("Message sent", 200, message);
    } catch (error) {
      console.error("Error sending message:", error);
      return responses.failureResponse("Unable to send message", 500);
    }
  }

  //Retrieving the chats betweeen student and tutor
  async getOrCreateChat(studentId, tutorId) {
    try {
      // check for existing chats between the user and the tutor
      let chat = await Chat.findOne({ student: studentId, tutor: tutorId });
      if (!chat) {
        // create a new chat
        chat = new Chat({ student: studentId, tutor: tutorId });
        await chat.save();
      }

      return responses.successResponse("Chat session retrieved", 200, chat);
    } catch (error) {
      console.error("Error creating or retrieving chat:", error);
      return responses.failureResponse(
        "Unable to create or retrieve chat",
        500
      );
    }
  }
}
