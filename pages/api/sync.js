// pages/api/sync.js ~ Daily cron: auto-ingests new posts from blog + Medium

import {
  fetchRSSItems,
  fetchUrlText,
  chunkText,
  storeChunks,
  urlAlreadyIngested
} from "../../src/knowledge.js";

const RSS_FEEDS = [
  { url: "https://lifein20s.home.blog/feed", source: "blog" },
  { url: "https://medium.com/feed/@nytt_liv", source: "medium" }
];

export default async function handler(req, res) {
  // Allow GET (cron) or POST (manual trigger from Feed tab)
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const results = { ingested: [], skipped: [], errors: [] };

  for (const feed of RSS_FEEDS) {
    try {
      const items = await fetchRSSItems(feed.url);

      for (const item of items) {
        try {
          // Skip if already ingested
          const already = await urlAlreadyIngested(item.url);
          if (already) {
            results.skipped.push(item.url);
            continue;
          }

          // Fetch full post content
          const text = await fetchUrlText(item.url);
          if (!text || text.length < 100) {
            results.errors.push({ url: item.url, error: "Content too short" });
            continue;
          }

          // Chunk and store
          const chunks = chunkText(text);
          await storeChunks(chunks, feed.source, item.url);
          results.ingested.push({ url: item.url, title: item.title, chunks: chunks.length });

          // Small delay between posts to be kind to the APIs
          await new Promise(r => setTimeout(r, 500));

        } catch (itemErr) {
          results.errors.push({ url: item.url, error: itemErr.message });
        }
      }
    } catch (feedErr) {
      results.errors.push({ feed: feed.url, error: feedErr.message });
    }
  }

  console.log("Sync complete:", JSON.stringify(results));
  return res.status(200).json({
    success: true,
    ingested: results.ingested.length,
    skipped: results.skipped.length,
    errors: results.errors.length,
    detail: results
  });
}
