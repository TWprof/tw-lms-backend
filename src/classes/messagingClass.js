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

  async getMessages(chatId, page = 1, limit = 10) {
    try {
      const skip = (page - 1) * limit;
      const chat = await Chat.findById(chatId)
        .select("messages")
        .populate({
          path: "messages",
          options: { sort: { createdAt: -1 }, skip, limit },
        });
      if (!chat) {
        return responses.failureResponse("There is no chat with this Id", 404);
      }

      const totalMessages = chat.messages.length;
      const paginatedMessages = chat.messages
        .slice(skip, skip + limit)
        .reverse();

      return responses.successResponse("Messages displayed", 200, {
        totalMessages,
        messages: paginatedMessages,
      });
    } catch (error) {
      console.error("Error fetching messages:", error);
      return responses.failureResponse("Unable to fetch messages", 500);
    }
  }
}
