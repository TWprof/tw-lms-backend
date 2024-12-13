import express from "express";
import http from "http";
import dotenv from "dotenv";
import morgan from "morgan";
import cors from "cors";
import cookieParser from "cookie-parser";
import bodyParser from "body-parser";
import fileUpload from "express-fileupload";
import path from "path";
import { fileURLToPath } from "url";

import socketConfig from "./config/socket.js";
import seedAdmin from "./utils/seedAdmin.js";
import connectDB from "./config/database.js";
import studentRoutes from "./routes/students.js";
import adminRoutes from "./routes/admin.js";
import courseRoutes from "./routes/course.js";
import cartRoutes from "./routes/cart.js";
import webhookRoutes from "./routes/webhook.js";
import uploadRoutes from "./routes/upload.js";
import tutorRoutes from "./routes/tutor.js";
import messagingRoutes from "./routes/messaging.js";

//Environment variables configuration
const app = express();
dotenv.config();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

//Database
connectDB();
seedAdmin();

const corsOptions = {
  origin: true,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowHeaders: [
    "Content-Type",
    "Authorization",
    "Access-Control-Allow-Credentials",
    "Access-Control-Allow-Origin",
  ],
};

app.use(morgan("combined"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(bodyParser.json());
app.use(fileUpload({ useTempFiles: true, tempFileDir: "/tmp/" }));
app.use("/assets", express.static(path.join(__dirname, "utils/public")));

app.use("/api/v1", studentRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/courses", courseRoutes);
app.use("/api/v1/cart", cartRoutes);
app.use("/api/v1", webhookRoutes);
app.use("/api/v1/upload", uploadRoutes);
app.use("/api/v1/tutor", tutorRoutes);
app.use("/api/v1/", messagingRoutes);

app.get("/", (_req, res) => {
  return res.send(
    "Welcome to Techware Professional Services Learning Platform"
  );
});

const server = http.createServer(app);

const io = socketConfig(server);

server.listen(PORT, () => {
  console.log(`Server is running good at port ${PORT}`);
});
