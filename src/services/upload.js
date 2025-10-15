// import cloudinaryService from "../services/cloudinary.js";
import s3Service from "../services/s3bucket.js";
import responses from "../utils/response.js";
import path from "path";
import fs from "fs";

const uploadService = {
  uploadFile: async (file) => {
    // Create temporary folder
    const tmpUploadFilePath = `${path.resolve()}\\tmp`;

    // If tmp does exist, create tmp folder
    if (!fs.existsSync(tmpUploadFilePath)) {
      fs.mkdirSync(tmpUploadFilePath);
    }

    const tmpUploadFileName = `${tmpUploadFilePath}\\${file.name}`;

    // Move uploaded file to tmp server
    await file.mv(tmpUploadFileName);

    // Upload to cloudinary
    // const result = await cloudinaryService.uploadFileToCloudinary(
    //   tmpUploadFileName
    // );

    // upload to s3Bucket
    const result = await s3Service.uploadFileToS3(tmpUploadFileName);

    if (!result) {
      return responses.failureResponse("failed to upload", 400);
    }

    // Delete tmp file from server
    fs.unlinkSync(tmpUploadFileName);

    return responses.successResponse("upload successful", 200, {
      url: result.url,
      filename: file.name,
      duration: result.duration,
    });
  },
};

export default uploadService;
