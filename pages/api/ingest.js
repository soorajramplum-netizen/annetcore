// pages/api/ingest.js ~ Manual ingestion: text paste or document

import { chunkText, storeChunks, fetchUrlText } from "../../src/knowledge.js";

const INGEST_PASSWORD = process.env.INGEST_PASSWORD;

export const config = {
  api: { bodyParser: { sizeLimit: "10mb" } }
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { password, type, content, url, filename } = req.body;

  // Auth check
  if (!password || password !== INGEST_PASSWORD) {
    return res.status(401).json({ error: "Unauthorised" });
  }

  try {
    let text = "";
    let source = "manual";
    let sourceUrl = null;

    if (type === "text") {
      // Direct text paste
      if (!content || content.trim().length < 20) {
        return res.status(400).json({ error: "Content too short" });
      }
      text = content.trim();
      source = "paste";

    } else if (type === "url") {
      // Fetch from URL
      if (!url) return res.status(400).json({ error: "URL required" });
      text = await fetchUrlText(url);
      source = url.includes("medium.com") ? "medium" :
               url.includes("home.blog")  ? "blog"   : "url";
      sourceUrl = url;

    } else if (type === "document") {
      // Plain text extracted from file (client sends extracted text)
      if (!content || content.trim().length < 20) {
        return res.status(400).json({ error: "Document content too short" });
      }
      text = content.trim();
      source = "document";
      sourceUrl = filename || null;

    } else {
      return res.status(400).json({ error: "Invalid type. Use: text | url | document" });
    }

    // Chunk and store
    const chunks = chunkText(text);
    if (chunks.length === 0) {
      return res.status(400).json({ error: "No meaningful content found" });
    }

    const stored = await storeChunks(chunks, source, sourceUrl);
    return res.status(200).json({
      success: true,
      message: `Ingested ${stored} chunk${stored !== 1 ? "s" : ""}`,
      source
    });

  } catch (err) {
    console.error("Ingest error:", err);
    return res.status(500).json({ error: err.message || "Ingestion failed" });
  }
}
