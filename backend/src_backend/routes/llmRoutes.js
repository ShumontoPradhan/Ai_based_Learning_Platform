import express from "express";
import { generateChatResponse } from "../llm/smartResponse.js";

const router = express.Router();

// POST /api/llm/chat
router.post("/chat", async (req, res, next) => {
  try {
    const { message, history } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: "Message is required"
      });
    }

    const result = await generateChatResponse(message, history || []);

    res.json({
      success: true,
      model: result.model,
      reply: result.reply
    });

  } catch (err) {
    next(err);
  }
});

export default router;