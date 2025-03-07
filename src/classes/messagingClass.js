import Messages from "../models/messaging.js";
import Chat from "../models/chat.js";
import responses from "../utils/response.js";

export default class MessagingClass {
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
  // To send a message
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

  async getMessages(chatId, query = {}) {
    try {
      const paginate = {
        page: 1,
        limit: 25,
      };

      // Handle pagination parameters
      if (query.page) {
        paginate.page = Number(query.page);
        delete query.page;
      }

      if (query.limit) {
        paginate.limit = Number(query.limit);
        delete query.limit;
      }

      // Ensure the chat exists
      const chat = await Chat.findById(chatId).select("messages");
      if (!chat) {
        return responses.failureResponse("There is no chat with this ID", 404);
      }

      // Query messages in descending order and paginate
      const messages = await Messages.find({ _id: { $in: chat.messages } })
        .sort({ createdAt: -1 })
        .skip((paginate.page - 1) * paginate.limit)
        .limit(paginate.limit)
        .exec();

      // Get total count of messages
      const totalMessages = chat.messages.length;

      return responses.successResponse("Messages retrieved successfully", 200, {
        totalMessages,
        messages,
        page: paginate.page,
        limit: paginate.limit,
      });
    } catch (error) {
      console.error("Error fetching messages:", error);
      return responses.failureResponse("Unable to fetch messages", 500);
    }
  }

  async getTutorChatList(tutorId) {
    try {
      const chats = await Chat.find({ tutor: tutorId })
        .populate({ path: "student", select: "firstName lastName" })
        .populate({
          path: "messages",
          select:
            "senderType senderId receiverType receiverId message createdAt",
          options: { sort: { createdAt: -1 } },
        });

      if (!chats || chats.length === 0) {
        return responses.failureResponse(
          "There are no chats found for this tutor",
          404
        );
      }

      const chatList = chats.map((chat) => ({
        chatId: chat._id,
        student: chat.student,
        message: chat.messages,
      }));

      return responses.successResponse(
        "Chats retrieved successfully",
        200,
        chatList
      );
    } catch (error) {
      console.error("There was an error", error);
      return responses.failureResponse("Unable to fetch chat list", 500);
    }
  }

  async getStudentChatList(studentId) {
    try {
      // find the chats for the student
      const chats = await Chat.find({ student: studentId })
        .populate({
          path: "tutor",
          model: "Admin",
          select: "firstName lastName",
        })
        .populate({
          path: "messages",
          select:
            "senderType senderId receiverType receiverId message createdAt",
          options: { sort: { createdAt: -1 } },
        });

      // Check if no chats are found
      if (!chats || chats.length === 0) {
        return responses.failureResponse(
          "There are no chats found for this student",
          404
        );
      }

      // Process chat list
      const chatList = chats.map((chat) => ({
        chatId: chat._id,
        tutor: chat.tutor,
        messages: chat.messages,
      }));

      return responses.successResponse(
        "Chats retrieved successfully",
        200,
        chatList
      );
    } catch (error) {
      console.error("There was an error", error);
    }
  }
}
