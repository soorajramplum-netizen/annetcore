// src/knowledge.js ~ Annet's dynamic knowledge layer

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;
const GEMINI_KEY   = process.env.GEMINI_API_KEY;

// ── Embed text using Gemini text-embedding-004 ───────────────────────────────
export async function embedText(text) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${GEMINI_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "models/text-embedding-004",
        content: { parts: [{ text }] }
      })
    }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini embedding error: ${err}`);
  }
  const data = await res.json();
  return data.embedding.values; // array of 768 floats
}

// ── Chunk text into overlapping pieces ──────────────────────────────────────
export function chunkText(text, chunkSize = 400, overlap = 50) {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks = [];
  let i = 0;
  while (i < words.length) {
    const chunk = words.slice(i, i + chunkSize).join(" ");
    if (chunk.trim().length > 10) chunks.push(chunk); // skip tiny chunks
    i += chunkSize - overlap;
  }
  return chunks;
}

// ── Store chunks in Supabase ─────────────────────────────────────────────────
export async function storeChunks(chunks, source, sourceUrl) {
  for (let i = 0; i < chunks.length; i++) {
    const embedding = await embedText(chunks[i]);
    const body = {
      content: chunks[i],
      embedding: JSON.stringify(embedding),
      source,
      source_url: sourceUrl || null,
      chunk_index: i
    };
    const res = await fetch(`${SUPABASE_URL}/rest/v1/knowledge_chunks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Prefer": "return=minimal"
      },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Supabase insert error: ${err}`);
    }
  }
  return chunks.length;
}

// ── Check if a URL has already been ingested ─────────────────────────────────
export async function urlAlreadyIngested(sourceUrl) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/knowledge_chunks?source_url=eq.${encodeURIComponent(sourceUrl)}&limit=1&select=id`,
    {
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`
      }
    }
  );
  if (!res.ok) return false;
  const data = await res.json();
  return data.length > 0;
}

// ── Retrieve relevant chunks for a query ─────────────────────────────────────
export async function retrieveRelevantChunks(query, limit = 4) {
  try {
    const embedding = await embedText(query);

    // Use Supabase RPC for vector similarity search
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/match_knowledge`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`
      },
      body: JSON.stringify({
        query_embedding: embedding,
        match_threshold: 0.65,
        match_count: limit
      })
    });

    if (!res.ok) return []; // fail silently ~ don't break chat
    const data = await res.json();
    return data.map(d => d.content);
  } catch {
    return []; // fail silently
  }
}

// ── Fetch and clean text from a URL ─────────────────────────────────────────
export async function fetchUrlText(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; Annet-Sync/1.0)" }
  });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  const html = await res.text();
  // Strip HTML tags, scripts, styles
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s{3,}/g, "\n\n")
    .trim();
  return text;
}

// ── Parse RSS feed and return array of {title, url, date} ────────────────────
export async function fetchRSSItems(rssUrl) {
  const res = await fetch(rssUrl, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; Annet-Sync/1.0)" }
  });
  if (!res.ok) throw new Error(`RSS fetch failed: ${rssUrl}`);
  const xml = await res.text();

  const items = [];
  const itemMatches = xml.matchAll(/<item[\s\S]*?<\/item>/gi);
  for (const match of itemMatches) {
    const item = match[0];
    const title = (item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) ||
                   item.match(/<title>(.*?)<\/title>/))?.[1] || "";
    const link  = (item.match(/<link>(.*?)<\/link>/) ||
                   item.match(/<guid[^>]*>(.*?)<\/guid>/))?.[1] || "";
    const date  = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || "";
    if (link && link.startsWith("http")) {
      items.push({ title: title.trim(), url: link.trim(), date: date.trim() });
    }
  }
  return items;
}
