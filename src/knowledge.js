// src/knowledge.js ~ Annet's dynamic knowledge layer
// Uses Supabase full-text search ~ no embedding API needed

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

// ── Chunk text into overlapping pieces ──────────────────────────────────────
export function chunkText(text, chunkSize = 400, overlap = 50) {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks = [];
  let i = 0;
  while (i < words.length) {
    const chunk = words.slice(i, i + chunkSize).join(" ");
    if (chunk.trim().length > 10) chunks.push(chunk);
    i += chunkSize - overlap;
  }
  return chunks;
}

// ── Store chunks in Supabase (no embeddings ~ plain text) ───────────────────
export async function storeChunks(chunks, source, sourceUrl) {
  for (let i = 0; i < chunks.length; i++) {
    const body = {
      content: chunks[i],
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

// ── Retrieve relevant chunks using full-text search ──────────────────────────
export async function retrieveRelevantChunks(query, limit = 4) {
  try {
    if (!SUPABASE_URL || !SUPABASE_KEY) return [];

    // Extract meaningful keywords (strip common words)
    const stopWords = new Set(["the","a","an","is","are","was","were","be","been","being",
      "have","has","had","do","does","did","will","would","could","should","may","might",
      "shall","can","need","dare","ought","used","to","of","in","for","on","with","at",
      "by","from","up","about","into","through","what","how","why","when","where","who",
      "which","that","this","these","those","i","me","my","we","our","you","your","he",
      "she","it","they","them","their","and","or","but","if","then","so","yet","nor"]);

    const keywords = query
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(w => w.length > 3 && !stopWords.has(w))
      .slice(0, 6); // top 6 keywords

    if (keywords.length === 0) return [];

    // Use Supabase full-text search via ilike for each keyword
    // Build OR conditions: content.ilike.*keyword*
    const filters = keywords.map(k => `content.ilike.*${k}*`).join(",");

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/knowledge_chunks?or=(${encodeURIComponent(filters)})&select=content,source,source_url&limit=${limit * 3}&order=created_at.desc`,
      {
        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`
        }
      }
    );

    if (!res.ok) return [];
    const data = await res.json();
    if (!data || data.length === 0) return [];

    // Score by how many keywords appear in each chunk
    const scored = data.map(row => {
      const text = row.content.toLowerCase();
      const score = keywords.filter(k => text.includes(k)).length;
      return { content: row.content, score };
    });

    // Sort by score, return top chunks
    return scored
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(r => r.content);

  } catch {
    return []; // fail silently ~ never break chat
  }
}

// ── Fetch and clean text from a URL ─────────────────────────────────────────
export async function fetchUrlText(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; Annet-Sync/1.0)" }
  });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  const html = await res.text();
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

// ── Parse RSS feed ────────────────────────────────────────────────────────────
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
