// async function backfillCourses() {
//   try {
//     const courses = await Course.find({});

//     for (const course of courses) {
//       let needsUpdate = false;

//       if (!course.tutorEmail) {
//         const tutor = await Admin.findById(course.tutor);
//         if (tutor) {
//           course.tutorEmail = tutor.email;
//           needsUpdate = true;
//         } else {
//           console.error(`Tutor not found for course: ${course._id}`);
//         }
//       }

//       // Backfill duration for each video
//       for (const lecture of course.lectures) {
//         for (const video of lecture.videoURLs) {
//           if (!video.duration) {
//             // set duration to default value
//             video.duration = 0;
//             needsUpdate = true;
//           }
//         }
//       }

//       if (needsUpdate) {
//         await course.save();
//         console.log(`Updated course: ${course._id}`);
//       }
//     }

//     console.log("Backfill completed successfully.");
//   } catch (error) {
//     console.error("Error during backfill:", error);
//     return responses.failureResponse("Error during backfill", 500);
//   }
// }

// // Run the backfill script
// backfillCourses();
