// api/chat.js ~ Annet's brain
import { SYSTEM_PROMPT, ARTICLES, getRelevantArticles } from "../src/annet-core.js";

const PROVIDERS = {
  openrouter: {
    url: "https://openrouter.ai/api/v1/chat/completions",
    model: process.env.AI_MODEL || "meta-llama/llama-3.3-70b-instruct",
    headers: (key) => ({
      "Authorization": `Bearer ${key}`,
      "HTTP-Referer": "https://annet.vercel.app",
      "X-Title": "Annet ~ Sooraj's Digital Twin",
      "Content-Type": "application/json"
    }),
    keyEnv: "OPENROUTER_API_KEY"
  },
  groq: {
    url: "https://api.groq.com/openai/v1/chat/completions",
    model: process.env.AI_MODEL || "llama-3.3-70b-versatile",
    headers: (key) => ({
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/json"
    }),
    keyEnv: "GROQ_API_KEY"
  },
  gemini: {
    url: `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`,
    model: process.env.AI_MODEL || "gemini-2.0-flash",
    headers: (key) => ({
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/json"
    }),
    keyEnv: "GEMINI_API_KEY"
  }
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { messages, mode } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "messages array required" });
  }

  const provider = process.env.AI_PROVIDER || "openrouter";
  const config = PROVIDERS[provider];
  if (!config) return res.status(500).json({ error: `Unknown provider: ${provider}` });

  const apiKey = process.env[config.keyEnv];
  if (!apiKey) return res.status(500).json({ error: `Missing API key for ${provider}` });

  // Build system prompt ~ inject context based on mode
  let systemPrompt = SYSTEM_PROMPT;

  if (mode === "recommend") {
    const lastUserMsg = [...messages].reverse().find(m => m.role === "user")?.content || "";
    const relevant = getRelevantArticles(lastUserMsg, 5);
    const articleContext = ARTICLES.map(a =>
      `- "${a.title}" (${a.source}) | Tags: ${a.tags.join(", ")} | ${a.summary} | Mood: ${a.mood} | URL: ${a.url}`
    ).join("\n");

    systemPrompt += `\n\n## Article Corpus for Recommendations\n\nHere are all available articles to recommend from. Only recommend philosophical/personal pieces unless the person specifically asks for professional/brand content:\n\n${articleContext}\n\nWhen recommending, always include the URL so the person can click through.`;
  }

  if (mode === "professional") {
    systemPrompt += `\n\n## Professional mode\n\nThe person is asking about Sooraj's professional background, skills, or work experience. Answer accurately using only the verified professional facts in your system prompt. Keep it grounded ~ no embellishment, no generic career-speak. If they ask something specific you don't have data on, say so directly. You can still be conversational and have Sooraj's voice ~ just don't invent credentials or projects not listed.`;
  }

  try {
    const response = await fetch(config.url, {
      method: "POST",
      headers: config.headers(apiKey),
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages
        ],
        max_tokens: 1000,
        temperature: 0.8
      })
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: err });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content;
    if (!reply) return res.status(500).json({ error: "No response from model" });

    return res.status(200).json({ reply });
  } catch (err) {
    console.error("Annet API error:", err);
    return res.status(500).json({ error: "Something went wrong" });
  }
}
