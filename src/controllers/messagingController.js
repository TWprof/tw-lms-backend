import MessagingClass from "../classes/messagingClass.js";

const messagingController = {
  listTutors: async (req, res) => {
    const studentId = req.user._id;
    const data = await new MessagingClass().listTutorsForStudents(studentId);
    res.status(data.statusCode).json(data);
  },

  listStudents: async (req, res) => {
    const tutorId = req.user._id;
    const data = await new MessagingClass().listStudentsForTutor(tutorId);
    res.status(data.statusCode).json(data);
  },

  sendMessage: async (req, res) => {
    const { chatId, messageContent, receiverType, receiverId } = req.body;

    if (!chatId || !messageContent || !receiverType || !receiverId) {
      return res.status(400).json({
        message:
          "Chat ID, message content, receiver type, and receiver ID are required.",
      });
    }

    const senderType = req.user.role === "1" ? "Admin" : "Student";
    const senderId = req.user._id;

    const payload = {
      chatId,
      senderType,
      senderId,
      receiverType,
      receiverId,
      messageContent,
    };
    const data = await new MessagingClass().sendMessage(payload);
    res.status(data.statusCode).json(data);
  },

  getOrCreateChat: async (req, res) => {
    const { tutorId } = req.body;
    const studentId = req.user._id;
    const data = await new MessagingClass().getOrCreateChat(studentId, tutorId);
    res.status(data.statusCode).json(data);
  },
};

export default messagingController;
