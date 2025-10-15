import { Upload } from "@aws-sdk/lib-storage";
import s3 from "../config/s3bucket.js";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import getVideoDuration from "../utils/videoDuration.js";
dotenv.config();

const s3Service = {
  uploadFileToS3: async (filepath) => {
    try {
      const fileStream = fs.createReadStream(filepath);
      const fileName = path.basename(filepath);

      const params = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: fileName,
        Body: fileStream,
      };

      // Get video duration before upload
      let duration = null;
      const ext = path.extname(fileName).toLowerCase();
      const videoExtensions = [".mp4", ".mov", ".avi", ".mkv", ".webm"];

      if (videoExtensions.includes(ext)) {
        try {
          duration = await getVideoDuration(filepath);
        } catch (err) {
          console.warn("Could not extract duration:", err.message);
        }
      }

      // Upload to s3
      const parallelUpload = new Upload({
        client: s3,
        params,
      });
      await parallelUpload.done();

      const fileUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;

      return {
        url: fileUrl,
        filename: fileName,
        duration,
      };
    } catch (error) {
      console.error(error);
      throw new Error("Failed to upload to S3");
    }
  },
};

export default s3Service;
