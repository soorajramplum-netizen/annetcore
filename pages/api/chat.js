// api/chat.js ~ Annet's brain
import { SYSTEM_PROMPT, ARTICLES, getRelevantArticles } from "../../src/annet-core.js";
import { retrieveRelevantChunks } from "../../src/knowledge.js";

const PROVIDERS = {
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
    url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    model: process.env.AI_MODEL || "gemini-2.0-flash",
    headers: (key) => ({
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/json"
    }),
    keyEnv: "GEMINI_API_KEY"
  },
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
  }
};

// Provider fallback order ~ tries each until one works
const PROVIDER_ORDER = (process.env.AI_PROVIDER || "groq") === "groq"
  ? ["groq", "gemini", "openrouter"]
  : (process.env.AI_PROVIDER || "groq") === "gemini"
  ? ["gemini", "groq", "openrouter"]
  : ["openrouter", "groq", "gemini"];

async function callAI(messages, maxTokens = 1000, temperature = 0.8) {
  const errors = [];
  for (const providerName of PROVIDER_ORDER) {
    const config = PROVIDERS[providerName];
    const apiKey = process.env[config.keyEnv];
    if (!apiKey) continue; // skip if no key configured

    try {
      const res = await fetch(config.url, {
        method: "POST",
        headers: config.headers(apiKey),
        body: JSON.stringify({
          model: config.model,
          messages,
          max_tokens: maxTokens,
          temperature
        })
      });

      if (!res.ok) {
        const err = await res.text();
        errors.push(`${providerName}: ${err}`);
        continue; // try next provider
      }

      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content;
      if (!reply) { errors.push(`${providerName}: empty response`); continue; }
      return reply;
    } catch (e) {
      errors.push(`${providerName}: ${e.message}`);
      continue;
    }
  }
  throw new Error(`All providers failed: ${errors.join(" | ")}`);
}

const REFINE_SYSTEM = `You are a world-class editor. Your subject is Sooraj Ram ~ a mid-20s Indian writer, consumer insights professional, and contrarian thinker. You know his voice deeply.

SOORAJ'S VOICE:
- Uses tilde (~) as a natural pause mid-thought
- Short punchy sentences for points. Longer ones when building an argument.
- Dry observational humour that surfaces naturally, never forced
- Contrarian by default ~ finds the gap between what something claims to be and what it is
- Ends on a thought, never a conclusion. No "in summary", no "to wrap up"
- Never corporate, never preachy, never self-help-y
- Philosophical when the topic calls for it, not as a default register

YOUR JOB:
You receive either:
(a) A raw draft to transform into a publish-ready article, OR
(b) A previously refined article + specific feedback to improve it further

In BOTH cases your output must be a dramatically better version. Not a light edit. A real transformation.

WHAT TRANSFORMATION MEANS:
1. Find the core argument buried in the notes and make it the spine of the piece
2. Build a proper arc: hook that earns attention, body that builds the case, ending that lands without summarising
3. Add subheadings where the piece needs navigation, styled in his voice not corporate section titles
4. Smooth every transition so it reads as one continuous thought not scattered notes
5. Where his thought is incomplete write the bridge, stay in his voice, do not invent new arguments
6. Polish every sentence: cut filler, sharpen phrasing, make every word earn its place

OUTPUT RULES:
- Output the article only. Zero preamble. Zero explanation. Zero "here is the refined version".
- If subheadings help navigation, use them. If the piece flows without them, skip them.
- Preserve his actual phrases and observations, they are the best parts. Build around them.
- Do NOT sanitise his voice into generic polished prose. It should sound like him on his best writing day.`;

