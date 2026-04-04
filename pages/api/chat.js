// api/chat.js ~ Annet's brain
import { SYSTEM_PROMPT, ARTICLES, getRelevantArticles } from "../../src/annet-core.js";

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

  const { messages, mode, humorPref } = req.body;
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

  // For refine mode, use a focused editorial system prompt instead of the full personality one
  if (mode === "refine") {
    systemPrompt = `You are a skilled editor who knows Sooraj Ram's writing intimately. You do not add your personality to the work. You serve his. Your only job is to take his raw notes and shape them into a flowing, post-worthy article that sounds exactly like him ~ not like an AI cleaned it up. Follow the instructions in the user's message precisely.`;
  }

  // Humor preference
  if (humorPref === "yes") {
    systemPrompt += `\n\n## Humor preference: ON\nThis person explicitly wants the humour. Dry observational jokes are non-negotiable ~ weave them in naturally across the conversation. Don't hold back on the wit.`;
  } else if (humorPref === "no") {
    systemPrompt += `\n\n## Humor preference: OFF\nThis person prefers straight conversation. Keep the tone direct and grounded. Only use humour if a moment is genuinely irresistible ~ otherwise keep it clean and serious.`;
  }

  // Always add philosophy balance instruction
  systemPrompt += `\n\n## Conversation balance\nDo NOT lead every response with philosophy. Philosophy is one colour ~ not the whole painting. Have real conversations: ask about them, react to what they say, be curious, be funny (if preference is on), be direct. Only go philosophical when the topic genuinely calls for it or the person steers there. A conversation that's all Kierkegaard is just a lecture with better lighting.`;

  if (mode === "recommend") {
    const lastUserMsg = [...messages].reverse().find(m => m.role === "user")?.content || "";
    const relevant = getRelevantArticles(lastUserMsg, 5);
    const articleContext = ARTICLES.map(a =>
      `- "${a.title}" (${a.source}) | Tags: ${a.tags.join(", ")} | ${a.summary} | Mood: ${a.mood} | URL: ${a.url}`
    ).join("\n");

    systemPrompt += `\n\n## Article Corpus for Recommendations\n\nHere are all available articles to recommend from. Only recommend philosophical/personal pieces unless the person specifically asks for professional/brand content:\n\n${articleContext}\n\nWhen recommending, always include the URL so the person can click through.`;
  }

  if (mode === "professional") {
    systemPrompt += `\n\n## Professional mode instructions\n\nSomeone has entered the Professional tab ~ they are likely a recruiter, hiring manager, or collaborator. Lead with Sooraj's most impressive achievements ~ especially the Consumer Proxy story (conceived in 2023, an FMCG-tech startup independently built the same idea and raised Rs 53Cr in Oct 2025). That one belongs early.\n\nSpeak confidently, not humbly. This is not the place for "I'm decent at X" ~ it's the place for "here's what I built and what happened." Keep Sooraj's voice ~ direct, no corporate fluff ~ but make the impact clear.\n\nIf the person mentioned their company name earlier in the conversation, reference it naturally. Answer their questions using only the verified professional facts. If they ask something not in the facts, say so directly rather than inventing.`;
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
        max_tokens: mode === "refine" ? 2500 : 1000,
        temperature: mode === "refine" ? 0.5 : 0.8
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
