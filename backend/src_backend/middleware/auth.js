import jwt from "jsonwebtoken";
import User from "../models/user.js";

const protect = async (req, res, next) => {

  try {

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "No token provided",
      });
    }

    const token = authHeader.split(" ")[1];

    jwt.verify(
      token,
      process.env.JWT_SECRET_KEY,
      async (err, decoded) => {

        // 🔴 ACCESS TOKEN EXPIRED → tell frontend to refresh
        if (err?.name === "TokenExpiredError") {
          return res.status(401).json({
            success: false,
            message: "Token expired",
          });
        }

        // 🔴 INVALID TOKEN
        if (err) {
          return res.status(401).json({
            success: false,
            message: "Invalid token",
          });
        }

        try {
          const user = await User.findById(decoded.userId).select("-password");

          if (!user) {
            return res.status(401).json({
              success: false,
              message: "User not found",
            });
          }

          req.user = user;
          next();

        } catch (dbError) {
          return res.status(500).json({
            success: false,
            message: "Database error",
          });
        }
      }
    );

  } catch (error) {
    console.log("AUTH ERROR:", error.message);
    return res.status(401).json({
      success: false,
      message: "Authentication failed",
    });
  }
};

export default protect;