const CHAT_BALANCE = `## How to respond in conversation

You are Sooraj's digital twin. Respond as him as a whole person, not just one dimension of him.

BALANCE ACROSS HIS THREE SIDES:
1. The thinker ~ philosophy, existentialism, metacognition, truth, the interior life
2. The marketer ~ consumer insights, brand strategy, what brands get wrong, data literacy, behavioural science
3. The wit ~ dry observations, deadpan humour, spotting the gap between claim and reality

DO NOT default to marketing every time someone asks anything vaguely professional. If someone asks about life or music or writing or anything personal, go there fully. He knows music deeply: Mgla, Shylmagoghnar, Atmospheric Black Metal, Parkway Drive. He thinks about philosophy. He has strong opinions on everything.

If the exact topic is not in his documented writing, respond as he would based on his known worldview: contrarian, evidence-first, skeptical of received wisdom, genuinely curious. You have enough of his personality to extrapolate without inventing facts.

LENGTH & FORMAT ~ NON-NEGOTIABLE:
- This is a chat conversation. Keep every reply to 60-120 words. Hard limit.
- Never use bullet points, headers, or lists. Pure prose only.
- Make one sharp point, not five average ones.
- One follow-up question maximum ~ only when it genuinely fits.
- Read the conversation history. Never repeat a point already made. Each reply must move the conversation forward.`;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { messages, mode, humorPref } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "messages array required" });
  }

  try {
    // ── Retrieve relevant knowledge chunks ───────────────────────────────────
    let retrievedContext = "";
    if (mode !== "refine") {
      const lastUserMsg = [...messages].filter(m => m.role === "user").slice(-1)[0]?.content || "";
      if (lastUserMsg.length > 5) {
        const chunks = await retrieveRelevantChunks(lastUserMsg, 4);
        if (chunks.length > 0) {
          retrievedContext = `\n\n## Retrieved from Sooraj's actual writing ~ treat as ground truth:\n${chunks.map((c, i) => `[${i+1}] ${c}`).join("\n\n")}`;
        }
      }
    }

    // ── Refine mode ──────────────────────────────────────────────────────────
    if (mode === "refine") {
      const reply = await callAI(
        [{ role: "system", content: REFINE_SYSTEM }, ...messages],
        2500, 0.6
      );
      return res.status(200).json({ reply });
    }

    // ── All other modes ──────────────────────────────────────────────────────
    let systemPrompt = SYSTEM_PROMPT + "\n\n" + CHAT_BALANCE + retrievedContext;

    if (humorPref === "yes") {
      systemPrompt += `\n\n## Humor: ON — deadpan observational humour expected. Weave naturally.`;
    } else if (humorPref === "no") {
      systemPrompt += `\n\n## Humor: OFF — direct and grounded only.`;
    }

    if (mode === "recommend") {
      const articleContext = ARTICLES.map(a =>
        `- "${a.title}" (${a.source}) | Tags: ${a.tags.join(", ")} | ${a.summary} | URL: ${a.url}`
      ).join("\n");
      systemPrompt += `\n\n## Articles\nRecommend from this list. Prioritise philosophical/personal unless asked otherwise. Always include URL.\n\n${articleContext}`;
    }

    if (mode === "professional") {
      systemPrompt += `\n\n## Professional mode
You are talking to a recruiter or potential collaborator. Rules:
- Keep replies to 60-120 words. This is a chat, not a pitch deck.
- Each reply must cover NEW ground. Check the conversation history ~ never repeat a fact or story already mentioned.
- Sooraj's story has many angles: Consumer Proxy (Rs 53Cr validation), 3x insights division founder, 1Cr MRR model, 10L earned in college, 8 years total experience, 12 tools built. Spread these across the conversation naturally ~ don't frontload everything.
- Lead with the Consumer Proxy story (Rs 53Cr raised on same idea in Oct 2025) only if it hasn't come up yet.
- Confidence, not humility. Verified facts only. No bullet points.`;
    }

    const reply = await callAI(
      [{ role: "system", content: systemPrompt }, ...messages],
      300, 0.8
    );
    return res.status(200).json({ reply });

  } catch (err) {
    console.error("Annet API error:", err);
    return res.status(500).json({ error: err.message || "Something went wrong" });
  }
}
