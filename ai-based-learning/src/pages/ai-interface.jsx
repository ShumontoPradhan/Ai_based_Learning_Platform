import React, { useState, useEffect } from "react";
import "./pages-css/ai-interface.css";
import aiService from "../services/ai_service";
import { useParams } from "react-router-dom";

const AIChatInterface = ({ shrink }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const { documentId } = useParams();

  // Load chat history
  useEffect(() => {
    const fetchChatHistory = async () => {
      try {
        const res = await aiService.getChatHistory(documentId);

        const formattedMessages = res.data.data.map((msg, index) => ({
          id: index,
          sender: msg.role === "assistant" ? "ai" : "user",
          text: msg.content,
        }));

        setMessages(formattedMessages);
      } catch (error) {
        console.error("Failed to load chat history:", error);
      }
    };

    fetchChatHistory();
  }, [documentId]);

  // 🔥 Send message to LLM
  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = {
      id: Date.now(),
      sender: "user",
      text: input,
    };

    // Update UI immediately
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setIsGenerating(true);

    try {
      // ✅ Build proper history (user-bot pairs)
      const history = [];
      for (let i = 0; i < updatedMessages.length; i += 2) {
        const user = updatedMessages[i];
        const bot = updatedMessages[i + 1];

        if (user && user.sender === "user") {
          history.push({
            user: user.text,
            bot: bot && bot.sender === "ai" ? bot.text : "",
          });
        }
      }

      // ✅ Limit history (important for performance)
      const limitedHistory = history.slice(-5);

      // ✅ Call your backend service
      const res = await aiService.llmChat(input, limitedHistory);

      const aiText = res.reply;

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: "ai",
          text: aiText,
        },
      ]);
    } catch (error) {
      console.error("LLM Error:", error);

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
    <div className="chat-container">
      <header className="chat-header">
        <div className="profile">
          <img
            src="https://img.icons8.com/fluency/96/bot.png"
            alt="AI Bot"
            className="bot-avatar"
          />
          <div>
            <h3>Chat with AI Bot</h3>
            <p>Local LLM</p>
          </div>
        </div>
      </header>

      <main className="chat-body">
        {messages.map((msg) => (
          <div key={msg.id} className={`chat-bubble ${msg.sender}`}>
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