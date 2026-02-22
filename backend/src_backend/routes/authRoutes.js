import express from "express";
import { registerUser, loginUser, changePassword, getUsers, getProfile, updateProfile } from "../controllers/userController.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login",loginUser);
router.post("/change-password",changePassword);
router.get("/profile", getProfile);
router.put("/profile", updateProfile);
router.get("/", getUsers);

router.post("/refresh-token", async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({ message: "Refresh token required" });
  }

  try {
    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET
    );

    const newAccessToken = jwt.sign(
      { id: decoded.id },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    res.json({ accessToken: newAccessToken });

  } catch (error) {
    return res.status(403).json({ message: "Invalid refresh token" });
  }
});

export default router;
