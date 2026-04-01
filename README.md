# Annet ~ Another Perspective
### A digital twin of Sooraj Ram

Three modes: **Talk** (chat with Annet), **Refine** (rewrite in Sooraj's voice), **Recommend** (find something worth reading).

---

## Setup

### 1. Clone & install

```bash
git clone https://github.com/YOUR_USERNAME/annet.git
cd annet
npm install
```

### 2. Configure your API key

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in:

```
# Pick your provider
AI_PROVIDER=groq          # or: openrouter / gemini

# Add the key for whichever provider you chose
GROQ_API_KEY=your_key_here
# OPENROUTER_API_KEY=your_key_here
# GEMINI_API_KEY=your_key_here
```

**Provider notes:**
- **Groq** ~ fastest, best for real-time chat (llama-3.3-70b-versatile)
- **OpenRouter** ~ most flexible, access to many models
- **Gemini** ~ Google's models via OpenAI-compatible endpoint

### 3. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Deploy to Vercel

### Via GitHub (recommended)

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project → Import your repo
3. In Vercel project settings → **Environment Variables**, add:
   - `AI_PROVIDER` → `groq` (or your choice)
   - `GROQ_API_KEY` → your key (or whichever provider)
4. Deploy

### Via Vercel CLI

```bash
npm i -g vercel
vercel
# Follow prompts, then add env vars:
vercel env add AI_PROVIDER
vercel env add GROQ_API_KEY
vercel --prod
```

---

## Updating articles

Open `src/annet-core.js` ~ the `ARTICLES` array. Each article has:

```js
{
  title: "Article title",
  url: "https://...",
  source: "blog" | "medium",
  tags: ["tag1", "tag2"],
  summary: "One sentence on what it's actually about",
  mood: "philosophical, personal"  // helps the recommender match intent
}
```

Add new articles here whenever you publish. The recommender automatically uses this list.

---

## Structure

```
annet/
├── api/
│   └── chat.js          ~ API route (supports Groq, OpenRouter, Gemini)
├── src/
│   └── annet-core.js    ~ System prompt + article corpus
├── pages/
│   ├── _app.js
│   └── index.js         ~ The UI
├── .env.example
└── package.json
```

---

## Customisation

**Change the model:** Add `AI_MODEL=model-name` to `.env.local`

**Add more articles:** Edit `ARTICLES` in `src/annet-core.js`

**Tune the personality:** Edit `SYSTEM_PROMPT` in `src/annet-core.js`

**Change temperature:** Edit `temperature: 0.8` in `api/chat.js` — higher = more unpredictable, lower = more consistent
