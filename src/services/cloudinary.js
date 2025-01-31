import cloudinary from "../config/cloudinary.js";
import path from "path";
import ffmpeg from "fluent-ffmpeg";

const cloudinaryService = {
  uploadFileToCloudinary: async (filepath) => {
    try {
      const result = await cloudinary.v2.uploader.upload(filepath, {
        resource_type: "auto",
        use_filename: true,
      });

      // Get the video duration using ffmpeg
      const duration = await getVideoDuration(filepath);

      return {
        url: result.secure_url,
        filename: path.basename(filepath),
        duration: Math.round(duration),
      };
    } catch (error) {
      console.error(error);
      throw new Error("Failed to upload to cloudinary");
    }
  },
};

// Helper function to get video duration
function getVideoDuration(filepath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filepath, (err, metadata) => {
      if (err) {
        reject(err);
      } else {
        const duration = metadata.format.duration; // Duration in seconds
        resolve(duration);
      }
    });
  });
}

export default cloudinaryService;
