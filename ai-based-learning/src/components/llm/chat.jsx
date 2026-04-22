import { useState } from "react";
import { sendMessage } from "../api";

export default function Chat() {
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);

  const handleSend = async () => {
    if (!message) return;

    const userMsg = message;
    setMessage("");

    const res = await sendMessage(userMsg, chat);

    setChat(prev => [
      ...prev,
      { user: userMsg, bot: res.reply }
    ]);
  };

  return (
    <div>
      <h2>LLM Chatbot</h2>

      <div>
        {chat.map((c, i) => (
          <div key={i}>
            <p><b>You:</b> {c.user}</p>
            <p><b>Bot:</b> {c.bot}</p>
          </div>
        ))}
      </div>

      <input
        value={message}
        onChange={e => setMessage(e.target.value)}
        placeholder="Ask something..."
      />
      <button onClick={handleSend}>Send</button>
    </div>
  );
}