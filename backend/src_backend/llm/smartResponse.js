import { callOllama } from "./ollamaClient.js";

function isComplex(message) {
  const keywords = ["explain", "how", "why", "algorithm", "machine learning"];
  return message.length > 120 || keywords.some(k => message.toLowerCase().includes(k));
}

// 🧠 Build conversation prompt
function buildPrompt(history, message) {
  let prompt = "You are a helpful AI assistant.\n\n";

  history.forEach(chat => {
    prompt += `User: ${chat.user}\nAssistant: ${chat.bot}\n`;
  });

  prompt += `User: ${message}\nAssistant:`;

  return prompt;
}

export async function generateChatResponse(message, history = []) {
  try {
    const prompt = buildPrompt(history, message);

    let model = "mistral";
    let reply = await callOllama(model, prompt);

    if (isComplex(message) || !reply || reply.length < 80) {
      model = "llama3";
      reply = await callOllama(model, prompt);
    }

    return { model, reply };

  } catch (err) {
    const reply = await callOllama("llama3", message);
    return { model: "llama3", reply };
  }
}