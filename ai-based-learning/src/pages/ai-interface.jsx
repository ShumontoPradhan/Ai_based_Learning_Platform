import React, { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { Bot, Send, Sparkles, FileText, Loader2 } from "lucide-react";
import aiService from "../services/ai_service";

const AIChatInterface = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const endRef = useRef(null);
  const { documentId } = useParams();

  useEffect(() => {
    if (!documentId) return;

    const fetchChatHistory = async () => {
      try {
        const res = await aiService.getChatHistory(documentId);
        const list = res?.data?.data;
        if (!Array.isArray(list)) return;
        setMessages(
          list.map((msg, index) => ({
            id: index,
            sender: msg.role === "assistant" ? "ai" : "user",
            text: msg.content,
          }))
        );
      } catch {
        /* no history is fine */
      }
    };

    fetchChatHistory();
  }, [documentId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isGenerating]);

  const handleSend = async () => {
    if (!input.trim() || isGenerating) return;

    const userMessage = { id: Date.now(), sender: "user", text: input };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setIsGenerating(true);

    try {
      const history = [];
      for (let i = 0; i < updatedMessages.length; i += 2) {
        const u = updatedMessages[i];
        const b = updatedMessages[i + 1];
        if (u && u.sender === "user") {
          history.push({
            user: u.text,
            bot: b && b.sender === "ai" ? b.text : "",
          });
        }
      }
      const limitedHistory = history.slice(-5);
      const res = await aiService.llmChat(input, limitedHistory);
      const aiText = res.reply;
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, sender: "ai", text: aiText },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 2,
          sender: "ai",
          text: "Could not get a response. Check your connection and try again.",
        },
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-4.5rem)] max-w-4xl flex-col px-4 py-4 sm:px-6">
      <header className="mb-3 flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-3 shadow-sm backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/30">
            <Bot className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 sm:text-base">AI assistant</h1>
            <p className="text-xs text-slate-500">Ask about your course material and ideas</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-indigo-700">
          <Sparkles className="h-3 w-3" />
          LearnLab
        </span>
      </header>

      {!documentId && (
        <div className="mb-3 rounded-2xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-sm text-amber-950/90">
          <p className="font-medium">Open a document to load topic-specific chat history.</p>
          <p className="mt-1 text-amber-900/80">
            Global chat still works: type below to talk to the model. For full features, go to{" "}
            <Link to="/documents" className="font-semibold text-indigo-700 underline">
              Documents
            </Link>{" "}
            and open a file.
          </p>
        </div>
      )}

      {messages.length === 0 && !isGenerating && (
        <div className="mb-2 flex flex-1 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-10 text-center">
          <FileText className="h-10 w-10 text-slate-300" />
          <p className="max-w-sm text-sm text-slate-600">
            Start a conversation. Ask for summaries, analogies, or step-by-step help on what
            you are studying.
          </p>
        </div>
      )}

      <main className="flex-1 space-y-3 overflow-y-auto pr-1 pb-2">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
                msg.sender === "user"
                  ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white"
                  : "border border-slate-100 bg-white text-slate-800"
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        {isGenerating && (
          <div className="flex justify-start">
            <div className="inline-flex items-center gap-1 rounded-2xl border border-slate-100 bg-white px-4 py-3 text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-xs">Thinking…</span>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </main>

      <footer className="mt-auto border-t border-slate-200/80 bg-white/80 py-3 backdrop-blur-sm">
        <div className="flex gap-2">
          <input
            type="text"
            className="input-brand flex-1 py-2.5 text-sm"
            placeholder="Ask a question…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={isGenerating}
            className="btn-brand shrink-0 px-5"
          >
            <Send className="h-4 w-4" />
            Send
          </button>
        </div>
      </footer>
    </div>
  );
};

export default AIChatInterface;
