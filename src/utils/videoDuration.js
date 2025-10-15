import ffmpeg from "fluent-ffmpeg";
import ffprobeStatic from "ffprobe-static";

// Configure ffmpeg to find ffprobe
ffmpeg.setFfprobePath(ffprobeStatic.path);

const getVideoDuration = (filepath) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filepath, (err, metadata) => {
      if (err) {
        reject(err);
      } else {
        const duration = metadata?.format?.duration
          ? Math.round(metadata.format.duration)
          : null;
        resolve(duration);
      }
    });
  });
};

export default getVideoDuration;
