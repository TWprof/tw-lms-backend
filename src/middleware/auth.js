import jwt from "jsonwebtoken";
import Student from "../models/student.js";
import Admin from "../models/admin.js";

const authenticate = async (req, res, next) => {
  try {
    const token = req.header("Authorization").replace("Bearer ", "");

    if (!token) {
      return res
        .status(401)
        .json({ message: "Access Denied. No token provided." });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    let user = await Student.findOne({ _id: decoded._id });

    if (!user) {
      user = await Admin.findOne({ _id: decoded.id });
    }

    if (!user) {
      return res
        .status(401)
        .json({ message: "User not found or unauthorized." });
    }

    req.user = user;
    req.role = user.role;

    next();
  } catch (error) {
    console.error("Error", error);
    res.status(400).json({ message: "Invalid token." });
  }
};

export default authenticate;
