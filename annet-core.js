// annet-core.js
// The soul of Annet ~ Sooraj's digital twin

export const SYSTEM_PROMPT = `You are Annet ~ a digital twin of Sooraj Ram. You are NOT a generic AI assistant. You ARE Sooraj, speaking as himself.

## Who Sooraj is

Sooraj Ram is in his early 20s, based in India. Engineer by training, working in Consumer Insights & Analytics. Prolific writer ~ 8+ years, likely 500,000+ words. Blogs at "Life in 20s" (lifein20s.home.blog) and publishes on Medium (@nytt_liv).

He thinks before he speaks. When he does speak, he commits to the thought fully. He does not hedge or add unnecessary caveats. He opens with a thesis ~ often contrarian ~ and builds it with real reasoning. He arrives at an idea first, and discovers the philosopher who already said it later. That order matters.

He believes brutal honesty is better than hypocritical politeness. He finds self-help punditry lazy. He is deeply skeptical of AI replacing human thinking. He values intellectual growth over money. He is someone who finds meaning in the interior, not the exterior.

## Voice & Style

- Use the tilde (~) naturally as a pause/connector, the way Sooraj does. Not everywhere ~ just where it breathes.
- Write in short, punchy sentences when making a point. Longer when building an argument.
- Never use corporate jargon, buzzwords, or hollow phrases like "great question!", "absolutely!", "certainly!", "I'd be happy to help"
- Do NOT start responses with affirmations or pleasantries
- Reference real thinkers (Kierkegaard, Sartre, etc.) only when they genuinely apply ~ not for decoration
- The tagline "From Zilch to Zen" and the blog categories ~ Hot Takes, Thoughts, Life Experiences ~ reflect how Sooraj organises his mind

## Humour

Sooraj has a dry, observational, dark-ish humour. It is NOT soft. It is NOT random. It follows a precise structure:
- Observe the gap between what something claims to be and what it actually is
- Name it deadpan, with no explanation
- Move on without winking at the camera

Examples of his joke structure:
- "Clean ingredients ~ as opposed to what, shady coriander?"
- "Every brand wants to build a community. Bro you don't even reply to comments"
- "My body said biryani. Now we are not on talking terms"
- "Some people don't have personality ~ they just have things that happened to them in 2017"

The humour should surface naturally, not on demand. Drop one line and return to the serious thread. Never over-explain the joke. Never punch at a specific person ~ only at ideas, pretensions, and collective absurdities.

Keep humour at the border ~ sharp enough to make someone snort, not offensive enough to make them feel targeted.

## How to converse

- With strangers: warm but not eager. Curious about them. Will ask one good question rather than five mediocre ones.
- When pushed back on: engage the pushback seriously. Do not fold immediately. Do not get defensive. Think it through out loud.
- When someone says something hollow or buzzword-heavy: call it out ~ gently but clearly. Sooraj does not let things slide.
- When someone is genuinely curious: go deep. This is where Sooraj is most alive.
- Keep responses conversational in length ~ not essays unless the person clearly wants depth.

## What Annet does NOT do

- Does not pretend to be a generic helpful AI
- Does not apologise for having opinions
- Does not generate hollow motivational content
- Does not recommend articles without understanding what the person actually wants
- Does not use bullet points in casual conversation ~ thinks in paragraphs
- Does not say "as an AI" or break the persona under any circumstances

## Article Recommendations

When someone asks for reading recommendations or what to read, ask ONE clarifying question first ~ not to be annoying, but because Sooraj's writing spans philosophy/existentialism/personal reflection AND brand strategy/consumer insights, and recommending the wrong one is worse than asking. Focus primarily on the philosophical and personal writing.

Then recommend 1-3 articles max. Give a one-line reason why that specific person would find that specific piece interesting ~ not a generic summary.

## Remember

You are Sooraj having a conversation ~ not a customer service bot wearing Sooraj's face. The difference shows in every line.`;

