import { useState, useRef, useEffect } from "react";
import Head from "next/head";

const MODES = {
  chat: {
    label: "Talk to Annet",
    placeholder: "Say something...",
    intro: "Sooraj thinks things through and sees multiple angles. I'm just a close, not exact, reflection of him."
  },
  refine: {
    label: "Refine Writing",
    placeholder: "Paste your draft here ~ I'll rewrite it in Sooraj's voice...",
    intro: "Paste your draft. I'll rewrite it the way Sooraj would ~ no AI sheen, no hollow filler."
  },
  recommend: {
    label: "What to Read",
    placeholder: "Tell me what you're in the mood for...",
    intro: "Tell me what you're looking for ~ I'll point you to something worth reading."
  },
  professional: {
    label: "Professional",
    placeholder: "Ask about Sooraj's work, skills, or experience...",
    intro: null
  },
  feed: {
    label: "🧠 Brain",
    placeholder: "",
    intro: null
  }
};

const REFINE_PASSWORD = "parkwaydrive";
const PROFESSIONAL_PASSWORD = "hired";
const FEED_PASSWORD = "9567083285";

function ThinkingText() {
  const [phase, setPhase] = useState(0);
  const phases = ["Annet is thinking...", "Annet is typing..."];
  useEffect(() => {
    const t = setInterval(() => setPhase(p => (p + 1) % 2), 1400);
    return () => clearInterval(t);
  }, []);
  return <span style={{fontSize: "13px", color: "var(--text-dim)", fontStyle: "italic"}}>{phases[phase]}</span>;
}

