import uploadService from "../services/upload.js";

const uploadController = {
  uploadFile: async (req, res) => {
    const data = await uploadService.uploadFile(req.files.file);
    res.status(data.statusCode).json(data);
  },
};

export default uploadController;
