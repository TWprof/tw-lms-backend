import { Server } from "socket.io";
import Chat from "../models/chat.js";
import Messages from "../models/messaging.js";

const socketConfig = (server) => {
  const io = new Server(server, {
    cors: {
      origin: true,
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log(`Connection successfully established: ${socket.id}`);

    // Join a chat room
    socket.join("joinChat", async ({ chatId }) => {
      if (chatId) {
        socket.join(chatId);
        console.log(`User joined chat: ${chatId}`);
      }
    });

    // Send messages
    socket.on("sendMessage", async (data) => {
      const {
        chatId,
        senderType,
        senderId,
        receiverType,
        receiverId,
        messageContent,
      } = data;

      try {
        // Save the message to the database
        const message = new Messages({
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
          socket.emit("error", { message: "Chat not found" });
          return;
        }

        chat.messages.push(message._id);
        if (senderType === "Student") {
          chat.unreadCount.tutor += 1;
        } else {
          chat.unreadCount.student += 1;
        }
        chat.lastUpdated = Date.now();
        await chat.save();

        // Emit the message to all users in the chat room
        io.to(chatId).emit("receiveMessage", {
          chatId,
          message: message,
        });

        console.log(`Message sent in chat ${chatId}`);
      } catch (error) {
        console.error("Error sending message:", error);
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    // Handle disconnect
    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });

  return io;
};

export default socketConfig;