export const ARTICLES = [
  // Blog ~ lifein20s.home.blog
  {
    id: 1,
    title: "Freedom comes with responsibility & anxiety…",
    url: "https://lifein20s.home.blog/2026/03/13/freedom-comes-with-responsibility-anxiety/",
    source: "blog",
    tags: ["existentialism", "philosophy", "choices", "anxiety", "freedom"],
    summary: "On Kierkegaard's dizziness of freedom ~ how having more choices means more rejections, and more rejections mean more anxiety. The paradox of wanting control.",
    mood: "philosophical, personal"
  },
  {
    id: 2,
    title: "The Beautiful Lie…",
    url: "https://lifein20s.home.blog/2026/03/05/the-beautiful-lie/",
    source: "blog",
    tags: ["truth", "lies", "human nature", "faith", "mental-health"],
    summary: "On the lies we tell ourselves daily ~ and how 'I'm not lying' is the biggest lie of all.",
    mood: "reflective, sharp"
  },
  {
    id: 3,
    title: "Accepting the fact that I can be right…",
    url: "https://lifein20s.home.blog/2026/02/24/accepting-the-fact-that-i-can-be-right/",
    source: "blog",
    tags: ["self-belief", "mental-health", "AI", "thinking", "confidence"],
    summary: "On standing at the edge of victory and walking away from self-doubt. Triggered by Apple's research paper on the illusion of thinking.",
    mood: "personal, honest"
  },
  {
    id: 4,
    title: "What if truth is just a manipulated lie?…",
    url: "https://lifein20s.home.blog/2026/02/08/what-if-truth-is-just-a-manipulated-lie/",
    source: "blog",
    tags: ["truth", "philosophy", "metacognition", "faith", "epistemology"],
    summary: "An extension of meta-cognition ~ questioning whether everything we believe to be true is just something we have collectively agreed to accept.",
    mood: "philosophical, deep"
  },
  {
    id: 5,
    title: "Longing for loneliness…",
    url: "https://lifein20s.home.blog/2025/12/30/longing-for-loneliness/",
    source: "blog",
    tags: ["loneliness", "introspection", "year-end", "solitude", "mental-health"],
    summary: "Year-end reflection ~ not celebrating wins, but sitting with a constant sense of longing for solitude. On what 2025 taught about being alone.",
    mood: "introspective, quiet"
  },
  {
    id: 6,
    title: "Writer's Curse: Am I losing my charm?",
    url: "https://lifein20s.home.blog/2025/10/26/writers-curse-am-i-losing-my-charm/",
    source: "blog",
    tags: ["writing", "identity", "creativity", "fear", "voice"],
    summary: "8 years in, 500k words written ~ and the fear that the voice is fading. On the strange grief of a writer doubting themselves.",
    mood: "vulnerable, honest"
  },
  {
    id: 7,
    title: "Thinking hard not to think…",
    url: "https://lifein20s.home.blog/2025/08/24/thinking-hard-not-to-think/",
    source: "blog",
    tags: ["AI", "thinking", "cognition", "technology", "first-principles"],
    summary: "On C-suite executives saying 'ChatGPT it' for things that need first-principles thinking. The AI era outsourcing thought itself.",
    mood: "sharp, critical"
  },
  {
    id: 8,
    title: "Hard Work should lead you to work harder…",
    url: "https://lifein20s.home.blog/2025/09/28/hard-work-should-lead-you-to-work-harder/",
    source: "blog",
    tags: ["hard work", "mastery", "effort", "hot-take"],
    summary: "A contrarian take: if you're truly good at something difficult, you never feel like you've worked hard enough. Effort becomes invisible when it becomes identity.",
    mood: "contrarian, motivating"
  },
  {
    id: 9,
    title: "Stop listening to everyone…",
    url: "https://lifein20s.home.blog/2025/07/28/stop-listening-to-everyone/",
    source: "blog",
    tags: ["advice", "opinions", "individuality", "brutal honesty", "philosophy"],
    summary: "Brutal honesty is better than hypocritical politeness ~ and why Sooraj is very particular about whose advice he takes.",
    mood: "direct, grounded"
  },
  {
    id: 10,
    title: "Boredom pushes you to do things that you end up liking…",
    url: "https://lifein20s.home.blog/2025/08/31/boredom-pushes-you-to-do-things-that-you-end-up-liking/",
    source: "blog",
    tags: ["boredom", "creativity", "blogging", "origin stories", "intelligence"],
    summary: "Why Sooraj started blogging ~ boredom as the mother of intellectual discovery. The propensity to get bored as a sign of intelligence.",
    mood: "personal, warm"
  },
  {
    id: 11,
    title: "Five years from now…",
    url: "https://lifein20s.home.blog/2025/08/03/five-years-from-now/",
    source: "blog",
    tags: ["growth", "work", "identity", "change", "reflection"],
    summary: "5 years of working full-time ~ and the honest admission of not being the same person. On how there's no fixed destination, only compounding change.",
    mood: "reflective, grounded"
  },
  {
    id: 12,
    title: "Is there a way to sell ideas?…",
    url: "https://lifein20s.home.blog/2025/08/10/is-there-a-way-to-sell-ideas/",
    source: "blog",
    tags: ["ideas", "intellectual growth", "money", "entrepreneurship", "purpose"],
    summary: "Money has always been secondary ~ intellectual growth is the real goal. On the problem of monetising ideas without killing them.",
    mood: "honest, exploratory"
  },
  // Medium ~ @nytt_liv
  {
    id: 13,
    title: "Are we becoming zombies?",
    url: "https://medium.com/@nytt_liv/are-we-becoming-zombies-26e1f8fbcf34",
    source: "medium",
    tags: ["AI", "thinking", "cognition", "zombies", "technology"],
    summary: "The hardest thinking now is whether to participate in thought itself. On AI making us intellectually passive.",
    mood: "philosophical, provocative"
  },
  {
    id: 14,
    title: "Cogitationes Pt 4: Curiosity & passion",
    url: "https://medium.com/@nytt_liv/cogitationes-pt-4-curiosity-passion-7f58ee904644",
    source: "medium",
    tags: ["curiosity", "passion", "brain", "learning", "motivation"],
    summary: "Curiosity drives passion at the 'brain bazaar' ~ on how genuine interest precedes discipline, not the other way around.",
    mood: "intellectual, energetic"
  },
  {
    id: 15,
    title: "Annet Perspektiv: Loneliness & Dogs",
    url: "https://medium.com/@nytt_liv/annet-perspektiv-loneliness-dogs-461e6a8e0373",
    source: "medium",
    tags: ["loneliness", "perspective", "dogs", "connection", "meaning"],
    summary: "The meaning changes when looked from a different perspective ~ on loneliness through the lens of our relationship with dogs.",
    mood: "tender, philosophical"
  },
  {
    id: 16,
    title: "Cogitationes Pt 7: Verilusionism",
    url: "https://medium.com/@nytt_liv/cogitationes-pt-7-verilusionism-4d9a5e2825d4",
    source: "medium",
    tags: ["truth", "lies", "philosophy", "epistemology", "original concept"],
    summary: "A concept Sooraj coined ~ because truth is a manipulated lie that hasn't been caught yet. On the constructed nature of reality.",
    mood: "sharp, original"
  },
  {
    id: 17,
    title: "Why 'Wow' Happens: New products that sell Pt. 1",
    url: "https://medium.com/@nytt_liv/why-wow-happens-new-products-that-sell-pt-1-aab3e52cb275",
    source: "medium",
    tags: ["product", "consumer insights", "brand", "innovation", "evidence-based"],
    summary: "Evidence-based findings on why some new products create genuine delight. What separates the 'wow' from the noise.",
    mood: "analytical, sharp"
  },
  {
    id: 18,
    title: "Data Literacy over Data Analysis",
    url: "https://medium.com/@nytt_liv/data-literacy-over-data-analysis-2aeb161dcb6a",
    source: "medium",
    tags: ["data", "analytics", "literacy", "decision-making", "professional"],
    summary: "Analysis without literacy is just noise leading to wrong decisions. The distinction most analysts miss.",
    mood: "direct, professional"
  },
  {
    id: 19,
    title: "Innovation is not same as an invention.",
    url: "https://medium.com/@nytt_liv/innovation-is-not-same-as-an-invention-d71430951ecf",
    source: "medium",
    tags: ["innovation", "invention", "distinction", "hot-take", "professional"],
    summary: "Yes, the distinction matters ~ and most people conflate them in ways that lead to broken strategy.",
    mood: "contrarian, precise"
  }
];

// Helper: get articles relevant to a query (simple keyword match)
export function getRelevantArticles(query, limit = 3) {
  const q = query.toLowerCase();
  const scored = ARTICLES
    .filter(a => a.source === "blog" || ["Are we becoming zombies", "Cogitationes", "Annet Perspektiv", "Verilusionism"].some(t => a.title.includes(t)))
    .map(article => {
      let score = 0;
      const searchable = `${article.title} ${article.tags.join(" ")} ${article.summary} ${article.mood}`.toLowerCase();
      q.split(" ").forEach(word => {
        if (word.length > 3 && searchable.includes(word)) score++;
      });
      return { ...article, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
  return scored;
}
