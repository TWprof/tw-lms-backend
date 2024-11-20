import cloudinary from "../config/cloudinary.js";
import path from "path";

const cloudinaryService = {
  uploadFileToCloudinary: async (filepath) => {
    try {
      const result = await cloudinary.v2.uploader.upload(filepath, {
        resource_type: "auto",
        use_filename: true,
      });

      return { url: result.secure_url, filename: path.basename(filepath) };
    } catch (error) {
      console.error(error);
      throw new Error("Failed to upload to cloudinary");
    }
  },
};

export default cloudinaryService;
