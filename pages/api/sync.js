// pages/api/sync.js ~ Auto-sync from blog + Medium

import {
  fetchRSSItems,
  fetchUrlText,
  chunkText,
  storeChunks,
  urlAlreadyIngested
} from "../../src/knowledge.js";

// WordPress paginated RSS ~ keeps fetching until no new items
async function fetchAllBlogItems() {
  const items = [];
  let page = 1;
  while (true) {
    try {
      const url = `https://lifein20s.home.blog/feed/?paged=${page}`;
      const pageItems = await fetchRSSItems(url);
      if (!pageItems || pageItems.length === 0) break;
      items.push(...pageItems);
      page++;
      if (page > 20) break; // safety cap
      await new Promise(r => setTimeout(r, 300));
    } catch {
      break;
    }
  }
  return items;
}

// Medium RSS only returns 10 ~ we use Freedium via fetchUrlText
async function fetchMediumItems() {
  return fetchRSSItems("https://medium.com/feed/@nytt_liv");
}

async function processItems(items, source, results) {
  for (const item of items) {
    try {
      const already = await urlAlreadyIngested(item.url);
      if (already) { results.skipped.push(item.url); continue; }

      const text = await fetchUrlText(item.url);
      if (!text || text.length < 100) {
        results.errors.push({ url: item.url, error: "Content too short" });
        continue;
      }

      const chunks = chunkText(text);
      await storeChunks(chunks, source, item.url);
      results.ingested.push({ url: item.url, title: item.title, chunks: chunks.length });
      await new Promise(r => setTimeout(r, 400));
    } catch (e) {
      results.errors.push({ url: item.url, error: e.message });
    }
  }
}

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // "full" = all pages, "recent" = last 10 only (default for cron)
  const mode = req.body?.mode || req.query?.mode || "recent";
  const results = { ingested: [], skipped: [], errors: [] };

  try {
    // ── Blog ────────────────────────────────────────────────────────────────
    const blogItems = mode === "full"
      ? await fetchAllBlogItems()
      : await fetchRSSItems("https://lifein20s.home.blog/feed");
    await processItems(blogItems, "blog", results);

    // ── Medium (always uses RSS ~ Freedium handles the fetch) ────────────────
    const mediumItems = await fetchMediumItems();
    await processItems(mediumItems, "medium", results);

  } catch (e) {
    results.errors.push({ error: e.message });
  }

  console.log(`Sync [${mode}] complete:`, JSON.stringify({
    ingested: results.ingested.length,
    skipped: results.skipped.length,
    errors: results.errors.length
  }));

  return res.status(200).json({
    success: true,
    mode,
    ingested: results.ingested.length,
    skipped: results.skipped.length,
    errors: results.errors.length,
    detail: results
  });
}
