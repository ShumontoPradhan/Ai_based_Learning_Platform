import React, { useState } from "react";
import "./pages-css/ai-interface.css";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

const AIChatInterface = ({ shrink }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = {
      id: Date.now(),
      sender: "user",
      text: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsGenerating(true);

    try {
      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
      });

      const result = await model.generateContent(input);
      const aiText = result.response.text();

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: "ai",
          text: aiText,
        },
      ]);
    } catch (error) {
      console.error("Gemini Error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 2,
          sender: "ai",
          text: "⚠️ Failed to generate response",
        },
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div
      className="chat-container"
      style={{
        paddingTop: "100px",
        paddingRight: "30px",
        height: "95vh",
        marginLeft: "700px",
        borderRadius: "24px",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <header className="chat-header">
        <div className="profile">
          <img
            src="https://img.icons8.com/fluency/96/bot.png"
            alt="AI Bot"
            className="bot-avatar"
          />
          <div>
            <h3>Chat with AI Bot</h3>
            <p>Online</p>
          </div>
        </div>
      </header>

      <main className="chat-body">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`chat-bubble ${msg.sender}`}
          >
            {msg.text}
          </div>
        ))}

        {isGenerating && (
          <div className="chat-bubble ai typing">
            <span></span>
            <span></span>
            <span></span>
          </div>
        )}
      </main>

      <footer className="chat-input">
        <input
          type="text"
          placeholder="Ask me anything..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
        />
        <button onClick={handleSend} disabled={isGenerating}>
          Send
        </button>
      </footer>
    </div>
  );
};

export default AIChatInterface;