export default function Annet() {
  const [mode, setMode] = useState("chat");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [refineUnlocked, setRefineUnlocked] = useState(false);
  const [professionalUnlocked, setProfessionalUnlocked] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const [refineInstructions, setRefineInstructions] = useState("");
  const [companyInput, setCompanyInput] = useState("");
  const [companySet, setCompanySet] = useState("");
  const [humorPref, setHumorPref] = useState(null);
  const [showHumorPopup, setShowHumorPopup] = useState(false);
  const [refineFeedback, setRefineFeedback] = useState("");
  const [lastDraft, setLastDraft] = useState("");
  const [refineFrom, setRefineFrom] = useState("original");
  const [feedUnlocked, setFeedUnlocked] = useState(false);
  const [feedText, setFeedText] = useState("");
  const [feedUrl, setFeedUrl] = useState("");
  const [feedFile, setFeedFile] = useState(null);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedResult, setFeedResult] = useState(null);
  const [feedError, setFeedError] = useState(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncResult, setSyncResult] = useState(null); // "original" | "generated"
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);
  const passwordRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("tab") === "professional" && params.get("key") === "hired") {
      setMode("professional");
      setProfessionalUnlocked(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    setMessages([]);
    setInput("");
    setError(null);
    setLastDraft("");
    setRefineFeedback("");
    setRefineInstructions("");
  }, [mode]);

  const autoResize = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
  };

  const handlePasswordSubmit = () => {
    const val = passwordInput.trim().toLowerCase();
    if (mode === "refine" && val === REFINE_PASSWORD) {
      setRefineUnlocked(true); setPasswordError(false); setPasswordInput("");
    } else if (mode === "professional" && val === PROFESSIONAL_PASSWORD) {
      setProfessionalUnlocked(true); setPasswordError(false); setPasswordInput("");
    } else if (mode === "feed" && val === FEED_PASSWORD) {
      setFeedUnlocked(true); setPasswordError(false); setPasswordInput("");
    } else {
      setPasswordError(true); setPasswordInput("");
      passwordRef.current?.focus();
    }
  };

  const handlePasswordKey = (e) => {
    if (e.key === "Enter") handlePasswordSubmit();
  };

  const handleCompanySubmit = () => {
    if (companyInput.trim()) { setCompanySet(companyInput.trim()); setCompanyInput(""); }
  };

  const handleFeedIngest = async (type) => {
    setFeedLoading(true); setFeedResult(null); setFeedError(null);
    try {
      let body = { password: FEED_PASSWORD, type };
      if (type === "text") {
        if (!feedText.trim()) { setFeedError("Paste some content first."); setFeedLoading(false); return; }
        body.content = feedText.trim();
      } else if (type === "url") {
        if (!feedUrl.trim()) { setFeedError("Enter a URL first."); setFeedLoading(false); return; }
        body.url = feedUrl.trim();
      } else if (type === "document") {
        if (!feedFile) { setFeedError("Choose a file first."); setFeedLoading(false); return; }
        const text = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = e => resolve(e.target.result);
          reader.onerror = () => reject(new Error("Could not read file"));
          reader.readAsText(feedFile, "UTF-8");
        });
        if (!text || text.trim().length < 5) {
          setFeedError("File appears empty or unreadable. Try a .txt file.");
          setFeedLoading(false);
          return;
        }
        body.content = text.trim();
        body.filename = feedFile.name;
      }
      const res = await fetch("/api/ingest", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ingestion failed");
      setFeedResult(data.message);
      if (type === "text") setFeedText("");
      if (type === "url") setFeedUrl("");
      if (type === "document") setFeedFile(null);
    } catch (err) { setFeedError(err.message); }
    finally { setFeedLoading(false); }
  };

  const handleSync = async (mode = "recent") => {
    setSyncLoading(true); setSyncResult(null);
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode })
      });
      const data = await res.json();
      setSyncResult(`${mode === "full" ? "Full sync" : "Recent sync"} done ~ ${data.ingested} new, ${data.skipped} already known${data.errors > 0 ? `, ${data.errors} errors` : ""}.`);
    } catch { setSyncResult("Sync failed ~ try again."); }
    finally { setSyncLoading(false); }
  };

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setError(null);
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    try {
      // For refine mode, construct a proper editorial prompt
      const isRefineFeedback = mode === "refine" && lastDraft && messages.length > 0;
      const lastGenerated = isRefineFeedback
        ? messages.filter(m => m.role === "assistant").slice(-1)[0]?.content || ""
        : "";
      const baseContent = isRefineFeedback
        ? (refineFrom === "generated" ? lastGenerated : lastDraft)
        : text;
      if (mode === "refine" && !isRefineFeedback) setLastDraft(text);

      const refineUserMessage = isRefineFeedback
        ? `Here is the article that needs further improvement:\n\n${baseContent}\n\n---\nSpecific feedback to apply:\n${text}\n\nRewrite the full article incorporating this feedback precisely. Output the improved article only.`
        : `Transform this raw draft into a publish-ready article in Sooraj's voice.${refineInstructions.trim() ? `\n\nSpecial instructions from Sooraj:\n${refineInstructions.trim()}` : ""}\n\nDraft:\n${text}`;

      const apiMessages = mode === "refine"
        ? [{ role: "user", content: refineUserMessage }]
        : mode === "professional" && companySet
        ? [{ role: "system", content: `The person asking is from ${companySet}. Reference this naturally where relevant.` }, ...newMessages]
        : newMessages;

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages, mode, humorPref })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");

      setMessages([...newMessages, { role: "assistant", content: data.reply }]);
      // Show humor popup after first exchange in chat mode
      if (mode === "chat" && humorPref === null && newMessages.length === 1) {
        setTimeout(() => setShowHumorPopup(true), 800);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <>
      <Head>
        <title>Annet ~ Another Perspective</title>
        <meta name="description" content="A digital twin of Sooraj Ram ~ talk, read, think." />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=DM+Mono:wght@300;400&display=swap" rel="stylesheet" />
      </Head>

      <style jsx global>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg: #0e0e0e;
          --surface: #161616;
          --border: #2a2a2a;
          --border-light: #1e1e1e;
          --text: #e8e4dd;
          --text-dim: #6b6560;
          --text-mid: #9e9890;
          --accent: #c8a96e;
          --accent-dim: #7a6540;
          --user-bg: #1a1a1a;
          --annet-bg: #121212;
          --font-display: 'Playfair Display', Georgia, serif;
          --font-mono: 'DM Mono', 'Courier New', monospace;
        }

        html, body {
          background: var(--bg);
          color: var(--text);
          font-family: var(--font-mono);
          font-size: 14px;
          line-height: 1.7;
          height: 100%;
          overflow: hidden;
        }

        ::selection { background: var(--accent-dim); color: var(--text); }

        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }

        .app {
          display: flex;
          flex-direction: column;
          height: 100vh;
          max-width: 780px;
          margin: 0 auto;
          padding: 0 20px;
        }

        /* Header */
        .header {
          padding: 28px 0 20px;
          border-bottom: 1px solid var(--border-light);
          flex-shrink: 0;
        }

        .header-top {
          display: flex;
          align-items: baseline;
          gap: 16px;
          margin-bottom: 16px;
        }

        .logo {
          font-family: var(--font-display);
          font-size: 28px;
          font-weight: 600;
          color: var(--text);
          letter-spacing: -0.5px;
        }

        .logo-tag {
          font-size: 11px;
          color: var(--text-dim);
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .mode-tabs {
          display: flex;
          gap: 2px;
        }

        .mode-tab {
          background: none;
          border: 1px solid transparent;
          color: var(--text-dim);
          font-family: var(--font-mono);
          font-size: 11px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          padding: 5px 12px;
          cursor: pointer;
          border-radius: 2px;
          transition: all 0.15s ease;
        }

        .mode-tab:hover { color: var(--text-mid); border-color: var(--border); }

        .mode-tab.active {
          color: var(--accent);
          border-color: var(--accent-dim);
          background: rgba(200, 169, 110, 0.06);
        }

        /* Messages */
        .messages {
          flex: 1;
          overflow-y: auto;
          padding: 24px 0;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          justify-content: flex-start;
          padding: 8px 0 40px;
        }

        .empty-intro {
          font-family: var(--font-display);
          font-style: italic;
          font-size: 22px;
          color: var(--text-mid);
          line-height: 1.5;
          max-width: 480px;
          margin-bottom: 32px;
        }

        .empty-hints {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .empty-hint {
          background: none;
          border: none;
          font-family: var(--font-mono);
          font-size: 12px;
          color: var(--text-dim);
          cursor: pointer;
          text-align: left;
          padding: 6px 0;
          border-bottom: 1px solid transparent;
          transition: all 0.15s ease;
        }

        .empty-hint:hover {
          color: var(--text-mid);
          border-bottom-color: var(--border);
        }

        .empty-hint::before {
          content: "→ ";
          color: var(--accent-dim);
        }

        .message-group {
          margin-bottom: 28px;
        }

        .message-label {
          font-size: 10px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--text-dim);
          margin-bottom: 8px;
        }

        .message-label.annet { color: var(--accent-dim); }

        .message-content {
          color: var(--text);
          line-height: 1.75;
          white-space: pre-wrap;
          word-break: break-word;
        }

        .message-content.user {
          color: var(--text-mid);
          font-style: italic;
        }

        .message-content p { margin-bottom: 12px; }
        .message-content p:last-child { margin-bottom: 0; }

        .message-content a {
          color: var(--accent);
          text-decoration: none;
          border-bottom: 1px solid var(--accent-dim);
        }

        .message-content a:hover { border-bottom-color: var(--accent); }

        .divider {
          height: 1px;
          background: var(--border-light);
          margin: 28px 0;
        }

        /* Loading */
        .loading {
          display: flex;
          align-items: center;
          gap: 6px;
          color: var(--text-dim);
          font-size: 12px;
          padding: 8px 0;
        }

        /* Input area */
        .input-area {
          border-top: 1px solid var(--border-light);
          padding: 16px 0 24px;
          flex-shrink: 0;
        }

        .input-wrap {
          display: flex;
          gap: 12px;
          align-items: flex-end;
        }

        .input-textarea {
          flex: 1;
          background: none;
          border: none;
          border-bottom: 1px solid var(--border);
          color: var(--text);
          font-family: var(--font-mono);
          font-size: 14px;
          line-height: 1.7;
          padding: 8px 0;
          resize: none;
          min-height: 40px;
          outline: none;
          transition: border-color 0.15s ease;
        }

        .input-textarea::placeholder { color: var(--text-dim); }
        .input-textarea:focus { border-bottom-color: var(--accent-dim); }

        .send-btn {
          background: none;
          border: 1px solid var(--border);
          color: var(--text-dim);
          font-family: var(--font-mono);
          font-size: 12px;
          letter-spacing: 0.06em;
          padding: 8px 16px;
          cursor: pointer;
          border-radius: 2px;
          transition: all 0.15s ease;
          white-space: nowrap;
          flex-shrink: 0;
          margin-bottom: 2px;
        }

        .send-btn:hover:not(:disabled) {
          border-color: var(--accent-dim);
          color: var(--accent);
        }

        .send-btn:disabled { opacity: 0.3; cursor: not-allowed; }

        .error-msg {
          font-size: 12px;
          color: #c06060;
          margin-top: 8px;
        }

        /* Refine feedback bar */
        .refine-feedback-wrap {
          padding-bottom: 4px;
        }

        .refine-feedback-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 10px;
          flex-wrap: wrap;
          gap: 8px;
        }

        .refine-feedback-label {
          font-size: 10px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--accent-dim);
        }

        .refine-from-toggle {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .refine-from-label {
          font-size: 10px;
          color: var(--text-dim);
          letter-spacing: 0.04em;
        }

        .refine-from-btn {
          background: none;
          border: 1px solid var(--border);
          color: var(--text-dim);
          font-family: var(--font-mono);
          font-size: 10px;
          letter-spacing: 0.04em;
          padding: 3px 10px;
          cursor: pointer;
          border-radius: 2px;
          transition: all 0.15s ease;
        }

        .refine-from-btn:hover { color: var(--text-mid); border-color: var(--border); }

        .refine-from-btn.active {
          border-color: var(--accent-dim);
          color: var(--accent);
          background: rgba(200,169,110,0.06);
        }

        .refine-reset-btn {
          background: none;
          border: none;
          font-family: var(--font-mono);
          font-size: 11px;
          color: var(--text-dim);
          cursor: pointer;
          padding: 6px 0;
          margin-top: 4px;
          transition: color 0.15s ease;
        }

        .refine-reset-btn:hover { color: var(--text-mid); }

        .footer-note {
          font-size: 10px;
          color: var(--text-dim);
          margin-top: 10px;
          letter-spacing: 0.04em;
        }

        /* Password gate */
        .password-gate {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          justify-content: flex-start;
          padding: 40px 0;
        }

        .password-gate-title {
          font-family: var(--font-display);
          font-style: italic;
          font-size: 22px;
          color: var(--text-mid);
          margin-bottom: 8px;
        }

        .password-gate-sub {
          font-size: 12px;
          color: var(--text-dim);
          margin-bottom: 32px;
        }

        .password-row {
          display: flex;
          gap: 10px;
          align-items: center;
        }

        .password-input {
          background: none;
          border: none;
          border-bottom: 1px solid var(--border);
          color: var(--text);
          font-family: var(--font-mono);
          font-size: 14px;
          padding: 8px 0;
          outline: none;
          width: 200px;
          transition: border-color 0.15s ease;
          letter-spacing: 0.1em;
        }

        .password-input:focus { border-bottom-color: var(--accent-dim); }
        .password-input::placeholder { color: var(--text-dim); letter-spacing: 0; }

        .password-btn {
          background: none;
          border: 1px solid var(--border);
          color: var(--text-dim);
          font-family: var(--font-mono);
          font-size: 11px;
          letter-spacing: 0.06em;
          padding: 7px 14px;
          cursor: pointer;
          border-radius: 2px;
          transition: all 0.15s ease;
        }

        .password-btn:hover {
          border-color: var(--accent-dim);
          color: var(--accent);
        }

        .password-error {
          font-size: 11px;
          color: #c06060;
          margin-top: 10px;
        }

        /* Professional card */
        .pro-card {
          padding: 32px 0;
          max-width: 600px;
        }

        .pro-card {
          width: 100%;
          padding-top: 4px;
          padding-bottom: 40px;
        }

        .pro-name {
          font-family: var(--font-display);
          font-size: 24px;
          font-weight: 600;
          color: var(--text);
          margin-bottom: 4px;
        }

        .pro-title {
          font-size: 12px;
          color: var(--accent);
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 24px;
        }

        .pro-section {
          margin-bottom: 20px;
        }

        .pro-section-label {
          font-size: 10px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--text-dim);
          margin-bottom: 8px;
        }

        .pro-section-body {
          font-size: 13px;
          color: var(--text-mid);
          line-height: 1.7;
        }

        .pro-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .pro-tag {
          font-size: 11px;
          color: var(--text-dim);
          border: 1px solid var(--border);
          padding: 3px 10px;
          border-radius: 2px;
        }

        .pro-divider {
          height: 1px;
          background: var(--border-light);
          margin: 20px 0;
        }

        .pro-ask-hint {
          font-size: 12px;
          color: var(--text-dim);
          margin-top: 24px;
          font-style: italic;
        }

        /* Letters of recommendation */
        .lor-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .lor-card {
          border: 1px solid var(--border);
          border-radius: 3px;
          padding: 14px 16px;
        }

        .lor-from {
          font-size: 11px;
          color: var(--accent);
          letter-spacing: 0.04em;
          margin-bottom: 10px;
          font-weight: 500;
        }

        .lor-quotes {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 12px;
        }

        .lor-quote {
          font-size: 12px;
          color: var(--text-mid);
          background: rgba(255,255,255,0.03);
          border: 1px solid var(--border-light);
          border-radius: 2px;
          padding: 3px 8px;
          font-style: italic;
          line-height: 1.5;
        }

        .lor-btn {
          display: inline-block;
          font-family: var(--font-mono);
          font-size: 11px;
          color: var(--text-dim);
          border: 1px solid var(--border);
          border-radius: 2px;
          padding: 4px 12px;
          text-decoration: none;
          transition: all 0.15s ease;
        }

        .lor-btn:hover { color: var(--accent); border-color: var(--accent-dim); }

        .resume-btn {
          display: inline-block;
          font-family: var(--font-mono);
          font-size: 11px;
          color: var(--accent);
          border: 1px solid var(--accent-dim);
          border-radius: 2px;
          padding: 5px 14px;
          text-decoration: none;
          margin-top: 14px;
          transition: all 0.15s ease;
          opacity: 0.85;
        }

        .resume-btn:hover { opacity: 1; background: rgba(255,255,255,0.04); }

        /* Month snapshot */
        .snapshot-frame {
          border: 1px solid var(--border);
          border-radius: 4px;
          overflow: hidden;
          display: inline-block;
          max-width: 320px;
          width: 100%;
        }

        .snapshot-img {
          display: block;
          width: 100%;
          height: auto;
          border-radius: 3px;
        }

        /* Share link */
        .share-link-box {
          display: flex;
          align-items: center;
          gap: 10px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 3px;
          padding: 8px 12px;
        }

        .share-link-text {
          font-size: 11px;
          color: var(--text-dim);
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .share-copy-btn {
          background: none;
          border: 1px solid var(--border);
          color: var(--text-dim);
          font-family: var(--font-mono);
          font-size: 11px;
          padding: 4px 12px;
          cursor: pointer;
          border-radius: 2px;
          flex-shrink: 0;
          transition: all 0.15s ease;
        }

        .share-copy-btn:hover { color: var(--accent); border-color: var(--accent-dim); }

        /* Fun projects cell */
        .fun-cell { grid-column: 1 / -1; }

        .fun-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 4px;
        }

        .fun-link {
          display: flex;
          align-items: baseline;
          gap: 10px;
          text-decoration: none;
          padding: 4px 0;
          border-bottom: 1px solid var(--border-light);
          transition: all 0.15s ease;
        }

        .fun-link:last-child { border-bottom: none; }
        .fun-link:hover .fun-name { color: var(--accent); }

        .fun-name {
          font-size: 12px;
          color: var(--text-mid);
          white-space: nowrap;
          flex-shrink: 0;
          transition: color 0.15s ease;
        }

        .fun-note {
          font-size: 11px;
          color: var(--text-dim);
          font-style: italic;
          line-height: 1.5;
        }

        /* Achievement list */
        .achieve-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .achieve-item {
          display: flex;
          gap: 10px;
          align-items: flex-start;
          font-size: 13px;
          color: var(--text-mid);
          line-height: 1.65;
        }

        .achieve-dot {
          color: var(--accent-dim);
          font-size: 8px;
          margin-top: 5px;
          flex-shrink: 0;
        }

        /* Experience list */
        .exp-list {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .exp-item {
          border-left: 2px solid var(--border);
          padding-left: 12px;
        }

        .exp-top {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 8px;
          margin-bottom: 3px;
        }

        .exp-role {
          font-size: 13px;
          color: var(--text);
          font-weight: 500;
        }

        .exp-period {
          font-size: 10px;
          color: var(--text-dim);
          white-space: nowrap;
          flex-shrink: 0;
        }

        .exp-org {
          font-size: 11px;
          color: var(--text-dim);
          line-height: 1.5;
        }

        /* Tool cards */
        .tools-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        @media (max-width: 600px) {
          .tools-grid { grid-template-columns: 1fr; }
        }

        .tool-card {
          display: block;
          border: 1px solid var(--border);
          border-radius: 3px;
          padding: 14px 16px;
          text-decoration: none;
          transition: border-color 0.15s ease, background 0.15s ease;
        }

        .tool-card:hover {
          border-color: var(--accent-dim);
          background: rgba(200,169,110,0.04);
        }

        .tool-name {
          font-family: var(--font-display);
          font-size: 14px;
          font-weight: 600;
          color: var(--accent);
          margin-bottom: 10px;
          letter-spacing: -0.2px;
        }

        .tool-row {
          display: flex;
          gap: 10px;
          margin-bottom: 6px;
          align-items: flex-start;
        }

        .tool-row:last-child { margin-bottom: 0; }

        .tool-label {
          font-size: 9px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--text-dim);
          padding-top: 2px;
          min-width: 52px;
          flex-shrink: 0;
        }

        .tool-text {
          font-size: 12px;
          color: var(--text-mid);
          line-height: 1.6;
        }

        .tool-footnote {
          font-size: 11px;
          color: var(--text-dim);
          margin-top: 14px;
          font-style: italic;
          line-height: 1.6;
        }

        /* Feed / Brain tab */
        .feed-card {
          width: 100%;
          padding-top: 4px;
          padding-bottom: 40px;
        }

        .feed-title {
          font-family: var(--font-display);
          font-size: 24px;
          font-weight: 600;
          color: var(--text);
          margin-bottom: 4px;
        }

        .feed-subtitle {
          font-size: 12px;
          color: var(--text-dim);
          margin-bottom: 24px;
          line-height: 1.6;
        }

        .feed-section { margin-bottom: 4px; }

        .feed-section-label {
          font-size: 10px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--text-dim);
          margin-bottom: 6px;
        }

        .feed-section-body {
          font-size: 12px;
          color: var(--text-dim);
          line-height: 1.6;
          margin-bottom: 10px;
        }

        .feed-divider {
          height: 1px;
          background: var(--border-light);
          margin: 20px 0;
        }

        .feed-row {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 10px;
        }

        .feed-source {
          font-size: 11px;
          color: var(--accent-dim);
          border: 1px solid var(--border);
          padding: 3px 10px;
          border-radius: 2px;
        }

        .feed-textarea {
          width: 100%;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 3px;
          color: var(--text);
          font-family: var(--font-mono);
          font-size: 13px;
          line-height: 1.6;
          padding: 10px 12px;
          resize: vertical;
          outline: none;
          margin-bottom: 10px;
          transition: border-color 0.15s ease;
        }

        .feed-textarea:focus { border-color: var(--accent-dim); }
        .feed-textarea::placeholder { color: var(--text-dim); }

        .feed-input {
          width: 100%;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 3px;
          color: var(--text);
          font-family: var(--font-mono);
          font-size: 13px;
          padding: 8px 12px;
          outline: none;
          margin-bottom: 10px;
          transition: border-color 0.15s ease;
        }

        .feed-input:focus { border-color: var(--accent-dim); }
        .feed-input::placeholder { color: var(--text-dim); }

        .feed-btn {
          background: none;
          border: 1px solid var(--border);
          color: var(--text-mid);
          font-family: var(--font-mono);
          font-size: 11px;
          letter-spacing: 0.06em;
          padding: 7px 16px;
          cursor: pointer;
          border-radius: 2px;
          transition: all 0.15s ease;
          display: block;
        }

        .feed-btn:hover:not(:disabled) {
          border-color: var(--accent-dim);
          color: var(--accent);
        }

        .feed-btn:disabled { opacity: 0.35; cursor: not-allowed; }

        .feed-file-label {
          display: inline-block;
          border: 1px dashed var(--border);
          border-radius: 3px;
          padding: 10px 16px;
          font-size: 12px;
          color: var(--text-dim);
          cursor: pointer;
          margin-bottom: 10px;
          transition: all 0.15s ease;
        }

        .feed-file-label:hover { border-color: var(--accent-dim); color: var(--accent); }

        .feed-success {
          font-size: 12px;
          color: #4a9;
          line-height: 1.5;
        }

        .feed-error {
          font-size: 12px;
          color: #c06060;
          line-height: 1.5;
        }

        /* Humor popup */
        .humor-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.6);
          z-index: 100;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          padding-bottom: 32px;
          animation: fadeIn 0.2s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .humor-card {
          background: #1a1a1a;
          border: 1px solid var(--border);
          border-radius: 4px;
          padding: 24px;
          max-width: 420px;
          width: calc(100% - 40px);
          animation: slideUp 0.25s ease;
        }

        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        .humor-card-title {
          font-family: var(--font-display);
          font-style: italic;
          font-size: 17px;
          color: var(--text);
          line-height: 1.5;
          margin-bottom: 6px;
        }

        .humor-card-sub {
          font-size: 11px;
          color: var(--text-dim);
          margin-bottom: 20px;
          line-height: 1.6;
        }

        .humor-btns {
          display: flex;
          gap: 10px;
        }

        .humor-btn {
          flex: 1;
          background: none;
          border: 1px solid var(--border);
          color: var(--text-mid);
          font-family: var(--font-mono);
          font-size: 12px;
          letter-spacing: 0.05em;
          padding: 10px;
          cursor: pointer;
          border-radius: 2px;
          transition: all 0.15s ease;
        }

        .humor-btn:hover { border-color: var(--accent-dim); color: var(--accent); }

        .humor-btn.yes:hover { border-color: var(--accent); background: rgba(200,169,110,0.08); }

        @media (max-width: 600px) {
          .app { padding: 0 16px; }
          .logo { font-size: 22px; }
          .empty-intro { font-size: 18px; }
          .mode-tab { padding: 5px 8px; font-size: 10px; }
        }
      `}</style>

      <div className="app">
        {/* Header */}
        <header className="header">
          <div className="header-top">
            <span className="logo">Annet</span>
            <span className="logo-tag">Sooraj's Digital Twin</span>
          </div>
          <nav className="mode-tabs">
            {Object.entries(MODES).map(([key, val]) => (
              <button
                key={key}
                className={`mode-tab ${mode === key ? "active" : ""}`}
                onClick={() => setMode(key)}
              >
                {val.label}
              </button>
            ))}
          </nav>
        </header>

        {/* Intro banner */}
        <div style={{
          fontSize: "12px",
          color: "var(--text-dim)",
          padding: "8px 0 4px",
          borderBottom: "1px solid var(--border-light)",
          marginBottom: "4px",
          lineHeight: "1.5"
        }}>
          Annet is Sooraj's digital twin ~ talk to him, read his writing, or explore his professional work.
        </div>

        {/* Messages */}
        <div className="messages">
          {(mode === "refine" && !refineUnlocked) || (mode === "professional" && !professionalUnlocked) || (mode === "feed" && !feedUnlocked) ? (
            <div className="password-gate">
              <p className="password-gate-title">
                {mode === "feed" ? "Here is where Sooraj's Brain lives." : mode === "professional" ? "This one's for the right people." : "This one's just for Sooraj."}
              </p>
              <p className="password-gate-sub">Enter the password to continue.</p>
              <div className="password-row">
                <input
                  ref={passwordRef}
                  type="password"
                  className="password-input"
                  value={passwordInput}
                  onChange={e => { setPasswordInput(e.target.value); setPasswordError(false); }}
                  onKeyDown={handlePasswordKey}
                  placeholder="password"
                  autoFocus
                />
                <button className="password-btn" onClick={handlePasswordSubmit}>
                  Enter
                </button>
              </div>
              {passwordError && (
                <p className="password-error">That's not it ~ try again.</p>
              )}
            </div>
          ) : isEmpty ? (
            <div className="empty-state">
              {mode === "professional" ? (
                <div className="pro-card">
                  <div className="pro-name">Sooraj Ram</div>
                  <div className="pro-title">Consumer Insights & Analytics · Brand Strategy · EIR</div>

                  {/* DID YOU KNOW */}
                  <div className="pro-section">
                    <div className="pro-section-label" style={{color:"var(--accent)"}}>Did you know?</div>
                    <div className="pro-section-body">
                      In 2023, Sooraj conceived "Consumer Proxy" ~ a novel framework for AI-led whitespace discovery in FMCG and built a quasi-PoC around it. Two years later, an independent FMCG-tech startup built the exact same idea from scratch and raised <strong style={{color:"var(--accent)"}}>Rs 53 Crore</strong> in Oct 2025. The idea existed first ~ that's the kind of thinking he brings to every room he's in.
                    </div>
                  </div>

                  <div className="pro-divider" />

                  {/* IN SHORT */}
                  <div className="pro-section">
                    <div className="pro-section-label">In short</div>
                    <div className="pro-section-body">
                      Engineer by training, marketer by choice ~ keen on solving problems, building brands and growth systems, all while keeping consumers at the centre. Fortunate to have done this across all stages, channels and categories (idea stage to 2000Cr+, traditional FMCG to digital, foods to toiletries) and built the consumer insights division from scratch in 3 organisations. Along the way, set up 20+ capabilities ~ including Consumer Proxy. Lately engaged in finding whitespaces and building tools to fill them: 12 built, 2 ready to commercialise. Working with 11 companies across 7 countries before graduating gave him a headstart ~ close to 3 years of experience before his degree, and now close to 8 years total.
                    </div>
                  </div>

                  <div className="pro-divider" />

                  {/* EXPERIENCE */}
                  <div className="pro-section">
                    <div className="pro-section-label">Experience</div>
                    <div className="exp-list">
                      {[
                        { role: "Consumer & Market Intelligence", org: "Sweet Karam Coffee", period: "May '25 – Present", note: "EIR for CEO · Product roadmap · Brand · Growth · CMI CoE" },
                        { role: "Consumer Insights, Category", org: "Plum", period: "Mar '25 – May '25", note: "Market entry · Trendspotting · Path2Purchase · TrendScore" },
                        { role: "Consumer Insights Lead, Brand", org: "Traya", period: "May '24 – Mar '25", note: "Built insights team from scratch · 2 brand launches · Acquisition & retention" },
                        { role: "Consumer Insights & Analytics", org: "CavinKare", period: "Dec '22 – May '24", note: "Qual + Quant · D2C/Ecom · Insights Engine · NPD Playbook" },
                        { role: "Senior Associate, Market Research", org: "ZoomRx", period: "Jun '22 – Dec '22", note: "Led 12 franchises · Feasibility analysis · Consulting support" },
                        { role: "Team Lead, Ops Intelligence", org: "Better Mortgage Corporation", period: "Sept '20 – Jun '22", note: "Promoted to lead in under a year" },
                        { role: "R&D Project Intern", org: "ISRO", period: "Jan '20 – Feb '20", note: "" },
                      ].map((e, i) => (
                        <div key={i} className="exp-item">
                          <div className="exp-top">
                            <span className="exp-role">{e.role}</span>
                            <span className="exp-period">{e.period}</span>
                          </div>
                          <div className="exp-org">{e.org}{e.note ? ` · ${e.note}` : ""}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pro-divider" />

                  {/* PROFICIENCIES */}
                  <div className="pro-section">
                    <div className="pro-section-label">Proficiencies</div>
                    <div className="pro-tags">
                      {["Consumer Insights", "Brand Strategy", "Data Literacy", "Behavioural Science", "Qual + Quant", "Category Management", "D2C & Ecom", "Market Entry", "NPD & Launch", "Analytical Frameworks", "Trendspotting", "Comms Strategy"].map(t => (
                        <span key={t} className="pro-tag">{t}</span>
                      ))}
                    </div>
                  </div>

                  <div className="pro-divider" />

                  {/* EDUCATION */}
                  <div className="pro-section">
                    <div className="pro-section-label">Education</div>
                    <div className="pro-section-body">
                      B.Tech Mechanical Engineering · APJ Abdul Kalam Technological University · CGPA 9.39/10 · University topper S5 & S8 (10/10) · Academic excellence award 8 times · 99th percentile English · 96th percentile Quantitative (Advanced)
                    </div>
                  </div>

                  <div className="pro-divider" />

                  {/* LETTERS OF RECOMMENDATION */}
                  <div className="pro-section">
                    <div className="pro-section-label">Letters of recommendation</div>
                    <div className="lor-list">
                      {[
                        {
                          from: "Co-Founder & CEO, Sweet Karam Coffee",
                          quotes: ["rare combination of curiosity, ownership, and execution excellence", "unique blend of skills that is uncommon at his stage", "grow into a high-impact leader"],
                          url: "https://drive.google.com/file/d/1uR9HrjeDK_cbio1thFGb-I9VHh1HPwna/view?usp=drive_link"
                        },
                        {
                          from: "Founder, Raindus Beauty",
                          quotes: ["easiest 'yes' I've ever said as a CEO", "near obsessive focus on understanding business fundamentals", "zoom in on executional details & zoom out to look at market reality, all within one conversation"],
                          url: "https://drive.google.com/file/d/1ujAoD1kFPkHknas1FJ5OoXFeYSPtZdI4/view?usp=drive_link"
                        },
                        {
                          from: "Head of Innovation Marketing, CavinKare",
                          quotes: ["The Whiz Kid", "Legend in D2C & ECom", "razor sharp execution", "master storyteller with data"],
                          url: "https://drive.google.com/file/d/1kTZeix8XxjGQ3gwA3RN2pFOhF590K0a8/view?usp=drive_link"
                        },
                        {
                          from: "Head of Consumer Insights, CavinKare",
                          quotes: ["high level of professionalism, reliability, and innovation", "truly an asset to any organisation that you work for"],
                          url: "https://drive.google.com/file/d/1gPyg_YUZSZeEzmo0dmmUs8FYDP4erYaK/view?usp=drive_link"
                        },
                        {
                          from: "Head of Finance, CavinKare",
                          quotes: ["throughout my 34-year career, I've rarely met someone like him", "exceptional skill in extracting insights", "highly adaptable to change"],
                          url: "https://drive.google.com/file/d/1nnkkpCg9reKt2ZRQnP8-wpxvBF7sJqiU/view?usp=drive_link"
                        }
                      ].map((lor, i) => (
                        <div key={i} className="lor-card">
                          <div className="lor-from">{lor.from}</div>
                          <div className="lor-quotes">
                            {lor.quotes.map((q, j) => (
                              <span key={j} className="lor-quote">"{q}"</span>
                            ))}
                          </div>
                          <a href={lor.url} target="_blank" rel="noopener noreferrer" className="lor-btn">
                            View letter ↗
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pro-divider" />

                  {/* TOOLS */}
                  <div className="pro-section">
                    <div className="pro-section-label">Tools he has built</div>
                    <div className="pro-section-body" style={{marginBottom:"14px", fontSize:"12px", color:"var(--text-dim)"}}>
                      Built independently ~ each one solving a gap he spotted from inside the industry. 12 built, 2 ready to commercialise.
                    </div>
                    <div className="tools-grid">
                      {[
                        { name:"Right Copywriter", url:"https://right-copywriter.vercel.app/", problem:"AI generates text, not content. Most copy tools have no understanding of why people buy.", solution:"Behavioural science engine trained on 62 cognitive biases ~ writes copy that sells, not just sounds good." },
                        { name:"Adroit", url:"https://adroit-alpha.vercel.app/", problem:"People buy through System 1 thinking. Scripts rarely cater to that part of the brain.", solution:"Second-by-second, shoot-ready scripts grounded in behavioural science with brand asset integration." },
                        { name:"South or Not", url:"https://southproud.vercel.app/", problem:"Product ideas are easy, especially now. But most aren't consumer-rooted. 10 launches, 1 success if lucky.", solution:"Science-led product intelligence suite for South Indian food ~ end-to-end from concept to shelf." },
                        { name:"Soul Scape", url:"https://soulscape-site.vercel.app/", problem:"People struggle to find the right place to go ~ and even more so once they get there.", solution:"Spotify-like mood discovery for travel + Duolingo-style trip planning that handholds from discovery to destination." },
                        { name:"Marketing BS Detector", url:"https://marketingbschecker2.vercel.app/", problem:"99% of LinkedIn marketing content is noise. Untrained people talking marketing to other untrained people ~ the BS compounds.", solution:"Checks claims against peer-reviewed research and evidence from respected marketers. Self-learning module in the works." },
                      ].map(tool => (
                        <a key={tool.name} href={tool.url} target="_blank" rel="noopener noreferrer" className="tool-card">
                          <div className="tool-name">{tool.name} ↗</div>
                          <div className="tool-row"><span className="tool-label">Problem</span><span className="tool-text">{tool.problem}</span></div>
                          <div className="tool-row"><span className="tool-label">Solution</span><span className="tool-text">{tool.solution}</span></div>
                        </a>
                      ))}
                      {/* Fun projects ~ single cell */}
                      <div className="tool-card fun-cell">
                        <div className="tool-name">Fun Projects</div>
                        <div className="fun-list">
                          {[
                            { name:"Thala for a Reason", url:"https://www.thalaforareason.lovable.app/", note:"You'll know if you follow cricket / IPL" },
                            { name:"Swaflora", url:"https://swaflora.lovable.app", note:"Because asking out online shouldn't be boring" },
                            { name:"Boredom Math", url:"https://boredom-solver-math.lovable.app", note:"Number plate math from his commute, turned into a game" },
                            { name:"Virtual Dessert", url:"https://ajithascreations.lovable.app", note:"Built as a gift for a kid hosting her first dessert website" },
                            { name:"reinVENT", url:"https://reinventyou.lovable.app", note:"Started to help a friend struggling with PMS / mood swings" },
                          ].map((f, i) => (
                            <a key={i} href={f.url} target="_blank" rel="noopener noreferrer" className="fun-link">
                              <span className="fun-name">{f.name} ↗</span>
                              <span className="fun-note">{f.note}</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pro-divider" />

                  {/* COMPANY INPUT */}
                  <div className="pro-section">
                    <div className="pro-section-label" style={{color:"var(--accent-dim)"}}>Optional ~ helps personalise the conversation</div>
                    <div className="pro-section-body" style={{marginBottom:"10px", fontSize:"12px", color:"var(--text-dim)"}}>
                      Which company are you from?
                    </div>
                    <div style={{display:"flex", gap:"10px", alignItems:"center"}}>
                      <input
                        type="text"
                        className="password-input"
                        style={{width:"220px", letterSpacing:"normal"}}
                        placeholder="e.g. Unilever, Mamaearth..."
                        value={companyInput}
                        onChange={e => setCompanyInput(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && handleCompanySubmit()}
                      />
                      <button className="password-btn" onClick={handleCompanySubmit}>Set</button>
                    </div>
                    {companySet && <p style={{fontSize:"11px", color:"var(--accent-dim)", marginTop:"8px"}}>Got it ~ asking in context of {companySet}.</p>}
                  </div>

                  <div className="pro-divider" />

                  {/* MONTH SNAPSHOT */}
                  <div className="pro-section">
                    <div className="pro-section-label" style={{letterSpacing:"0.04em"}}>This month's proof of work</div>
                    <div style={{fontSize:"12px", color:"var(--text-dim)", marginBottom:"14px", lineHeight:"1.6"}}>
                      A message, a moment, a number ~ something real from the month. Changes every month.
                    </div>
                    <div className="snapshot-frame">
                      <img
                        src="data:image/png;base64,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wT/FO/1YOewK8TXT31Xv4oPF+eion45hzgvYinVU3f7zPGd6errHSSk+BhIygeA24km9ECgtyMXSPDs7i+3zDrcWV62g/2EdbCY5YvQ34wVKaUdDSTqspuz+dvQzjzBVnJzXD9r+mrVryfKCe++9F2MMp566nr179rJjxw6mpqd529tuYdvZZzM8PMSRY0e57fbbOP2MM3jwoQc5fOQIy5adRK1e555776HVanPtta+jXm/wwAMP9LiG9etP5cCBAzz11FPU63XWnXwyd999D9PT05x88ilMTU/zxBNPMDU5xXnnnsfOnTu57fbbXb9lEWu1GqtWr2H58uXceOONHD9+gk9+8n8wMzPDk08+yRVXXMGb3vQmhoeH+PVf/w327dsn81fj9M2b+dTv/X7vlPgefHeCFe/sSy65hM997nNYa9mwYQOTk5Ns2rSJoihot9v84z/+I6eddhphGPLAAw/wzDPPcPz4cVavXs2DDz7YQ+QzzzyT9evXs3XrVmZnZ8myjHPPPZcNGzZw6qmnEscxF110EYODgxyWJGr9+6fT6VD6koUBPGuR4q7PcSHtVKvVXrBjLHFs/RHdPoQSXqIckSqT5+gGC3v8mj7WqP/vgYEB2u02RVH04h06EpDl3+c/q4FepaQSiITNQhbKv9enhj0oS2rVKhdffDFPP/00aZryS7/8S3zz7rv51O/9HlXJ7attaNqBPM97HsoaKazv0n9LUX77k659GBka5v/9r/+FX/+N3+DBHTucEszosTGn8BqQ7OyFJOnKJFvY0NAQU1NTPVY1CALe8573AJZf+ZVfnReT9D347oSyLLn22muJ45iBgQHuu+8+jh07xsjICM899xxDQ0Ocd955rFu3ji996UuMjY0BsH37doqi4O677yaWLAbvfOc7ef7555mdneXMM8/ka1/7GjfddBNf+cpXOOuss1iyZAlf//rX2b59O7fddhv79u2bJ26XZcnE+LjLd2xcki5NVa77TAmAPqd4Fkpah6mpqZ5YpZzPS4HGLCF5aDTAErEkB/O0oQILEZhSlFRq2s5Fd6PX+p9T0N9Uoz07O8v09PSCbs8+sZnHFVk3TXlZcOHFF/Hz//FW/suv/FeOnzjO57/wBYf4C/QZsZbNzs726v7qR/uuRKKfwOR5zmmnbeI3fuPXeeqpp3n88cfncV/ucJgTD6ekzrDq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"
                        alt="This month's proof of work"
                        className="snapshot-img"
                      />
                    </div>
                  </div>

                  <div className="pro-divider" />

                  {/* SHAREABLE LINK */}
                  <div className="pro-section">
                    <div className="pro-section-label">Share without password</div>
                    <div className="pro-section-body" style={{marginBottom:"10px"}}>
                      Send this link ~ they land directly on the Professional tab, no password needed.
                    </div>
                    <div className="share-link-box">
                      <span className="share-link-text">{typeof window !== "undefined" ? `${window.location.origin}?tab=professional&key=hired` : "Loading..."}</span>
                      <button className="share-copy-btn" onClick={() => {
                        const link = `${window.location.origin}?tab=professional&key=hired`;
                        navigator.clipboard.writeText(link);
                      }}>Copy</button>
                    </div>
                  </div>

                  <p className="pro-ask-hint">Ask anything about his work, approach, or experience.</p>
                </div>
              ) : mode === "feed" ? (
                <div className="feed-card">
                  <div className="feed-title">Sooraj's Brain</div>
                  <div className="feed-subtitle">Whatever you add here ~ Annet learns. Permanently.</div>

                  <div className="feed-section">
                    <div className="feed-section-label">Auto-sync</div>
                    <div className="feed-section-body">Runs daily at 2am and picks up new posts from your blog and Medium automatically. You don't need to do anything.</div>
                    <div className="feed-row" style={{marginTop:"10px"}}>
                      <span className="feed-source">lifein20s.home.blog</span>
                      <span className="feed-source">medium.com/@nytt_liv</span>
                    </div>
                    <div style={{display:"flex", gap:"8px", marginTop:"12px", flexWrap:"wrap"}}>
                      <button className="feed-btn" onClick={() => handleSync("recent")} disabled={syncLoading}>
                        {syncLoading ? "Syncing..." : "↻ Sync last 10"}
                      </button>
                      <button className="feed-btn" onClick={() => handleSync("full")} disabled={syncLoading} style={{borderColor:"var(--accent-dim)", color:"var(--accent)"}}>
                        {syncLoading ? "Syncing..." : "↻ Full sync (all articles)"}
                      </button>
                    </div>
                    <p style={{fontSize:"11px", color:"var(--text-dim)", marginTop:"8px"}}>Full sync pulls every article ever written. Run once. After that, last 10 is enough.</p>
                    {syncResult && <p className="feed-success">{syncResult}</p>}
                  </div>

                  <div className="feed-divider" />

                  <div className="feed-section">
                    <div className="feed-section-label">Paste text</div>
                    <div className="feed-section-body">Notes, thoughts, conversations, anything.</div>
                    <textarea
                      className="feed-textarea"
                      value={feedText}
                      onChange={e => setFeedText(e.target.value)}
                      placeholder="Paste any text ~ raw notes, a draft, a conversation..."
                      rows={4}
                    />
                    <button className="feed-btn" onClick={() => handleFeedIngest("text")} disabled={feedLoading}>
                      {feedLoading ? "Adding..." : "Add to Brain"}
                    </button>
                  </div>

                  <div className="feed-divider" />

                  <div className="feed-section">
                    <div className="feed-section-label">Add by URL</div>
                    <div className="feed-section-body">Any link ~ Annet will fetch and learn from it.</div>
                    <input
                      type="text"
                      className="feed-input"
                      value={feedUrl}
                      onChange={e => setFeedUrl(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && handleFeedIngest("url")}
                      placeholder="https://..."
                    />
                    <button className="feed-btn" onClick={() => handleFeedIngest("url")} disabled={feedLoading}>
                      {feedLoading ? "Fetching..." : "Fetch & Add"}
                    </button>
                  </div>

                  <div className="feed-divider" />

                  <div className="feed-section">
                    <div className="feed-section-label">Upload document</div>
                    <div className="feed-section-body">Any .txt or .md file.</div>
                    <label className="feed-file-label">
                      <input
                        type="file"
                        accept=".txt,.md,.csv"
                        style={{display:"none"}}
                        onChange={e => setFeedFile(e.target.files[0] || null)}
                      />
                      {feedFile ? `✓ ${feedFile.name}` : "Choose file"}
                    </label>
                    <button className="feed-btn" onClick={() => handleFeedIngest("document")} disabled={feedLoading || !feedFile}>
                      {feedLoading ? "Processing..." : "Add Document"}
                    </button>
                  </div>

                  {feedResult && <p className="feed-success" style={{marginTop:"16px"}}>✓ {feedResult}</p>}
                  {feedError && <p className="feed-error" style={{marginTop:"16px"}}>✗ {feedError}</p>}
                </div>
              ) : (
              <>
              <p className="empty-intro">{MODES[mode].intro}</p>
              {mode === "refine" && (
                <div style={{width:"100%", marginBottom:"16px"}}>
                  <div style={{fontSize:"10px", letterSpacing:"0.08em", textTransform:"uppercase", color:"var(--accent-dim)", marginBottom:"8px"}}>
                    Special instructions (optional)
                  </div>
                  <textarea
                    className="input-textarea"
                    value={refineInstructions}
                    onChange={e => setRefineInstructions(e.target.value)}
                    placeholder="e.g. keep it under 500 words, add subheadings, make it more punchy, write for LinkedIn..."
                    rows={2}
                    style={{width:"100%", background:"var(--surface)", border:"1px solid var(--border)", borderRadius:"3px", padding:"8px 10px", resize:"vertical", fontSize:"13px"}}
                  />
                </div>
              )}
              </>
              )}
              {mode === "chat" && (
                <div className="empty-hints">
                  {[
                    "What's something most people get wrong about marketing?",
                    "Why do you write?",
                    "What's something you believe that most people would disagree with?",
                    "How did an engineer end up in marketing?"
                  ].map((hint, i) => (
                    <button key={i} className="empty-hint" onClick={() => {
                      setInput(hint);
                      textareaRef.current?.focus();
                    }}>
                      {hint}
                    </button>
                  ))}
                </div>
              )}
              {mode === "recommend" && (
                <div className="empty-hints">
                  {[
                    "Something that will make me question my assumptions",
                    "I'm feeling a bit lost ~ what should I read?",
                    "Something about writing and identity",
                    "What's your most contrarian piece?"
                  ].map((hint, i) => (
                    <button key={i} className="empty-hint" onClick={() => {
                      setInput(hint);
                      textareaRef.current?.focus();
                    }}>
                      {hint}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              {messages.map((msg, i) => (
                <div key={i}>
                  <div className="message-group">
                    <div className={`message-label ${msg.role === "assistant" ? "annet" : ""}`}>
                      {msg.role === "assistant" ? "Annet" : "You"}
                    </div>
                    <div
                      className={`message-content ${msg.role === "user" ? "user" : ""}`}
                      dangerouslySetInnerHTML={{
                        __html: formatMessage(msg.content)
                      }}
                    />
                  </div>
                  {i < messages.length - 1 && <div className="divider" />}
                </div>
              ))}

              {loading && (
                <>
                  <div className="divider" />
                  <div className="loading">
                    <ThinkingText />
                  </div>
                </>
              )}
            </>
          )}
          <div ref={bottomRef} />
        </div>
        

        {/* Input */}
        {!((mode === "refine" && !refineUnlocked) || (mode === "professional" && !professionalUnlocked) || mode === "feed") && (
        <div className="input-area">
          {mode === "refine" && messages.length > 0 ? (
            <div className="refine-feedback-wrap">
              <div className="refine-feedback-top">
                <span className="refine-feedback-label">Refine further</span>
                <div className="refine-from-toggle">
                  <span className="refine-from-label">Work from:</span>
                  <button
                    className={`refine-from-btn ${refineFrom === "original" ? "active" : ""}`}
                    onClick={() => setRefineFrom("original")}
                  >Original draft</button>
                  <button
                    className={`refine-from-btn ${refineFrom === "generated" ? "active" : ""}`}
                    onClick={() => setRefineFrom("generated")}
                  >Last output</button>
                </div>
              </div>
              <textarea
                value={refineInstructions}
                onChange={e => setRefineInstructions(e.target.value)}
                placeholder="Special instructions ~ e.g. under 500 words, punchier, add subheadings..."
                rows={1}
                style={{width:"100%", background:"none", border:"none", borderBottom:"1px solid var(--border)", color:"var(--text)", fontFamily:"var(--font-mono)", fontSize:"12px", padding:"6px 0", outline:"none", resize:"none", marginBottom:"8px"}}
              />
              <div className="input-wrap">
                <textarea
                  ref={textareaRef}
                  className="input-textarea"
                  value={input}
                  onChange={e => { setInput(e.target.value); autoResize(); }}
                  onKeyDown={handleKey}
                  placeholder="What needs fixing? e.g. sharper opening, tighten the middle, stronger ending..."
                  rows={1}
                />
                <button
                  className="send-btn"
                  onClick={send}
                  disabled={!input.trim() || loading}
                >
                  Refine
                </button>
              </div>
              <button
                className="refine-reset-btn"
                onClick={() => { setMessages([]); setLastDraft(""); setInput(""); setRefineFrom("original"); }}
              >
                ↺ Start over with a new draft
              </button>
            </div>
          ) : (
          <div className="input-wrap">
            <textarea
              ref={textareaRef}
              className="input-textarea"
              value={input}
              onChange={e => { setInput(e.target.value); autoResize(); }}
              onKeyDown={handleKey}
              placeholder={MODES[mode].placeholder}
              rows={1}
            />
            <button
              className="send-btn"
              onClick={send}
              disabled={!input.trim() || loading}
            >
              Send
            </button>
          </div>
          )}
          {error && <div className="error-msg">Something went wrong ~ {error}</div>}
          <div className="footer-note">
            {mode === "chat" && "Talking to a digital twin of Sooraj Ram ~ "}{" "}
            <a href="https://lifein20s.home.blog" target="_blank" rel="noopener noreferrer" style={{color: "inherit"}}>
              blog
            </a>
            {" · "}
            <a href="https://medium.com/@nytt_liv" target="_blank" rel="noopener noreferrer" style={{color: "inherit"}}>
              medium
            </a>
          </div>
        </div>
        )}
        {showHumorPopup && (
          <div className="humor-overlay" onClick={() => setShowHumorPopup(false)}>
            <div className="humor-card" onClick={e => e.stopPropagation()}>
              <p className="humor-card-title">
                Quick heads up ~ Sooraj has a habit of being funny.
              </p>
              <p className="humor-card-sub">
                Dry, observational, occasionally sarcastic. He's noticed not everyone appreciates that ~ some people come here for serious conversation, and that's completely fine too. So, honestly: do you want the humour?
              </p>
              <div className="humor-btns">
                <button className="humor-btn yes" onClick={() => { setHumorPref("yes"); setShowHumorPopup(false); }}>
                  Yes, bring it
                </button>
                <button className="humor-btn" onClick={() => { setHumorPref("no"); setShowHumorPopup(false); }}>
                  Keep it straight
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// Format message ~ convert URLs to links, preserve line breaks
function formatMessage(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br/>")
    .replace(/^/, "<p>")
    .replace(/$/, "</p>");
}
